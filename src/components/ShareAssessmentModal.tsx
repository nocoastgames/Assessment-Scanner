import React, { useState } from 'react';
import { Share2, Copy, Check, ExternalLink, Download, Code, Globe, Sparkles, BookOpen, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TestQuestion, AssessmentType } from '../types';
import { toast } from 'sonner';

interface ShareAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  testName: string;
  assessmentType: AssessmentType;
  questions: TestQuestion[];
}

export function ShareAssessmentModal({
  isOpen,
  onClose,
  testName,
  assessmentType,
  questions
}: ShareAssessmentModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const activeQuestions = questions && questions.length > 0 ? questions : [];
  const activeName = testName || (questions && questions.length > 0 ? 'Shared Assessment' : 'Unit 1 Pre-Test');

  // Generate share payload
  const payload = {
    testName: activeName,
    assessmentType: assessmentType || 'pre-test',
    questions: activeQuestions
  };

  const jsonString = JSON.stringify(payload);
  
  // Safe Base64 encoding for unicode/images
  const encodedPayload = typeof window !== 'undefined' 
    ? btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
    : '';

  const originUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const shareableUrl = `${originUrl}#assessment=${encodedPayload}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    toast.success('Shareable link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const iframeEmbedCode = `<iframe src="${shareableUrl}" width="100%" height="700" frameborder="0" allow="autoplay; microphone"></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(iframeEmbedCode);
    setCopiedEmbed(true);
    toast.success('Embed iframe code copied!');
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const handleDownloadStandaloneHTML = () => {
    const title = testName || 'Shared Assessment';
    
    // Create a standalone HTML bundle with embedded test data and player engine
    const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Adaptive Single-Switch Assessment</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes pulse-ring {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 12px rgba(79, 70, 229, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
    }
    .scanning-active { animation: pulse-ring 1.5s infinite; border-color: #4f46e5 !important; }
  </style>
</head>
<body class="bg-slate-100 min-h-screen font-sans text-slate-900 flex flex-col items-center justify-center p-4">

  <div id="app" class="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
    <div class="bg-indigo-600 text-white p-6 flex justify-between items-center">
      <div>
        <span class="text-xs font-bold uppercase tracking-wider bg-indigo-500/50 px-2.5 py-1 rounded-full border border-indigo-400/40">
          ${assessmentType.toUpperCase()}
        </span>
        <h1 class="text-2xl font-black mt-2">${title}</h1>
      </div>
      <div id="q-counter" class="text-right">
        <span class="text-xs text-indigo-200 block font-bold">Progress</span>
        <span id="progress-text" class="text-xl font-black">Question 1 / ${questions.length}</span>
      </div>
    </div>

    <!-- Active Question Container -->
    <div className="p-6 md:p-8 space-y-6">
      <div id="question-header" class="p-4 bg-slate-50 border rounded-xl text-center">
        <p id="prompt-text" class="text-xl font-extrabold text-slate-900">Loading...</p>
      </div>

      <!-- Options Container -->
      <div id="options-grid" class="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[260px]">
      </div>

      <!-- Control Bar -->
      <div class="pt-6 border-t flex flex-col sm:flex-row gap-3">
        <button id="select-btn" onclick="handleSelect()" class="flex-1 py-5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-black text-2xl uppercase shadow-lg transition-transform active:scale-98">
          Select (Spacebar / Click)
        </button>
        <button id="toggle-scan-btn" onclick="toggleScanning()" class="px-6 py-5 bg-indigo-100 text-indigo-900 hover:bg-indigo-200 rounded-xl font-bold text-lg">
          Pause Scanning
        </button>
      </div>
    </div>

    <!-- Results Container (Hidden initially) -->
    <div id="results-screen" class="hidden p-8 text-center space-y-6">
      <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
        ✓
      </div>
      <h2 class="text-3xl font-black text-slate-900">Assessment Complete!</h2>
      <div id="results-list" class="max-w-md mx-auto text-left space-y-2 text-sm bg-slate-50 p-4 rounded-xl border">
      </div>
      <button onclick="location.reload()" class="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md">
        Restart Assessment
      </button>
    </div>
  </div>

  <script>
    const testData = ${jsonString};
    let currentQIndex = 0;
    let currentAttempt = 1;
    let scanIndex = 0;
    let isScanning = true;
    let scanTimer = null;
    let responses = [];
    let eliminatedIndices = [];

    function speak(text) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9;
        u.lang = 'en-US';
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const usVoices = voices.filter(v => v.lang === 'en-US' || v.lang === 'en_US' || v.lang.toLowerCase().includes('en-us'));
          const pool = usVoices.length > 0 ? usVoices : voices.filter(v => v.lang.startsWith('en'));
          if (pool.length > 0) {
            u.voice = pool.find(v => v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('alex') || v.name.toLowerCase().includes('google us english')) || pool[0];
          }
        }
        window.speechSynthesis.speak(u);
      }
    }

    function renderQuestion() {
      if (currentQIndex >= testData.questions.length) {
        showResults();
        return;
      }

      const q = testData.questions[currentQIndex];
      document.getElementById('progress-text').innerText = \`Question \${currentQIndex + 1} / \${testData.questions.length}\`;
      
      const promptText = currentAttempt === 2 && q.alternatePrompt ? q.alternatePrompt : (q.questionText || \`Question \${currentQIndex + 1}\`);
      document.getElementById('prompt-text').innerText = promptText;
      speak(promptText);

      const grid = document.getElementById('options-grid');
      grid.innerHTML = '';

      const activeOpts = q.options.map((opt, i) => ({ opt, originalIndex: i }))
        .filter(item => item.opt.isActive !== false && !eliminatedIndices.includes(item.originalIndex));

      if (scanIndex >= activeOpts.length) scanIndex = 0;

      activeOpts.forEach((item, idx) => {
        const isHighlighted = idx === scanIndex && isScanning;
        const opt = item.opt;

        const card = document.createElement('div');
        card.className = \`p-4 border-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer bg-white \${
          isHighlighted ? 'border-indigo-600 bg-indigo-50/50 shadow-lg scale-102 scanning-active' : 'border-slate-200'
        }\`;
        card.onclick = () => { scanIndex = idx; handleSelect(); };

        let imgHtml = opt.image ? \`<img src="\${opt.image}" class="w-32 h-32 object-contain bg-slate-50 border rounded-xl p-1" />\` : '';
        let textHtml = opt.text ? \`<span class="font-bold text-slate-800 text-lg">\${opt.text}</span>\` : '';

        card.innerHTML = \`
          <span class="w-10 h-10 rounded-xl font-black text-xl flex items-center justify-center bg-slate-100 text-slate-700">\${opt.letter}</span>
          \${imgHtml}
          \${textHtml}
        \`;

        grid.appendChild(card);
      });

      if (isHighlighted && activeOpts[scanIndex]) {
        const textToAnnounce = \`Option \${activeOpts[scanIndex].opt.letter}. \${activeOpts[scanIndex].opt.text || ''}\`;
        speak(textToAnnounce);
      }
    }

    function handleSelect() {
      const q = testData.questions[currentQIndex];
      const activeOpts = q.options.map((opt, i) => ({ opt, originalIndex: i }))
        .filter(item => item.opt.isActive !== false && !eliminatedIndices.includes(item.originalIndex));

      if (activeOpts.length === 0) return;

      const selected = activeOpts[scanIndex];
      responses.push({
        qNum: currentQIndex + 1,
        letter: selected.opt.letter,
        isCorrect: !!selected.opt.isCorrect,
        attempt: currentAttempt
      });

      if (selected.opt.isCorrect) {
        speak("Correct!");
        currentQIndex++;
        currentAttempt = 1;
        eliminatedIndices = [];
        scanIndex = 0;
      } else {
        if (currentAttempt === 1) {
          speak("Try again.");
          currentAttempt = 2;
          eliminatedIndices.push(selected.originalIndex);
          scanIndex = 0;
        } else {
          speak("Moving to next question.");
          currentQIndex++;
          currentAttempt = 1;
          eliminatedIndices = [];
          scanIndex = 0;
        }
      }

      setTimeout(renderQuestion, 1000);
    }

    function toggleScanning() {
      isScanning = !isScanning;
      document.getElementById('toggle-scan-btn').innerText = isScanning ? "Pause Scanning" : "Resume Scanning";
      if (isScanning) startTimer();
      else clearInterval(scanTimer);
    }

    function startTimer() {
      clearInterval(scanTimer);
      scanTimer = setInterval(() => {
        if (!isScanning) return;
        const q = testData.questions[currentQIndex];
        const activeOpts = q.options.filter(opt => opt.isActive !== false);
        if (activeOpts.length === 0) return;
        scanIndex = (scanIndex + 1) % activeOpts.length;
        renderQuestion();
      }, 4000);
    }

    function showResults() {
      document.getElementById('question-header').parentElement.classList.add('hidden');
      const res = document.getElementById('results-screen');
      res.classList.remove('hidden');

      const list = document.getElementById('results-list');
      list.innerHTML = responses.map(r => \`
        <div class="flex justify-between p-2 border-b">
          <span>Item \${r.qNum} (Attempt \${r.attempt})</span>
          <span class="font-bold \${r.isCorrect ? 'text-emerald-600' : 'text-red-600'}">\${r.letter} (\${r.isCorrect ? 'Correct' : 'Incorrect'})</span>
        </div>
      \`).join('');
    }

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleSelect();
      }
    });

    renderQuestion();
    startTimer();
  </script>
</body>
</html>`;

    const blob = new Blob([standaloneHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-github-pages.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Downloaded Standalone HTML file for GitHub Pages / Web Hosting!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-3 border-b shrink-0">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4" /> Assessment Sharing & Hosting
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            Share Assessment & Deploy to GitHub
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-500">
            Share "{activeName}" ({activeQuestions.length} questions) via web link or export a standalone HTML page to host on GitHub Pages.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl mb-6">
              <TabsTrigger value="link" className="font-bold text-xs sm:text-sm">
                <Share2 className="w-4 h-4 mr-2" /> Shareable Web Link
              </TabsTrigger>
              <TabsTrigger value="github" className="font-bold text-xs sm:text-sm">
                <FileCode className="w-4 h-4 mr-2" /> GitHub Pages HTML
              </TabsTrigger>
            </TabsList>

            {/* DIRECT SHAREABLE LINK */}
            <TabsContent value="link" className="space-y-4 mt-0">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Instant Browser Link
                </div>
                <p className="text-xs text-indigo-800/80 leading-relaxed">
                  Anyone who clicks this link will instantly load this exact assessment ({activeQuestions.length} items with options and image cards) into their app!
                </p>

                <div className="flex gap-2 pt-1">
                  <Input 
                    value={shareableUrl} 
                    readOnly 
                    className="font-mono text-xs bg-white text-slate-700 border-indigo-200 select-all h-11"
                  />
                  <Button 
                    onClick={handleCopyLink} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-4 shrink-0 rounded-xl"
                  >
                    {copiedLink ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </div>

              {/* Iframe Embed Code */}
              <div className="space-y-2 pt-2">
                <Label className="font-bold text-slate-900 text-sm">Embed Code for LMS (Canvas, Google Classroom)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={iframeEmbedCode} 
                    readOnly 
                    className="font-mono text-xs bg-slate-50 text-slate-600 border-slate-200 select-all h-10"
                  />
                  <Button 
                    onClick={handleCopyEmbed} 
                    variant="outline" 
                    className="font-bold h-10 shrink-0"
                  >
                    {copiedEmbed ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* GITHUB PAGES & STANDALONE HTML */}
            <TabsContent value="github" className="space-y-5 mt-0">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <Globe className="w-4 h-4 text-emerald-600" /> Host Free on GitHub Pages
                </div>
                <p className="text-xs text-emerald-800/90 leading-relaxed">
                  Download a complete single-file webpage containing this assessment. Upload it to GitHub Pages or any free host to create a permanent assessment link for students!
                </p>
                <div className="pt-2">
                  <Button 
                    onClick={handleDownloadStandaloneHTML}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-md w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Standalone HTML Page
                  </Button>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-4 bg-slate-50 border rounded-2xl space-y-3 text-xs text-slate-700">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-600" /> How to host on GitHub Pages in 3 minutes:
                </h4>
                <ol className="list-decimal list-inside space-y-2 pl-1 leading-relaxed">
                  <li>Log into <strong className="text-slate-900">GitHub.com</strong> and click <strong className="text-slate-900">New Repository</strong> (e.g. name it <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900 font-mono">unit1-pretest</code>).</li>
                  <li>Click <strong className="text-slate-900">Upload an existing file</strong> and upload the downloaded HTML file. Rename it to <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900 font-mono">index.html</code>.</li>
                  <li>Go to <strong className="text-slate-900">Settings → Pages</strong>, select <strong className="text-slate-900">Deploy from branch</strong>, pick <strong className="text-slate-900">main</strong>, and click <strong className="text-slate-900">Save</strong>.</li>
                  <li>Your assessment will be live at: <code className="text-indigo-600 font-bold font-mono">https://yourusername.github.io/unit1-pretest/</code>!</li>
                </ol>
              </div>
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
