import React, { useState } from 'react';
import { Upload, ImagePlus, Check, AlertCircle, Trash2, X, Sparkles, HelpCircle, FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TestQuestion, TestOption } from '../types';
import { extractPDFContent } from '../lib/pdfExtractor';
import { toast } from 'sonner';

interface ParsedImageFile {
  id: string;
  file: File;
  dataUrl: string;
  fileName: string;
  questionNum: number | null; // 1-indexed
  optionLetter: string | null; // 'A', 'B', 'C'
  isMatched: boolean;
}

interface BatchImageUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  existingQuestions: TestQuestion[];
  onApplyImages: (updatedQuestions: TestQuestion[]) => void;
}

export function parseFilenameToQuestionOption(fileName: string): { questionNum: number | null; optionLetter: string | null } {
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '').trim();

  // Pattern matches:
  // 1. "1.1", "1.2", "1.3"
  // 2. "1_1", "1-1", "1 1"
  // 3. "1A", "1_A", "1-A", "1a"
  // 4. "Q1_1", "Q1_A", "Question1_1", "Item1_1", "Item 1_1", "Item 1.1"

  // First check prefix patterns like Item 1_2 or Q1_2 or Question 1_A
  const prefixMatch = nameWithoutExt.match(/(?:item|question|q)?\s*0*(\d+)[\._\-\s]*([1-3]|a|b|c)/i);
  if (prefixMatch) {
    const qNum = parseInt(prefixMatch[1], 10);
    const optRaw = prefixMatch[2].toUpperCase();
    let letter = optRaw;
    if (optRaw === '1') letter = 'A';
    if (optRaw === '2') letter = 'B';
    if (optRaw === '3') letter = 'C';
    return { questionNum: qNum, optionLetter: letter };
  }

  // Fallback check for "1.2", "1_2", "1-2"
  const simpleMatch = nameWithoutExt.match(/^0*(\d+)[\._\-\s]*0*([1-3]|a|b|c)$/i);
  if (simpleMatch) {
    const qNum = parseInt(simpleMatch[1], 10);
    const optRaw = simpleMatch[2].toUpperCase();
    let letter = optRaw;
    if (optRaw === '1') letter = 'A';
    if (optRaw === '2') letter = 'B';
    if (optRaw === '3') letter = 'C';
    return { questionNum: qNum, optionLetter: letter };
  }

  return { questionNum: null, optionLetter: null };
}

export function BatchImageUploader({
  isOpen,
  onClose,
  existingQuestions,
  onApplyImages
}: BatchImageUploaderProps) {
  const [parsedFiles, setParsedFiles] = useState<ParsedImageFile[]>([]);
  const [autoCreateQuestions, setAutoCreateQuestions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);

    setIsLoading(true);
    const newParsed: ParsedImageFile[] = [];

    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfResult = await extractPDFContent(file);
          if (pdfResult.extractedImages.length > 0) {
            pdfResult.extractedImages.forEach((img, idx) => {
              const qNum = img.itemNumber || null;
              const opt = img.optionLetter || null;
              newParsed.push({
                id: `pdf-img-${Date.now()}-${idx}`,
                file,
                dataUrl: img.dataUrl,
                fileName: `${file.name} (Q${qNum || '?'}_${opt || '?'})`,
                questionNum: qNum,
                optionLetter: opt,
                isMatched: qNum !== null && opt !== null
              });
            });
            toast.success(`Extracted ${pdfResult.extractedImages.length} option image cards from PDF!`);
          } else {
            toast.info('No visual item choice cards detected in PDF.');
          }
        } catch (err) {
          console.error('PDF extraction failed:', err);
          toast.error(`Failed to process PDF: ${file.name}`);
        }
        continue;
      }

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { questionNum, optionLetter } = parseFilenameToQuestionOption(file.name);
      const isMatched = questionNum !== null && optionLetter !== null;

      newParsed.push({
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        dataUrl,
        fileName: file.name,
        questionNum,
        optionLetter,
        isMatched
      });
    }

    setParsedFiles(prev => [...prev, ...newParsed]);
    setIsLoading(false);
  };

  const handleUpdateMapping = (id: string, questionNum: number | null, optionLetter: string | null) => {
    setParsedFiles(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          questionNum,
          optionLetter,
          isMatched: questionNum !== null && optionLetter !== null
        };
      }
      return item;
    }));
  };

  const handleRemoveFile = (id: string) => {
    setParsedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleApply = () => {
    const validMatches = parsedFiles.filter(f => f.questionNum !== null && f.optionLetter !== null);
    if (validMatches.length === 0) {
      toast.error('No matched images to apply. Please upload image files named like 1.1, 1.2, 2.1, etc.');
      return;
    }

    // Determine max question number needed
    const maxQNum = Math.max(
      existingQuestions.length,
      ...validMatches.map(f => f.questionNum || 1)
    );

    // Deep copy existing questions
    const updatedQuestions: TestQuestion[] = JSON.parse(JSON.stringify(existingQuestions));

    // Auto-create missing question slots if autoCreateQuestions is enabled
    if (autoCreateQuestions) {
      while (updatedQuestions.length < maxQNum) {
        const nextIndex = updatedQuestions.length + 1;
        updatedQuestions.push({
          id: `q-${Date.now()}-${nextIndex}`,
          questionText: `Question ${nextIndex}`,
          alternatePrompt: '',
          options: [
            { letter: 'A', text: '', image: null, isCorrect: true, isActive: true },
            { letter: 'B', text: '', image: null, isCorrect: false, isActive: true },
            { letter: 'C', text: '', image: null, isCorrect: false, isActive: true }
          ]
        });
      }
    }

    let appliedCount = 0;

    validMatches.forEach(item => {
      const qIndex = (item.questionNum || 1) - 1;
      if (qIndex >= 0 && qIndex < updatedQuestions.length) {
        const q = updatedQuestions[qIndex];
        const optLetter = item.optionLetter?.toUpperCase();
        const optIndex = ['A', 'B', 'C'].indexOf(optLetter || 'A');

        if (optIndex >= 0 && optIndex < q.options.length) {
          q.options[optIndex].image = item.dataUrl;
          appliedCount++;
        }
      }
    });

    onApplyImages(updatedQuestions);
    toast.success(`Successfully applied ${appliedCount} images to assessment questions!`);
    onClose();
    setParsedFiles([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-3 border-b shrink-0">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Batch Asset Importer
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            Batch Upload Option Images
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-500">
            Select multiple image files at once. Files named like <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-xs">1.1</code>, <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-xs">1.2</code>, <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-xs">1.3</code>, <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-xs">2.1</code>, <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-xs">2.2</code> will automatically map to Question # and Option A/B/C!
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
          {/* File Dropzone */}
          <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 rounded-2xl p-8 text-center transition-colors">
            <input 
              type="file" 
              accept="image/*,.pdf,application/pdf" 
              multiple 
              id="batch-image-file-input" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <label htmlFor="batch-image-file-input" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <ImagePlus className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">Click or Drag & Drop Multiple Images</p>
                <p className="text-sm text-slate-500 mt-0.5">Accepts PNG, JPG, JPEG, WEBP files</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 justify-center text-xs text-slate-600 bg-white px-4 py-2 rounded-xl border border-indigo-100 shadow-xs">
                <span>Naming format examples:</span>
                <span className="font-mono font-bold text-indigo-700">1.1, 1.2, 1.3</span> • 
                <span className="font-mono font-bold text-indigo-700">1_1, 1_2, 1_3</span> • 
                <span className="font-mono font-bold text-indigo-700">1A, 1B, 1C</span> • 
                <span className="font-mono font-bold text-indigo-700">Item1_1, Item1_2</span>
              </div>
            </label>
          </div>

          {/* Options Bar */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
            <div className="space-y-0.5">
              <Label className="font-bold text-slate-900">Auto-create Missing Questions</Label>
              <p className="text-xs text-slate-500">Automatically add question cards if uploaded images exceed current total.</p>
            </div>
            <Switch 
              checked={autoCreateQuestions} 
              onCheckedChange={setAutoCreateQuestions} 
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>

          {/* Parsed File Mapping Grid */}
          {parsedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  Uploaded Images ({parsedFiles.length})
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setParsedFiles([])} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {parsedFiles.map(pf => (
                  <div 
                    key={pf.id} 
                    className={`p-3 border rounded-xl bg-white shadow-xs flex gap-3 relative group transition-all ${
                      pf.isMatched 
                        ? 'border-emerald-200 ring-1 ring-emerald-400/30' 
                        : 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-400/50'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center p-1">
                      <img src={pf.dataUrl} alt={pf.fileName} className="max-w-full max-h-full object-contain" />
                    </div>

                    {/* Mapping Info & Controls */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-mono font-bold text-slate-700 truncate" title={pf.fileName}>
                          {pf.fileName}
                        </p>
                        {pf.isMatched ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Q{pf.questionNum} • Option {pf.optionLetter}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Unrecognized
                          </span>
                        )}
                      </div>

                      {/* Manual Assignment Selectors */}
                      <div className="flex gap-1.5 mt-2">
                        <select 
                          className="text-xs bg-slate-50 border rounded px-1.5 py-1 font-bold text-slate-800"
                          value={pf.questionNum || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : null;
                            handleUpdateMapping(pf.id, val, pf.optionLetter);
                          }}
                        >
                          <option value="">Q#...</option>
                          {Array.from({ length: Math.max(12, existingQuestions.length + 5) }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>Q{num}</option>
                          ))}
                        </select>

                        <select 
                          className="text-xs bg-slate-50 border rounded px-1.5 py-1 font-bold text-slate-800"
                          value={pf.optionLetter || ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            handleUpdateMapping(pf.id, pf.questionNum, val);
                          }}
                        >
                          <option value="">Opt...</option>
                          <option value="A">Opt A (1)</option>
                          <option value="B">Opt B (2)</option>
                          <option value="C">Opt C (3)</option>
                        </select>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button 
                      onClick={() => handleRemoveFile(pf.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t flex flex-row items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} className="font-bold">
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={parsedFiles.length === 0 || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-indigo-200"
          >
            Apply Images to Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
