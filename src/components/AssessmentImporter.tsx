import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Sparkles, BookOpen, Layers, RefreshCw, FileUp, Loader2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { TestQuestion, AssessmentType } from '../types';
import { ULS_UNIT1_CHECKPOINT_QUESTIONS, parseRawAssessmentText } from '../lib/assessmentPresets';
import { extractPDFContent } from '../lib/pdfExtractor';
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
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

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

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a valid PDF file (.pdf)');
      return;
    }

    setIsPdfProcessing(true);
    setPdfFileName(file.name);

    try {
      const pdfData = await extractPDFContent(file);
      setRawText(pdfData.text);

      const parsed = parseRawAssessmentText(pdfData.text);

      // Attach extracted visual image crops from PDF if matching item numbers exist
      if (pdfData.extractedImages.length > 0) {
        pdfData.extractedImages.forEach(img => {
          if (img.itemNumber && img.optionLetter) {
            const qIndex = img.itemNumber - 1;
            if (qIndex >= 0 && qIndex < parsed.length) {
              const optIndex = ['A', 'B', 'C'].indexOf(img.optionLetter);
              if (optIndex >= 0 && optIndex < parsed[qIndex].options.length) {
                parsed[qIndex].options[optIndex].image = img.dataUrl;
              }
            }
          }
        });
      }

      setPreviewQuestions(parsed);

      if (parsed.length > 0) {
        toast.success(`Extracted ${parsed.length} questions and ${pdfData.extractedImages.length} option images from PDF!`);
      } else {
        toast.info('Extracted PDF text. Review text below or adjust formatting.');
      }
    } catch (err) {
      console.error('PDF parsing error:', err);
      toast.error('Failed to parse PDF file. Ensure it is a valid document.');
    } finally {
      setIsPdfProcessing(false);
    }
  };

  const handleParseText = () => {
    if (!rawText.trim()) {
      toast.error('Please paste some text or upload a PDF first.');
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

    const baseTitle = pdfFileName ? pdfFileName.replace(/\.pdf$/i, '') : 'Imported Assessment';
    const title = assessmentType === 'pre-test' 
      ? `${baseTitle} - Pre-Test` 
      : assessmentType === 'post-test' 
        ? `${baseTitle} - Post-Test` 
        : baseTitle;

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
    setPdfFileName(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-3 border-b shrink-0">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" /> Assessment Importer
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            Import Pre-Test & Post-Test Questions
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-500">
            Upload PDF checkpoint documents, load standard Unique Learning System presets, or paste raw text.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-0.5">
          <Tabs defaultValue="pdf-import" className="w-full">
            <TabsList className="flex flex-col sm:flex-row gap-1.5 p-1.5 bg-slate-100 rounded-xl w-full mb-6 h-auto">
              <TabsTrigger 
                value="pdf-import" 
                className="flex-1 h-10 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs transition-all"
              >
                <FileUp className="w-4 h-4 shrink-0" /> Upload PDF Document
              </TabsTrigger>
              <TabsTrigger 
                value="presets" 
                className="flex-1 h-10 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs transition-all"
              >
                <Sparkles className="w-4 h-4 shrink-0" /> ULS Presets
              </TabsTrigger>
              <TabsTrigger 
                value="text-import" 
                className="flex-1 h-10 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs transition-all"
              >
                <FileText className="w-4 h-4 shrink-0" /> Paste Text
              </TabsTrigger>
            </TabsList>

            {/* PDF UPLOAD TAB */}
            <TabsContent value="pdf-import" className="space-y-5 mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border rounded-xl">
                <div className="space-y-0.5">
                  <Label className="font-bold text-slate-900 text-sm">Assessment Type Tag</Label>
                  <p className="text-xs text-slate-500">Tag this PDF assessment as a Pre-Test or Post-Test.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button"
                    variant={assessmentType === 'pre-test' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAssessmentType('pre-test')}
                    className={assessmentType === 'pre-test' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs' : 'text-xs'}
                  >
                    Pre-Test
                  </Button>
                  <Button 
                    type="button"
                    variant={assessmentType === 'post-test' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAssessmentType('post-test')}
                    className={assessmentType === 'post-test' ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs' : 'text-xs'}
                  >
                    Post-Test
                  </Button>
                  <Button 
                    type="button"
                    variant={assessmentType === 'standard' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setAssessmentType('standard')}
                    className={assessmentType === 'standard' ? 'bg-slate-900 text-white font-bold text-xs' : 'text-xs'}
                  >
                    Standard
                  </Button>
                </div>
              </div>

              {/* Drag and Drop PDF Box */}
              <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50/80 rounded-2xl p-6 sm:p-8 text-center transition-colors relative">
                <input 
                  type="file" 
                  accept=".pdf,application/pdf" 
                  id="pdf-assessment-file-input" 
                  className="hidden" 
                  onChange={handlePDFUpload}
                  disabled={isPdfProcessing}
                />
                <label htmlFor="pdf-assessment-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200">
                    {isPdfProcessing ? <Loader2 className="w-7 h-7 animate-spin" /> : <FileUp className="w-7 h-7" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-base sm:text-lg">
                      {isPdfProcessing ? 'Extracting PDF Questions & Option Images...' : 'Click or Drag & Drop Assessment PDF'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {pdfFileName ? `Current file: ${pdfFileName}` : 'Supports Unique Learning System (ULS) Checkpoint PDFs. Extracts questions, prompts, and option images!'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Preview Parsed Items */}
              {previewQuestions.length > 0 && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Extracted Assessment Questions ({previewQuestions.length} Items)
                    </h4>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                      Ready to Import
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                    {previewQuestions.map((q, idx) => (
                      <div key={idx} className="p-3 border rounded-xl bg-slate-50 text-xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-bold text-slate-900">
                          <span>Item {idx + 1}: {q.questionText}</span>
                          {q.alternatePrompt && <span className="text-indigo-600 italic font-medium">Alt: {q.alternatePrompt}</span>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          {q.options.map(opt => (
                            <div key={opt.letter} className={`p-2 border rounded-lg bg-white flex items-center gap-2 ${opt.isCorrect ? 'border-emerald-400 bg-emerald-50/50' : ''}`}>
                              {opt.image ? (
                                <img src={opt.image} alt={opt.letter} className="w-8 h-8 object-contain rounded border shrink-0 bg-slate-100" />
                              ) : (
                                <div className="w-8 h-8 bg-slate-100 text-slate-600 font-bold rounded flex items-center justify-center shrink-0">{opt.letter}</div>
                              )}
                              <div className="truncate">
                                <span className={`font-bold block truncate ${opt.isCorrect ? 'text-emerald-700' : 'text-slate-700'}`}>
                                  {opt.letter}: {opt.text || '(Image)'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleApplyParsed} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl shadow-md text-sm">
                    Import {previewQuestions.length} PDF Questions into Test Builder
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* PRESETS TAB */}
            <TabsContent value="presets" className="space-y-5 mt-0">
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <h4 className="font-bold text-indigo-900 mb-1 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /> Standard High School Unit 1 Level 1 Checkpoints
                </h4>
                <p className="text-xs text-indigo-700/80">
                  Includes all 6 official items with teacher prompts, attempt 2 prompts, and correct answer keys pre-configured.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-2 border-indigo-100 hover:border-indigo-400 transition-all bg-white shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden" onClick={() => handleLoadPreset('pre-test')}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">Pre-Test</span>
                      <span className="text-xs font-mono font-bold text-slate-400">6 Items</span>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900">Unit 1 Pre-Test</CardTitle>
                    <CardDescription className="text-xs text-slate-500 leading-relaxed">
                      Initial assessment prior to unit instruction to measure background knowledge.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="p-4 pt-2">
                    <Button variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl h-auto py-2.5 px-3 whitespace-normal shadow-xs">
                      Load Pre-Test Assessment
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-2 border-indigo-100 hover:border-indigo-400 transition-all bg-white shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden" onClick={() => handleLoadPreset('post-test')}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">Post-Test</span>
                      <span className="text-xs font-mono font-bold text-slate-400">6 Items</span>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900">Unit 1 Post-Test</CardTitle>
                    <CardDescription className="text-xs text-slate-500 leading-relaxed">
                      Final assessment administered at the end of unit instruction to evaluate growth.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="p-4 pt-2">
                    <Button variant="default" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl h-auto py-2.5 px-3 whitespace-normal shadow-xs">
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
            <TabsContent value="text-import" className="space-y-4 mt-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-bold text-slate-900 text-sm">Paste Assessment Text</Label>
                  <span className="text-xs text-slate-400">Supports "Item 1", "Question 1", "a. option (correct)", etc.</span>
                </div>
                <textarea 
                  className="w-full h-44 p-3 border rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Item 1\nTeacher Prompt: Leo walks to school. Who is Leo?\nAttempt 2: Who is Leo?\na. Leo (correct)\nb. teachers\nc. Keisha\n\nItem 2\nTeacher Prompt: Where do Leo and Gabby walk?\na. house\nb. crosswalk (correct)\nc. park`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
              </div>

              <Button onClick={handleParseText} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" /> Parse Questions from Text
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="pt-3 border-t shrink-0 flex justify-end">
          <Button variant="ghost" onClick={onClose} className="font-bold">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
