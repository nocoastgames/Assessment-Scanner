import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Sparkles, BookOpen, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { TestQuestion, AssessmentType } from '../types';
import { ULS_UNIT1_CHECKPOINT_QUESTIONS, parseRawAssessmentText } from '../lib/assessmentPresets';
import { toast } from 'sonner';

interface AssessmentImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportAssessment: (data: {
    testName: string;
    assessmentType: AssessmentType;
    questions: TestQuestion[];
    enableTwoAttempts?: boolean;
    enableReadQuestionText?: boolean;
  }) => void;
}

export function AssessmentImporter({
  isOpen,
  onClose,
  onImportAssessment
}: AssessmentImporterProps) {
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('pre-test');
  const [rawText, setRawText] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState<TestQuestion[]>([]);

  const handleLoadPreset = (type: 'pre-test' | 'post-test') => {
    const title = type === 'pre-test' 
      ? 'Unique GPS Unit 1 Level 1 Checkpoint - Pre-Test' 
      : 'Unique GPS Unit 1 Level 1 Checkpoint - Post-Test';

    onImportAssessment({
      testName: title,
      assessmentType: type,
      questions: ULS_UNIT1_CHECKPOINT_QUESTIONS,
      enableTwoAttempts: true,
      enableReadQuestionText: true
    });

    toast.success(`Loaded ${title} with ${ULS_UNIT1_CHECKPOINT_QUESTIONS.length} questions!`);
    onClose();
  };

  const handleParseText = () => {
    if (!rawText.trim()) {
      toast.error('Please paste some text first.');
      return;
    }
    const parsed = parseRawAssessmentText(rawText);
    if (parsed.length === 0) {
      toast.error('Could not parse questions from the text. Make sure questions start with "Item 1" or "Question 1".');
      return;
    }
    setPreviewQuestions(parsed);
    toast.success(`Parsed ${parsed.length} questions!`);
  };

  const handleApplyParsed = () => {
    if (previewQuestions.length === 0) return;

    const title = assessmentType === 'pre-test' 
      ? 'Imported Assessment - Pre-Test' 
      : assessmentType === 'post-test' 
        ? 'Imported Assessment - Post-Test' 
        : 'Imported Assessment';

    onImportAssessment({
      testName: title,
      assessmentType: assessmentType,
      questions: previewQuestions,
      enableTwoAttempts: true,
      enableReadQuestionText: true
    });

    toast.success(`Imported ${previewQuestions.length} questions!`);
    onClose();
    setRawText('');
    setPreviewQuestions([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" /> Assessment Importer
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900">
            Import Pre-Test & Post-Test Questions
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Easily load standard Unique Learning System Checkpoints or paste text from PDF/word documents.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="presets" className="font-bold">
                <Sparkles className="w-4 h-4 mr-2" /> ULS Unit Checkpoint Presets
              </TabsTrigger>
              <TabsTrigger value="text-import" className="font-bold">
                <FileText className="w-4 h-4 mr-2" /> Paste & Parse PDF/Doc Text
              </TabsTrigger>
            </TabsList>

            {/* PRESETS TAB */}
            <TabsContent value="presets" className="space-y-6">
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <h4 className="font-bold text-indigo-900 mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Standard High School Unit 1 Level 1 Checkpoints
                </h4>
                <p className="text-xs text-indigo-700/80">
                  Includes all 6 official items with teacher prompts, attempt 2 prompts, and correct answer keys pre-configured.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-2 border-indigo-100 hover:border-indigo-400 transition-all bg-white shadow-sm hover:shadow-md cursor-pointer" onClick={() => handleLoadPreset('pre-test')}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">Pre-Test</span>
                      <span className="text-xs font-mono font-bold text-slate-400">6 Items</span>
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900">Unit 1 Pre-Test</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Initial assessment prior to beginning unit instruction to measure background knowledge.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2">
                    <Button variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl">
                      Load Pre-Test Assessment
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-2 border-indigo-100 hover:border-indigo-400 transition-all bg-white shadow-sm hover:shadow-md cursor-pointer" onClick={() => handleLoadPreset('post-test')}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">Post-Test</span>
                      <span className="text-xs font-mono font-bold text-slate-400">6 Items</span>
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900">Unit 1 Post-Test</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Final assessment administered at the end of unit instruction to evaluate growth.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2">
                    <Button variant="default" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl">
                      Load Post-Test Assessment
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              <div className="p-4 bg-slate-50 border rounded-xl text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-900 block">Pre-loaded Questions Summary:</span>
                <p>• Item 1: "Leo walks to school. Who is Leo?" (A: Leo*)</p>
                <p>• Item 2: "Leo and Gabby walk in the crosswalk. Where do Leo and Gabby walk?" (B: crosswalk*)</p>
                <p>• Item 3: "The cars stop for the school bus. Find the school bus." (C: school bus*)</p>
                <p>• Item 4: "Leo and Gabby will wait for the walk sign to cross the street..." (B: wait*)</p>
                <p>• Item 5: "Keisha has 2 folders. Show me 2 folders." (A: 2 folders*)</p>
                <p>• Item 6: "Randy cleans 4 desks. How many desks does Randy clean?" (C: 4*)</p>
              </div>
            </TabsContent>

            {/* TEXT PARSER TAB */}
            <TabsContent value="text-import" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 bg-slate-50 border rounded-xl">
                <div className="space-y-1">
                  <Label className="font-bold text-slate-900">Assessment Type</Label>
                  <p className="text-xs text-slate-500">Tag this import as a Pre-Test or Post-Test for reporting.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={assessmentType === 'pre-test' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAssessmentType('pre-test')}
                    className={assessmentType === 'pre-test' ? 'bg-emerald-600 text-white font-bold' : ''}
                  >
                    Pre-Test
                  </Button>
                  <Button 
                    variant={assessmentType === 'post-test' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAssessmentType('post-test')}
                    className={assessmentType === 'post-test' ? 'bg-blue-600 text-white font-bold' : ''}
                  >
                    Post-Test
                  </Button>
                  <Button 
                    variant={assessmentType === 'standard' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAssessmentType('standard')}
                    className={assessmentType === 'standard' ? 'bg-slate-900 text-white font-bold' : ''}
                  >
                    Standard
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-bold text-slate-900">Paste Assessment Text</Label>
                  <span className="text-xs text-slate-400">Supports "Item 1", "Question 1", "a. option (correct)", etc.</span>
                </div>
                <textarea 
                  className="w-full h-44 p-3 border rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Item 1\nTeacher Prompt: Leo walks to school. Who is Leo?\nAttempt 2: Who is Leo?\na. Leo (correct)\nb. teachers\nc. Keisha\n\nItem 2\nTeacher Prompt: Where do Leo and Gabby walk?\na. house\nb. crosswalk (correct)\nc. park`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
              </div>

              <Button onClick={handleParseText} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11">
                <RefreshCw className="w-4 h-4 mr-2" /> Parse Questions from Text
              </Button>

              {/* Parsed Preview */}
              {previewQuestions.length > 0 && (
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-bold text-slate-900 text-sm">Parsed Preview ({previewQuestions.length} Questions)</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {previewQuestions.map((q, idx) => (
                      <div key={idx} className="p-3 border rounded-xl bg-slate-50 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Q{idx + 1}: {q.questionText}</span>
                          {q.alternatePrompt && <span className="text-slate-500 italic font-normal">Alt: {q.alternatePrompt}</span>}
                        </div>
                        <div className="flex gap-4 text-slate-600">
                          {q.options.map(opt => (
                            <span key={opt.letter} className={opt.isCorrect ? 'font-bold text-emerald-700 underline' : ''}>
                              {opt.letter}: {opt.text} {opt.isCorrect && '✓'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleApplyParsed} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl shadow-md">
                    Import {previewQuestions.length} Parsed Questions
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="pt-4 border-t flex justify-end">
          <Button variant="ghost" onClick={onClose} className="font-bold">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
