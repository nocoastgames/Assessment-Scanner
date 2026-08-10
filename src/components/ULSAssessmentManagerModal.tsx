import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Search, CheckCircle2, History, ArrowRight, Download, Upload, 
  Trash2, Copy, Sparkles, Filter, FileText, Check, Layers, Image, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TestQuestion, AssessmentType, TestOption } from '../types';
import { 
  ULSAssessment, getULSLibrary, saveULSAssessment, deleteULSAssessment, 
  exportULSLibraryJSON, importULSLibraryJSON 
} from '../lib/ulsLibrary';
import { extractTextFromPDF } from '../lib/pdfTextExtractor';
import { toast } from 'sonner';

export function parseRawAssessmentText(rawText: string): TestQuestion[] {
  if (!rawText.trim()) return [];

  const blocks = rawText.split(/(?=(?:^|\n)(?:Item\s+\d+|Question\s+\d+|\d+\.)\s*[:-]?\s*)/i).filter(b => b.trim().length > 0);
  const parsedQuestions: { questionText: string, options: string[], alternatePrompt?: string }[] = [];
  
  const questionRegex = /^(?:Item\s+\d+|Question\s+\d+|\d+\.)\s*[:-]?\s*/i;
  // Support a., a), a ., etc.
  const optionRegex = /^([a-e])\s*[.)]\s*(.*)/i;

  for (const block of blocks) {
     let originalLines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
     if (originalLines.length === 0) continue;
     
     if (!questionRegex.test(originalLines[0])) continue;
     
     let lines: string[] = [];
     for (let line of originalLines) {
        const matches = Array.from(line.matchAll(/\b([a-e])\s*[.)]\s*/ig));
        if (matches.length > 1 || (matches.length === 1 && !optionRegex.test(line))) {
            let parts = line.split(/\b[a-e]\s*[.)]\s*/ig);
            let letters = matches.map(m => m[1]);
            
            if (parts[0].trim() !== '') {
               lines.push(parts[0].trim());
            }
            
            for (let j = 0; j < letters.length; j++) {
                lines.push(`${letters[j]}. ${parts[j + 1]?.trim() || ''}`);
            }
        } else {
            lines.push(line);
        }
     }
     
     let options = [];
     let aOptionIndex = -1;
     let lastSeenLetterCode = 96;
     
     for (let i = 1; i < lines.length; i++) {
        const optMatch = lines[i].match(optionRegex);
        if (optMatch) {
            if (aOptionIndex === -1) aOptionIndex = i;
            const letterCode = optMatch[1].toLowerCase().charCodeAt(0);
            if (letterCode > lastSeenLetterCode) {
              options.push(lines[i]);
              lastSeenLetterCode = letterCode;
            } else {
              break;
            }
        }
     }
     
     if (options.length > 0) {
        let questionLines = [];
        let firstLineText = lines[0].replace(questionRegex, '').trim();
        if (firstLineText) questionLines.push(firstLineText);
        
        for (let i = 1; i < aOptionIndex; i++) {
          const l = lines[i];
          const lLower = l.toLowerCase();
          if (!lLower.startsWith('attempt') && 
              !lLower.includes('present ') &&
              !lLower.includes('score 0') &&
              !lLower.includes('(if needed)') &&
              !lLower.includes('add verbal')) {
            questionLines.push(l);
          }
        }
        
        let altQuestionLines = [];
        let attempt2Index = lines.findIndex(l => l.toLowerCase().startsWith('attempt 2'));
        if (attempt2Index !== -1) {
            for (let i = attempt2Index + 1; i < lines.length; i++) {
                const l = lines[i];
                const lLower = l.toLowerCase();
                if (!lLower.includes('(if needed)') &&
                    !lLower.includes('present ') &&
                    !lLower.includes('add verbal') &&
                    !lLower.includes('score 0')) {
                    if (optionRegex.test(l) || questionRegex.test(l)) {
                        break;
                    }
                    altQuestionLines.push(l);
                }
            }
        }
        
        parsedQuestions.push({
          questionText: questionLines.join(' ') || 'Question Text',
          alternatePrompt: altQuestionLines.length > 0 ? altQuestionLines.join(' ') : undefined,
          options
        });
     }
  }
  
  const finalQuestions: TestQuestion[] = [];
  
  parsedQuestions.forEach((parsed, idx) => {
    const options: TestOption[] = [];
    const optionLetters = ['A', 'B', 'C', 'D', 'E'];
    
    for (let optText of parsed.options) {
      let isCorrect = false;

      if (optText.toLowerCase().includes('(correct)')) {
        isCorrect = true;
        optText = optText.replace(/\(correct\)/i, '').trim();
      }
      if (optText.includes('*')) {
        isCorrect = true;
        optText = optText.replace(/\*/g, '').trim();
      }

      optText = optText.replace(/^[a-e]\s*[.)]\s*/i, '').trim();

      if (optText) {
        options.push({
          letter: optionLetters[options.length] || '?',
          text: optText,
          image: null,
          isCorrect,
          isActive: true
        });
      }
    }

    if (options.length > 0) {
      if (!options.some(o => o.isCorrect)) {
        options[0].isCorrect = true;
      }
      finalQuestions.push({
        id: `parsed-q-${Date.now()}-${idx}`,
        questionText: parsed.questionText || 'Empty Question',
        alternatePrompt: parsed.alternatePrompt || parsed.questionText || 'Empty Question',
        options
      });
    }
  });

  return finalQuestions;
}

interface ULSAssessmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadAssessment: (assessment: {
    testName: string;
    assessmentType: AssessmentType;
    questions: TestQuestion[];
  }) => void;
}

export function ULSAssessmentManagerModal({
  isOpen,
  onClose,
  onLoadAssessment
}: ULSAssessmentManagerModalProps) {
  const [library, setLibrary] = useState<ULSAssessment[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'create' | 'backup'>('library');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeBand, setSelectedGradeBand] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const [editingId, setEditingId] = useState<string | null>(null);

  // Create/Import state
  const [newTitle, setNewTitle] = useState('');
  const [newGradeBand, setNewGradeBand] = useState<'Elementary' | 'Intermediate' | 'Middle School' | 'High School'>('High School');
  const [newUnit, setNewUnit] = useState<number>(1);
  const [newLevel, setNewLevel] = useState<1 | 2 | 3>(1);
  const [newType, setNewType] = useState<AssessmentType>('pre-test');
  const [newDescription, setNewDescription] = useState('');
  const [rawQuestionsText, setRawText] = useState('');
  const [parsedPreviewQuestions, setPreviewQuestions] = useState<TestQuestion[]>([]);
  const [setupPhase, setSetupPhase] = useState<'input' | 'preview'>('input');

  // Refresh library when modal opens
  useEffect(() => {
    if (isOpen) {
      setLibrary(getULSLibrary());
    }
  }, [isOpen]);

  // Filter library
  const filteredLibrary = library.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = selectedGradeBand === 'all' || item.gradeBand === selectedGradeBand;
    const matchesType = selectedType === 'all' || item.assessmentType === selectedType;
    return matchesSearch && matchesGrade && matchesType;
  });

  const handleLoad = (item: ULSAssessment) => {
    onLoadAssessment({
      testName: item.title,
      assessmentType: item.assessmentType,
      questions: item.questions
    });
    toast.success(`Loaded "${item.title}" into Miller Scanner Test Builder!`);
    onClose();
  };

  const handleEdit = (item: ULSAssessment) => {
    setEditingId(item.id);
    setNewTitle(item.title);
    setNewGradeBand(item.gradeBand);
    setNewUnit(item.unitNumber);
    setNewLevel(item.level);
    setNewType(item.assessmentType);
    setNewDescription(item.description);
    setPreviewQuestions(JSON.parse(JSON.stringify(item.questions)));
    setSetupPhase('preview');
    setActiveTab('create');
  };

  const handleDelete = (id: string, title: string) => {
    const updated = deleteULSAssessment(id);
    setLibrary(updated);
    toast.success(`Deleted custom assessment "${title}" from history.`);
  };

  const handleDuplicateToPostTest = (item: ULSAssessment) => {
    const isPre = item.assessmentType === 'pre-test';
    const targetType: AssessmentType = isPre ? 'post-test' : 'pre-test';
    const targetTitle = item.title
      .replace(/Pre-Test/i, 'Post-Test')
      .replace(/Post-Test/i, 'Pre-Test');

    const newAssessment: ULSAssessment = {
      id: `uls-dup-${Date.now()}`,
      title: targetTitle !== item.title ? targetTitle : `${item.title} (${targetType.toUpperCase()})`,
      gradeBand: item.gradeBand,
      unitNumber: item.unitNumber,
      level: item.level,
      assessmentType: targetType,
      description: `Paired ${targetType} created from ${item.title}`,
      questions: JSON.parse(JSON.stringify(item.questions)),
      createdAt: new Date().toISOString().slice(0, 10),
      isBuiltIn: false
    };

    const updated = saveULSAssessment(newAssessment);
    setLibrary(updated);
    toast.success(`Created paired ${targetType.toUpperCase()}: "${newAssessment.title}" in history!`);
  };

  const handleParseText = () => {
    if (!rawQuestionsText.trim()) {
      toast.error('Please paste or type question text first.');
      return;
    }
    
    // Attempt to parse metadata for auto-filling from the first line
    const lines = rawQuestionsText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // If it looks like a title, use it
      if (firstLine.length > 3 && firstLine.length < 150 && !firstLine.match(/^(Item \d+|Question \d+|\d+\.)/i)) {
        setNewTitle(firstLine);
        
        // Try to guess grade band
        if (firstLine.match(/High School/i)) setNewGradeBand('High School');
        else if (firstLine.match(/Middle School/i)) setNewGradeBand('Middle School');
        else if (firstLine.match(/Intermediate/i)) setNewGradeBand('Intermediate');
        else if (firstLine.match(/Elementary/i)) setNewGradeBand('Elementary');
        
        // Try to guess unit
        const unitMatch = firstLine.match(/Unit\s+(\d+)/i);
        if (unitMatch) setNewUnit(parseInt(unitMatch[1], 10));
        
        // Try to guess level
        const levelMatch = firstLine.match(/Level\s+([1-3])/i);
        if (levelMatch) setNewLevel(parseInt(levelMatch[1], 10) as any);
        
        // Try to guess type
        if (firstLine.match(/Pre-Test/i)) setNewType('pre-test');
        else if (firstLine.match(/Post-Test/i)) setNewType('post-test');
      }
    }

    const parsed = parseRawAssessmentText(rawQuestionsText);
    setPreviewQuestions(parsed);
    if (parsed.length > 0) {
      toast.success(`Parsed ${parsed.length} questions from text!`);
      setSetupPhase('preview');
    } else {
      toast.warning('No questions recognized. Ensure lines start with "Item 1:", "Question 1:", or "1."');
    }
  };

  const handleSaveNewAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTitle.trim()) {
      toast.error('Please enter a title for the assessment.');
      return;
    }

    if (parsedPreviewQuestions.length === 0) {
      toast.error('Please add or parse at least one question before saving.');
      return;
    }

    const isExistingBuiltIn = editingId && library.find(a => a.id === editingId)?.isBuiltIn;
    const finalId = editingId && !isExistingBuiltIn ? editingId : `uls-custom-${Date.now()}`;

    const newAssessment: ULSAssessment = {
      id: finalId,
      title: newTitle.trim(),
      gradeBand: newGradeBand,
      unitNumber: newUnit,
      level: newLevel,
      assessmentType: newType,
      description: newDescription.trim() || `ULS ${newGradeBand} Unit ${newUnit} Level ${newLevel} ${newType}`,
      questions: parsedPreviewQuestions,
      createdAt: new Date().toISOString().slice(0, 10),
      isBuiltIn: false
    };

    const updated = saveULSAssessment(newAssessment);
    setLibrary(updated);
    toast.success(`Saved "${newTitle}" to ULS Assessment History Library!`);

    // Reset form
    setEditingId(null);
    setNewTitle('');
    setNewDescription('');
    setRawText('');
    setPreviewQuestions([]);
    setSetupPhase('input');
    setActiveTab('library');
  };

  const handleFileUploadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const updated = importULSLibraryJSON(content);
        setLibrary(updated);
        toast.success('Successfully imported ULS Assessment History from JSON file!');
      } catch (err) {
        toast.error('Failed to import JSON file. Check file structure.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-2xl">
        <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  ULS Assessment History & Library
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 text-xs border border-indigo-500/30 font-bold">
                    Code & Local Saved
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Import, create, and manage Unique Learning System (ULS) Pre-Test and Post-Test checkpoints.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 space-y-4 bg-slate-50/50">
          <Tabs value={activeTab} onValueChange={(val: any) => { 
            setActiveTab(val); 
            setSetupPhase('input'); 
            if (val !== 'create') {
              setEditingId(null);
              setNewTitle('');
              setNewDescription('');
              setRawText('');
              setPreviewQuestions([]);
            }
          }} className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-slate-200/80 p-1 rounded-2xl flex flex-wrap h-auto shrink-0 gap-1">
              <TabsTrigger value="library" className="flex-1 min-w-[120px] rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs whitespace-nowrap py-2 px-3">
                <History className="w-4 h-4 mr-1.5 shrink-0" /> History ({library.length})
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1 min-w-[120px] rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs whitespace-nowrap py-2 px-3">
                {editingId ? (
                  <><Pencil className="w-4 h-4 mr-1.5 shrink-0" /> Edit Assessment</>
                ) : (
                  <><Plus className="w-4 h-4 mr-1.5 shrink-0" /> Add / Import</>
                )}
              </TabsTrigger>
              <TabsTrigger value="backup" className="flex-1 min-w-[120px] rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs whitespace-nowrap py-2 px-3">
                <Download className="w-4 h-4 mr-1.5 shrink-0" /> Backup & Sync
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: LIBRARY & HISTORY */}
            <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden space-y-4 pt-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0 bg-white p-3 rounded-2xl border shadow-xs">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input 
                    type="text" 
                    placeholder="Search ULS assessments..." 
                    className="pl-9 h-10 rounded-xl text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <select 
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 text-xs px-3 font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                    value={selectedGradeBand}
                    onChange={(e) => setSelectedGradeBand(e.target.value)}
                  >
                    <option value="all">All Grade Bands</option>
                    <option value="High School">High School</option>
                    <option value="Middle School">Middle School</option>
                    <option value="Elementary">Elementary</option>
                  </select>

                  <select 
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 text-xs px-3 font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="pre-test">Pre-Test Only</option>
                    <option value="post-test">Post-Test Only</option>
                  </select>
                </div>
              </div>

              {/* Assessment List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {filteredLibrary.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed p-6 text-slate-500">
                    <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No assessments match your filter.</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing search or click "Add / Import Questions" to create one.</p>
                  </div>
                ) : (
                  filteredLibrary.map((item) => {
                    const isPre = item.assessmentType === 'pre-test';
                    return (
                      <Card key={item.id} className="hover:shadow-md transition-all border border-slate-200 rounded-2xl bg-white overflow-hidden">
                        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full ${
                                isPre ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                              }`}>
                                {item.assessmentType}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-600 border border-slate-300">
                                {item.gradeBand} • Unit {item.unitNumber} • Level {item.level}
                              </span>
                              {item.isBuiltIn && (
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                  Standard ULS Preset
                                </span>
                              )}
                            </div>

                            <h3 className="font-black text-slate-900 text-base sm:text-lg leading-snug">
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {item.description}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {item.questions.length} questions included • Saved: {item.createdAt}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:self-center">
                            <Button
                              onClick={() => handleLoad(item)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-xs"
                            >
                              Load Into Scanner <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>

                            <Button
                              onClick={() => handleEdit(item)}
                              variant="outline"
                              size="sm"
                              className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs h-10 rounded-xl px-3"
                              title="Edit Assessment"
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1.5" />
                              <span className="hidden md:inline">Edit</span>
                            </Button>

                            <Button
                              onClick={() => handleDuplicateToPostTest(item)}
                              variant="outline"
                              size="sm"
                              className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs h-10 rounded-xl"
                              title={isPre ? "Create Paired Post-Test" : "Create Paired Pre-Test"}
                            >
                              <Copy className="w-3.5 h-3.5 mr-1" />
                              <span className="hidden md:inline">{isPre ? '+ Post-Test' : '+ Pre-Test'}</span>
                            </Button>

                            {!item.isBuiltIn && (
                              <Button
                                onClick={() => handleDelete(item.id, item.title)}
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-10 w-10 p-0 rounded-xl"
                                title="Delete Custom Assessment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* TAB 2: ADD / IMPORT PRE-TEST & POST-TEST */}
            <TabsContent value="create" className="flex-1 flex flex-col overflow-y-auto space-y-4 pt-4 pr-1">
              {setupPhase === 'input' ? (
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs text-indigo-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" /> Assessment Builder
                    </p>
                    <p className="text-indigo-700">
                      Extract questions from a PDF or paste text to generate a new assessment.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <Label className="font-bold text-xs text-slate-700">Type</Label>
                      <select
                        className="w-full mt-1.5 h-10 rounded-xl border border-slate-200 bg-white text-xs px-3 font-bold focus:ring-2 focus:ring-indigo-500"
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as AssessmentType)}
                      >
                        <option value="pre-test">Pre-Test</option>
                        <option value="post-test">Post-Test</option>
                        <option value="standard">Standard Practice</option>
                      </select>
                    </div>

                    <div>
                      <Label className="font-bold text-xs text-slate-700">Grade Band</Label>
                      <select
                        className="w-full mt-1.5 h-10 rounded-xl border border-slate-200 bg-white text-xs px-3 font-bold focus:ring-2 focus:ring-indigo-500"
                        value={newGradeBand}
                        onChange={(e) => setNewGradeBand(e.target.value as any)}
                      >
                        <option value="High School">High School</option>
                        <option value="Middle School">Middle School</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Elementary">Elementary</option>
                      </select>
                    </div>

                    <div>
                      <Label className="font-bold text-xs text-slate-700">Unit No.</Label>
                      <Input 
                        type="number" 
                        min={1} 
                        max={30} 
                        className="mt-1.5 h-10 rounded-xl text-xs font-bold" 
                        value={newUnit}
                        onChange={(e) => setNewUnit(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>

                    <div>
                      <Label className="font-bold text-xs text-slate-700">Level</Label>
                      <select
                        className="w-full mt-1.5 h-10 rounded-xl border border-slate-200 bg-white text-xs px-3 font-bold focus:ring-2 focus:ring-indigo-500"
                        value={newLevel}
                        onChange={(e) => setNewLevel(parseInt(e.target.value, 10) as any)}
                      >
                        <option value={1}>Level 1 (Pics/Text)</option>
                        <option value={2}>Level 2 (Diff)</option>
                        <option value={3}>Level 3 (Standard)</option>
                      </select>
                    </div>
                  </div>

                  {/* Paste / Add Question Text */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <Label className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" /> Assessment Question Text
                      </Label>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[10px] text-slate-500 hidden md:inline max-w-[200px] truncate">
                          "Item 1: Prompt...", "A. Option A"
                        </span>
                        <div className="relative shrink-0">
                          <input 
                            type="file" 
                            accept=".pdf,application/pdf" 
                            className="hidden" 
                            id="uls-pdf-file-input"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                toast.info('Extracting text from PDF...');
                                const text = await extractTextFromPDF(file);
                                setRawText(prev => prev ? prev + '\n\n' + text : text);
                                toast.success('Extracted text from PDF!');
                              } catch (err) {
                                console.error(err);
                                toast.error('Failed to extract text from PDF');
                              }
                              // Reset input
                              e.target.value = '';
                            }}
                          />
                          <label htmlFor="uls-pdf-file-input" className="cursor-pointer">
                            <div className="flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs h-8 px-3 shadow-xs transition-colors">
                              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload PDF Text
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <textarea 
                      className="w-full h-48 p-3 border rounded-2xl text-xs font-mono bg-white focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Item 1: Leo walks to school. Who is Leo?\na. Leo (correct)\nb. teachers\nc. Keisha\n\nItem 2: Leo and Gabby walk in the crosswalk. Where do Leo and Gabby walk?\na. house\nb. crosswalk (correct)\nc. park`}
                      value={rawQuestionsText}
                      onChange={(e) => setRawText(e.target.value)}
                    />

                    <Button 
                      type="button" 
                      onClick={handleParseText}
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" /> Parse Questions & Continue
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveNewAssessment} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSetupPhase('input')}
                      className="text-slate-500 hover:text-slate-800 text-xs font-bold -ml-2"
                    >
                      ← Back to Input
                    </Button>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {parsedPreviewQuestions.length} Questions
                    </span>
                  </div>

                  <div>
                    <Label className="font-bold text-xs text-slate-700">Assessment Title</Label>
                    <Input 
                      type="text" 
                      placeholder={`e.g., ${newGradeBand} Unit ${newUnit} Level ${newLevel} Checkpoint - ${newType === 'pre-test' ? 'Pre-Test' : 'Post-Test'}`}
                      className="mt-1.5 h-10 rounded-xl font-bold"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-xs text-slate-700">Description (Optional)</Label>
                    <Input 
                      type="text" 
                      placeholder="e.g., ULS Unit Checkpoint assessment for tracking baseline and growth"
                      className="mt-1.5 h-10 rounded-xl text-xs"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-indigo-600" /> Verify Questions & Add Images
                      </Label>
                      <div className="relative shrink-0">
                        <input 
                          type="file" 
                          accept="image/*"
                          multiple
                          className="hidden" 
                          id="bulk-image-upload"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []) as File[];
                            if (!files.length) return;
                            
                            const newQs = [...parsedPreviewQuestions];
                            let matched = 0;
                            
                            for (const file of files) {
                              const match = file.name.match(/(\d+)[._-](\d+)/);
                              if (match) {
                                const qIdx = parseInt(match[1], 10) - 1;
                                const oIdx = parseInt(match[2], 10) - 1;
                                
                                if (newQs[qIdx] && newQs[qIdx].options[oIdx]) {
                                  const base64 = await new Promise<string>((resolve) => {
                                    const reader = new FileReader();
                                    reader.onload = (e) => resolve(e.target?.result as string);
                                    reader.readAsDataURL(file);
                                  });
                                  newQs[qIdx].options[oIdx].image = base64;
                                  matched++;
                                }
                              }
                            }
                            
                            if (matched > 0) {
                              setPreviewQuestions(newQs);
                              toast.success(`Bulk uploaded ${matched} images!`);
                            } else {
                              toast.error('No matching filenames found (use format 1.1.png, 1.2.jpg, etc.)');
                            }
                            e.target.value = '';
                          }}
                        />
                        <label htmlFor="bulk-image-upload" className="cursor-pointer">
                          <div className="flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs h-8 px-3 shadow-xs transition-colors">
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> Bulk Upload (1.1, 1.2)
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {parsedPreviewQuestions.map((q, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-2xl text-xs space-y-3 shadow-xs">
                          <div className="flex flex-col gap-1.5">
                            <Label className="font-bold text-slate-700">Question {idx + 1}</Label>
                            <Input
                              value={q.questionText}
                              onChange={(e) => {
                                const newQs = [...parsedPreviewQuestions];
                                newQs[idx].questionText = e.target.value;
                                setPreviewQuestions(newQs);
                              }}
                              className="h-9 rounded-lg"
                            />
                          </div>
                          <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                            {q.options.map((o, oIdx) => (
                              <div key={oIdx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                <div className="flex items-center gap-2 min-w-[140px]">
                                  <input 
                                    type="radio"
                                    checked={o.isCorrect}
                                    onChange={() => {
                                      const newQs = [...parsedPreviewQuestions];
                                      newQs[idx].options.forEach(opt => opt.isCorrect = false);
                                      newQs[idx].options[oIdx].isCorrect = true;
                                      setPreviewQuestions(newQs);
                                    }}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                  />
                                  <span className="font-bold text-slate-700 w-5">{o.letter}.</span>
                                  <Input
                                    value={o.text}
                                    onChange={(e) => {
                                      const newQs = [...parsedPreviewQuestions];
                                      newQs[idx].options[oIdx].text = e.target.value;
                                      setPreviewQuestions(newQs);
                                    }}
                                    className="h-8 rounded-lg flex-1 text-xs"
                                  />
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {o.image ? (
                                    <div className="flex items-center gap-2">
                                      <img src={o.image} alt="Option preview" className="w-8 h-8 rounded-md object-cover border" />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                          const newQs = [...parsedPreviewQuestions];
                                          newQs[idx].options[oIdx].image = null;
                                          setPreviewQuestions(newQs);
                                        }}
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        className="hidden" 
                                        id={`img-upload-${idx}-${oIdx}`}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            const base64 = event.target?.result as string;
                                            const newQs = [...parsedPreviewQuestions];
                                            newQs[idx].options[oIdx].image = base64;
                                            setPreviewQuestions(newQs);
                                          };
                                          reader.readAsDataURL(file);
                                          e.target.value = '';
                                        }}
                                      />
                                      <label htmlFor={`img-upload-${idx}-${oIdx}`} className="cursor-pointer">
                                        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[10px] h-8 px-2.5 transition-colors">
                                          <Image className="w-3.5 h-3.5 mr-1" /> Add Image
                                        </div>
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    {editingId && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setNewTitle('');
                          setNewDescription('');
                          setRawText('');
                          setPreviewQuestions([]);
                          setSetupPhase('input');
                          setActiveTab('library');
                        }}
                        className="w-full sm:w-auto text-slate-700 font-bold h-12 rounded-xl text-sm"
                      >
                        Cancel Edit
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      className={`w-full text-white font-bold h-12 rounded-xl shadow-md text-sm ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                      {editingId ? 'Update Assessment in Library' : 'Save to ULS Assessment Library & History'}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* TAB 3: BACKUP & SYNC */}
            <TabsContent value="backup" className="flex-1 flex flex-col overflow-y-auto space-y-4 pt-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border border-slate-200 rounded-2xl bg-white p-5 space-y-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">Export Library Backup</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Download a JSON file containing all saved ULS Pre-Test and Post-Test assessments for safe backup or sharing with colleagues.
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    onClick={exportULSLibraryJSON}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 rounded-xl"
                  >
                    Download JSON Backup
                  </Button>
                </Card>

                <Card className="border border-slate-200 rounded-2xl bg-white p-5 space-y-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">Import Library JSON</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload a previously exported ULS assessment JSON file to restore or add assessments to your local library.
                    </p>
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".json,application/json" 
                      onChange={handleFileUploadJSON}
                      className="hidden" 
                      id="uls-json-file-input"
                    />
                    <label htmlFor="uls-json-file-input" className="cursor-pointer">
                      <div className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs h-10">
                        Choose JSON File
                      </div>
                    </label>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-4 bg-slate-100 border-t shrink-0 flex justify-between items-center">
          <p className="text-xs text-slate-500 font-mono">
            {library.length} assessments stored in local code history
          </p>
          <Button variant="outline" onClick={onClose} className="font-bold text-xs rounded-xl">
            Close Tool
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
