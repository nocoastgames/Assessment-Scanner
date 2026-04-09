import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Settings, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText,
  Save,
  ImagePlus,
  Trash2,
  Plus,
  X,
  Download,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// --- Types ---
type Response = {
  questionNumber: number;
  option: string;
  optionText?: string;
  timestamp: string;
  attempt?: number;
  isCorrect?: boolean;
};

type AppState = 'setup' | 'splash' | 'testing' | 'results';

type TestOption = {
  letter: string;
  text: string;
  image: string | null;
  isCorrect?: boolean;
};

type TestQuestion = {
  id: string;
  questionText: string;
  alternatePrompt?: string;
  options: TestOption[];
};

// --- Constants ---
const CLICK_SAFEGUARD_MS = 1000; // 1 second lockout between clicks

export default function App() {
  // --- State ---
  const [appState, setAppState] = useState<AppState>('setup');
  const [testMode, setTestMode] = useState<'generic' | 'custom'>('generic');
  const [testName, setTestName] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [genericType, setGenericType] = useState<'yes/no' | '1,2,3' | 'a,b,c'>('a,b,c');
  const [numChoices, setNumChoices] = useState<1 | 2 | 3>(3);
  const [studentId, setStudentId] = useState('');
  const [scanSpeed, setScanSpeed] = useState(5000); // Default to 5 seconds per option
  const [isTTSActive, setIsTTSActive] = useState(true);
  const [isAnnounceQuestionActive, setIsAnnounceQuestionActive] = useState(true);
  const [isTwoAttemptsMode, setIsTwoAttemptsMode] = useState(false);
  const [isCVIMode, setIsCVIMode] = useState(false);
  const [timeLimit, setTimeLimit] = useState(0); // 0 means no limit (minutes)
  
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const [timeLeft, setTimeLeft] = useState(0); // seconds

  const lastClickTime = useRef(0);
  const scanInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actualNumQuestions = testMode === 'custom' ? questions.length : numQuestions;

  const currentOptions = useMemo(() => {
    let baseOptions = ['A', 'B', 'C'];
    if (genericType === 'yes/no') baseOptions = ['Yes', 'No'];
    else if (genericType === '1,2,3') baseOptions = ['1', '2', '3'];
    else if (genericType === 'a,b,c') baseOptions = ['A', 'B', 'C'];
    
    return baseOptions.slice(0, numChoices);
  }, [genericType, numChoices]);

  const activeOptions = useMemo(() => {
    return currentOptions
      .map((opt, index) => ({ option: opt, originalIndex: index }))
      .filter(item => !eliminatedOptions.includes(item.originalIndex));
  }, [currentOptions, eliminatedOptions]);

  // --- TTS Helper ---
  const speak = useCallback((text: string) => {
    if (!isTTSActive) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8; // Slightly slower for clarity
    window.speechSynthesis.speak(utterance);
  }, [isTTSActive]);

  // --- Scanning Logic ---
  useEffect(() => {
    if (isScanning && appState === 'testing' && activeOptions.length > 0) {
      scanInterval.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activeOptions.length);
      }, scanSpeed);
    } else {
      if (scanInterval.current) clearInterval(scanInterval.current);
    }
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, [isScanning, scanSpeed, appState, activeOptions.length]);

  // --- Voice Sync Logic ---
  useEffect(() => {
    if (isScanning && appState === 'testing' && activeOptions.length > 0) {
      const currentQ = testMode === 'custom' ? questions[currentQuestion - 1] : null;
      const originalIndex = activeOptions[currentIndex]?.originalIndex;
      const opt = currentQ?.options[originalIndex];
      const textToSpeak = opt?.text ? opt.text : activeOptions[currentIndex]?.option;
      if (textToSpeak) speak(textToSpeak);
    }
  }, [currentIndex, isScanning, appState, speak, testMode, questions, currentQuestion, activeOptions]);

  // --- Switch Accessibility (Keyboard) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appState !== 'testing') return;
      
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleSelect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState, currentIndex]); // currentIndex needed for handleSelect closure if not using refs

  // --- Timer Logic ---
  useEffect(() => {
    if (appState === 'testing' && timeLimit > 0) {
      setTimeLeft(timeLimit * 60);
      timerInterval.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval.current!);
            handleFinishTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [appState, timeLimit]);

  // --- Builder Handlers ---
  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now().toString() + Math.random().toString(),
      questionText: '',
      options: [
        { letter: 'A', text: '', image: null },
        { letter: 'B', text: '', image: null },
        { letter: 'C', text: '', image: null },
      ]
    }]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestionText = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, questionText: text } : q));
  };

  const updateAlternatePrompt = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, alternatePrompt: text } : q));
  };

  const updateOption = (qId: string, optIndex: number, field: 'text' | 'image' | 'isCorrect', value: string | null | boolean) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const newOptions = [...q.options];
      
      // If setting isCorrect to true, we might want to unset others, but let's just allow multiple or single.
      // Actually, for a multiple choice, usually one is correct. Let's unset others if setting to true.
      if (field === 'isCorrect' && value === true) {
        newOptions.forEach((opt, idx) => {
          if (idx !== optIndex) newOptions[idx] = { ...opt, isCorrect: false };
        });
      }
      
      newOptions[optIndex] = { ...newOptions[optIndex], [field]: value };
      return { ...q, options: newOptions };
    }));
  };

  const exportQuestionBank = () => {
    const data = {
      testName,
      questions,
      isTwoAttemptsMode,
      isTTSActive,
      isAnnounceQuestionActive,
      isCVIMode,
      scanSpeed,
      timeLimit
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${testName || 'Question_Bank'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Question bank exported successfully');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
          if (data.testName !== undefined) setTestName(data.testName);
          if (data.isTwoAttemptsMode !== undefined) setIsTwoAttemptsMode(data.isTwoAttemptsMode);
          if (data.isTTSActive !== undefined) setIsTTSActive(data.isTTSActive);
          if (data.isAnnounceQuestionActive !== undefined) setIsAnnounceQuestionActive(data.isAnnounceQuestionActive);
          if (data.isCVIMode !== undefined) setIsCVIMode(data.isCVIMode);
          if (data.scanSpeed !== undefined) setScanSpeed(data.scanSpeed);
          if (data.timeLimit !== undefined) setTimeLimit(data.timeLimit);
          
          setTestMode('custom');
          toast.success('Question bank imported successfully');
        } else {
          toast.error('Invalid question bank file format');
        }
      } catch (err) {
        toast.error('Failed to parse question bank file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Test Handlers ---
  const handleStartTest = () => {
    if (!studentId.trim()) {
      toast.error('Please enter a student identifier');
      return;
    }
    if (testMode === 'custom' && questions.length === 0) {
      toast.error('Please add at least one question, or switch to Generic mode.');
      return;
    }
    setResponses([]);
    setCurrentQuestion(1);
    setCurrentAttempt(1);
    setEliminatedOptions([]);
    setCurrentIndex(0);
    setIsScanning(false);
    setAppState('splash');
    if (isAnnounceQuestionActive) speak('Question 1');
    setTimeout(() => {
      setAppState('testing');
      setIsScanning(true);
    }, 2000);
  };

  const advanceToNextQuestion = (isNoResponse: boolean = false) => {
    if (isNoResponse) {
      setResponses((prev) => [
        ...prev,
        {
          questionNumber: currentQuestion,
          option: 'NR',
          optionText: 'No Response',
          timestamp: new Date().toLocaleTimeString(),
          attempt: currentAttempt,
          isCorrect: false
        }
      ]);
      toast.info(`Question ${currentQuestion}: Logged as No Response`);
    }

    if (currentQuestion < actualNumQuestions) {
      const nextQ = currentQuestion + 1;
      setCurrentQuestion(nextQ);
      setCurrentAttempt(1);
      setEliminatedOptions([]);
      setCurrentIndex(0);
      setIsScanning(false);
      setAppState('splash');
      if (isAnnounceQuestionActive) speak(`Question ${nextQ}`);
      setTimeout(() => {
        setAppState('testing');
        setIsScanning(true);
      }, 2000);
    } else {
      handleFinishTest();
    }
  };

  const handleSelect = () => {
    const now = Date.now();
    if (now - lastClickTime.current < CLICK_SAFEGUARD_MS) {
      return; // Safeguard against rapid clicks
    }
    lastClickTime.current = now;

    if (activeOptions.length === 0) return;

    const selectedItem = activeOptions[currentIndex];
    const originalIndex = selectedItem.originalIndex;
    const selectedOption = selectedItem.option;
    const currentQ = testMode === 'custom' ? questions[currentQuestion - 1] : null;
    const optData = currentQ?.options[originalIndex];

    const newResponse: Response = {
      questionNumber: currentQuestion,
      option: selectedOption,
      optionText: optData?.text,
      timestamp: new Date().toLocaleTimeString(),
      attempt: currentAttempt,
      isCorrect: optData?.isCorrect
    };

    if (testMode === 'custom' && isTwoAttemptsMode) {
      if (currentAttempt === 1) {
        if (optData?.isCorrect) {
          setResponses((prev) => [...prev, newResponse]);
          setIsScanning(false);
          speak(optData?.text || selectedOption);
          toast.success(`Question ${currentQuestion}: Selected ${selectedOption} (Correct)`);
          setTimeout(() => advanceToNextQuestion(false), 1500);
        } else {
          setResponses((prev) => [...prev, newResponse]);
          setEliminatedOptions((prev) => [...prev, originalIndex]);
          setCurrentAttempt(2);
          setCurrentIndex(0);
          setIsScanning(false);
          
          const promptToRead = currentQ?.alternatePrompt || currentQ?.questionText || 'Try again';
          speak(promptToRead);
          toast.error(`Question ${currentQuestion}: Selected ${selectedOption} (Incorrect). Try again.`);
          
          setTimeout(() => {
            setIsScanning(true);
          }, 3000);
        }
      } else {
        setResponses((prev) => [...prev, newResponse]);
        setIsScanning(false);
        speak(optData?.text || selectedOption);
        toast.info(`Question ${currentQuestion}: Selected ${selectedOption} (Attempt 2)`);
        setTimeout(() => advanceToNextQuestion(false), 1500);
      }
    } else {
      setResponses((prev) => [...prev, newResponse]);
      setIsScanning(false);
      speak(optData?.text || selectedOption);
      toast.success(`Question ${currentQuestion}: Selected ${selectedOption}`);
      setTimeout(() => advanceToNextQuestion(false), 1500);
    }
  };

  const handleNoResponse = () => {
    advanceToNextQuestion(true);
  };

  const handleFinishTest = () => {
    setIsScanning(false);
    setAppState('results');
    speak('Test completed. Reviewing results.');
  };

  const handleReset = () => {
    setAppState('setup');
    setIsScanning(false);
  };

  const exportToCSV = () => {
    const headers = ['Student ID', 'Test Name', 'Date', 'Question Number', 'Attempt', 'Option Selected', 'Option Text', 'Correct', 'Timestamp'];
    const rows = responses.map(r => [
      studentId,
      testName,
      new Date().toLocaleDateString(),
      r.questionNumber,
      r.attempt || 1,
      r.option,
      r.optionText || '',
      r.isCorrect === undefined ? 'N/A' : (r.isCorrect ? 'Yes' : 'No'),
      r.timestamp
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${studentId || 'Student'}_${testName || 'Test'}_Results.csv`.replace(/\s+/g, '_'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Render Helpers ---
  const renderSetup = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <Card className="border-2">
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Settings className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Configuration</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Test Setup</CardTitle>
          <CardDescription>Configure the assessment parameters and questions.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="settings">Test Settings</TabsTrigger>
              <TabsTrigger value="questions">Questions Builder</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="testName" className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Test Name
                  </Label>
                  <Input 
                    id="testName" 
                    value={testName} 
                    onChange={(e) => setTestName(e.target.value)}
                    className="border-slate-200 focus:ring-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> Student Identifier
                  </Label>
                  <Input 
                    id="studentId" 
                    placeholder="e.g. STU-123" 
                    value={studentId} 
                    onChange={(e) => setStudentId(e.target.value)}
                    className="border-slate-200 focus:ring-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Test Mode</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={testMode === 'generic' ? 'default' : 'outline'} 
                      onClick={() => setTestMode('generic')}
                      className={testMode === 'generic' ? 'bg-slate-900 text-white' : ''}
                    >
                      Generic (A/B/C)
                    </Button>
                    <Button 
                      variant={testMode === 'custom' ? 'default' : 'outline'} 
                      onClick={() => setTestMode('custom')}
                      className={testMode === 'custom' ? 'bg-slate-900 text-white' : ''}
                    >
                      Custom Questions
                    </Button>
                  </div>
                </div>
                {testMode === 'generic' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="numQuestions">Number of Questions</Label>
                      <Input 
                        id="numQuestions" 
                        type="number" 
                        value={numQuestions} 
                        onChange={(e) => setNumQuestions(parseInt(e.target.value) || 1)}
                        min="1"
                        className="border-slate-200 focus:ring-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Options Type</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant={genericType === 'a,b,c' ? 'default' : 'outline'} 
                          onClick={() => setGenericType('a,b,c')}
                          className={genericType === 'a,b,c' ? 'bg-slate-900 text-white' : ''}
                        >
                          A, B, C
                        </Button>
                        <Button 
                          variant={genericType === '1,2,3' ? 'default' : 'outline'} 
                          onClick={() => setGenericType('1,2,3')}
                          className={genericType === '1,2,3' ? 'bg-slate-900 text-white' : ''}
                        >
                          1, 2, 3
                        </Button>
                        <Button 
                          variant={genericType === 'yes/no' ? 'default' : 'outline'} 
                          onClick={() => setGenericType('yes/no')}
                          className={genericType === 'yes/no' ? 'bg-slate-900 text-white' : ''}
                        >
                          Yes / No
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Choices</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant={numChoices === 1 ? 'default' : 'outline'} 
                          onClick={() => setNumChoices(1)}
                          className={numChoices === 1 ? 'bg-slate-900 text-white' : ''}
                        >
                          Errorless (1)
                        </Button>
                        <Button 
                          variant={numChoices === 2 ? 'default' : 'outline'} 
                          onClick={() => setNumChoices(2)}
                          className={numChoices === 2 ? 'bg-slate-900 text-white' : ''}
                        >
                          2 Choices
                        </Button>
                        <Button 
                          variant={numChoices === 3 ? 'default' : 'outline'} 
                          onClick={() => setNumChoices(3)}
                          className={numChoices === 3 ? 'bg-slate-900 text-white' : ''}
                        >
                          3 Choices
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 flex flex-col justify-center">
                    <Label>Number of Questions</Label>
                    <span className="text-lg font-bold text-slate-700">{questions.length} (From Builder)</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Time Limit (Minutes, 0 = None)</Label>
                  <Input 
                    id="timeLimit" 
                    type="number" 
                    value={timeLimit} 
                    onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                    min="0"
                    className="border-slate-200 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <Label className="text-base">CVI Mode</Label>
                    <p className="text-sm text-slate-500">High contrast (Yellow on Black) for visual impairment.</p>
                  </div>
                  <Switch 
                    checked={isCVIMode} 
                    onCheckedChange={setIsCVIMode} 
                    className="data-[state=checked]:bg-yellow-400"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <Label className="text-base">Text-to-Speech</Label>
                    <p className="text-sm text-slate-500">Read options aloud during scanning.</p>
                  </div>
                  <Switch 
                    checked={isTTSActive} 
                    onCheckedChange={setIsTTSActive} 
                    className="data-[state=checked]:bg-slate-900"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <Label className="text-base">Announce Question Number</Label>
                    <p className="text-sm text-slate-500">Read "Question X" aloud on the splash screen.</p>
                  </div>
                  <Switch 
                    checked={isAnnounceQuestionActive} 
                    onCheckedChange={setIsAnnounceQuestionActive} 
                    className="data-[state=checked]:bg-slate-900"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two Attempts Mode (Custom Only)</Label>
                    <p className="text-sm text-slate-500">Give two attempts for custom questions. Eliminates wrong answer.</p>
                  </div>
                  <Switch 
                    checked={isTwoAttemptsMode} 
                    onCheckedChange={setIsTwoAttemptsMode} 
                    className="data-[state=checked]:bg-slate-900"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Scanning Speed (Seconds per option)</Label>
                    <span className="text-sm font-mono font-bold text-slate-600">{(scanSpeed / 1000).toFixed(1)}s</span>
                  </div>
                  <Slider 
                    value={[scanSpeed]} 
                    onValueChange={(val) => setScanSpeed(Array.isArray(val) ? val[0] : val)} 
                    min={500} 
                    max={10000} 
                    step={500}
                    className="py-4"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                    <span>Fast</span>
                    <span>Slow</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900">Custom Question Bank</h3>
                  <p className="text-sm text-slate-500">Create, export, or import your custom questions and settings.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={handleImportClick} className="flex-1 sm:flex-none bg-white">
                    <Upload className="w-4 h-4 mr-2" /> Import
                  </Button>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleImportFile} 
                  />
                  <Button variant="outline" onClick={exportQuestionBank} className="flex-1 sm:flex-none bg-white" disabled={questions.length === 0}>
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </div>
              </div>

              {testMode === 'generic' && (
                <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-200 text-sm">
                  You are currently in <strong>Generic Mode</strong>. Switch to <strong>Custom Questions</strong> in the Settings tab to use these questions.
                </div>
              )}
              
              <div className="space-y-6">
                {questions.map((q, qIndex) => (
                  <Card key={q.id} className="border-2 border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
                      <CardTitle className="text-lg font-bold">Question {qIndex + 1}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-bold">Question Text (Optional)</Label>
                          <Input 
                            value={q.questionText} 
                            onChange={(e) => updateQuestionText(q.id, e.target.value)} 
                            placeholder="e.g., What is the capital of Nevada?" 
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold">Alternate Prompt (For Attempt 2)</Label>
                          <Input 
                            value={q.alternatePrompt || ''} 
                            onChange={(e) => updateAlternatePrompt(q.id, e.target.value)} 
                            placeholder="e.g., Try again. What is the capital?" 
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {q.options.map((opt, optIndex) => (
                          <div key={opt.letter} className={`p-4 border rounded-xl space-y-4 bg-white shadow-sm ${opt.isCorrect ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}>
                            <div className="flex justify-between items-center border-b pb-2">
                              <Label className="font-black text-xl text-slate-800">Option {opt.letter}</Label>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`correct-${q.id}-${optIndex}`} className="text-xs font-bold text-slate-500 cursor-pointer">Correct</Label>
                                <Switch 
                                  id={`correct-${q.id}-${optIndex}`}
                                  checked={!!opt.isCorrect}
                                  onCheckedChange={(checked) => updateOption(q.id, optIndex, 'isCorrect', checked)}
                                  className="data-[state=checked]:bg-emerald-500"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Answer Text</Label>
                              <Input 
                                value={opt.text} 
                                onChange={(e) => updateOption(q.id, optIndex, 'text', e.target.value)} 
                                placeholder="e.g., Carson City" 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Image</Label>
                              {opt.image ? (
                                <div className="relative group">
                                  <img src={opt.image} alt="Uploaded" className="w-full h-32 object-contain bg-slate-50 border rounded-lg p-2" />
                                  <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-md" 
                                    onClick={() => updateOption(q.id, optIndex, 'image', null)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div>
                                  <Input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    id={`file-${q.id}-${optIndex}`} 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => updateOption(q.id, optIndex, 'image', reader.result as string);
                                        reader.readAsDataURL(file);
                                      }
                                    }} 
                                  />
                                  <Label 
                                    htmlFor={`file-${q.id}-${optIndex}`} 
                                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors text-slate-500"
                                  >
                                    <div className="flex flex-col items-center gap-2">
                                      <ImagePlus className="w-6 h-6 text-slate-400" />
                                      <span className="text-xs font-medium">Upload Image</span>
                                    </div>
                                  </Label>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button onClick={addQuestion} variant="outline" className="w-full border-dashed border-2 h-16 text-slate-500 hover:text-slate-900 bg-white">
                  <Plus className="w-5 h-5 mr-2" /> Add New Question
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t p-6">
          <Button 
            onClick={handleStartTest} 
            className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 transition-all shadow-lg"
          >
            Start Assessment <Play className="ml-2 w-5 h-5 fill-current" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );

  const renderTesting = () => {
    const currentQData = testMode === 'custom' ? questions[currentQuestion - 1] : null;

    return (
      <div className={`max-w-5xl mx-auto space-y-6 ${isCVIMode ? 'p-8 rounded-3xl bg-black' : ''}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div className="space-y-1">
            <h2 className={`text-2xl font-bold ${isCVIMode ? 'text-yellow-400' : 'text-slate-900'}`}>{testName}</h2>
            <div className={`flex items-center gap-4 text-sm ${isCVIMode ? 'text-yellow-400/70' : 'text-slate-500'}`}>
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {studentId}</span>
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> Question {currentQuestion} of {actualNumQuestions}</span>
            </div>
          </div>
          {timeLimit > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg shadow-sm border ${
              isCVIMode 
                ? 'bg-black text-yellow-400 border-yellow-400' 
                : timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-slate-700 border-slate-200'
            }`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        <Progress value={(currentQuestion / actualNumQuestions) * 100} className={`h-2 ${isCVIMode ? 'bg-yellow-900/30' : 'bg-slate-100'}`} />

        {currentQData?.questionText && (
          <div className={`text-center p-6 rounded-2xl mt-4 ${isCVIMode ? 'bg-yellow-900/20 border-2 border-yellow-900/50' : 'bg-white border shadow-sm'}`}>
            <h3 className={`text-3xl font-bold ${isCVIMode ? 'text-yellow-400' : 'text-slate-900'}`}>
              {currentQData.questionText}
            </h3>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-6 py-4 ${
          activeOptions.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : 
          activeOptions.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 
          'md:grid-cols-3'
        }`}>
          {activeOptions.map((item, index) => {
            const optData = currentQData?.options[item.originalIndex];
            const option = item.option;
            
            return (
              <motion.div
                key={option}
                animate={{
                  scale: currentIndex === index && isScanning ? 1.05 : 1,
                  borderColor: currentIndex === index && isScanning 
                    ? (isCVIMode ? '#ef4444' : '#0f172a') 
                    : (isCVIMode ? '#451a03' : '#e2e8f0'),
                  backgroundColor: currentIndex === index && isScanning 
                    ? (isCVIMode ? '#000000' : '#f8fafc') 
                    : (isCVIMode ? '#000000' : '#ffffff'),
                }}
                className={`relative h-80 rounded-3xl border-8 flex flex-col items-center justify-center transition-colors shadow-sm overflow-hidden`}
              >
                <span className={`absolute top-4 left-6 text-3xl font-black ${
                  currentIndex === index && isScanning 
                    ? (isCVIMode ? 'text-yellow-400' : 'text-slate-900') 
                    : (isCVIMode ? 'text-yellow-900/60' : 'text-slate-400')
                }`}>
                  {option}
                </span>

                <div className="flex flex-col items-center justify-center w-full h-full p-6 pt-12 gap-4 z-20">
                  {optData?.image && (
                    <img 
                      src={optData.image} 
                      alt={optData.text || option} 
                      className={`max-h-36 w-auto object-contain rounded-lg ${isCVIMode ? 'border-2 border-yellow-400/30 bg-black/50' : ''}`} 
                    />
                  )}
                  {optData?.text && (
                    <span className={`text-3xl font-bold text-center px-2 ${
                      currentIndex === index && isScanning 
                        ? (isCVIMode ? 'text-yellow-400' : 'text-slate-900') 
                        : (isCVIMode ? 'text-yellow-900/60' : 'text-slate-500')
                    }`}>
                      {optData.text}
                    </span>
                  )}
                  {(!optData?.image && !optData?.text) && (
                    <span className={`text-[10rem] font-black leading-none ${
                      currentIndex === index && isScanning 
                        ? (isCVIMode ? 'text-yellow-400' : 'text-slate-900') 
                        : (isCVIMode ? 'text-yellow-900/40' : 'text-slate-200')
                    }`}>
                      {option}
                    </span>
                  )}
                </div>

                {currentIndex === index && isScanning && (
                  <motion.div 
                    layoutId="highlight"
                    className={`absolute inset-0 rounded-[1.25rem] border-8 z-10 pointer-events-none ${
                      isCVIMode ? 'border-red-500' : 'border-slate-900'
                    }`}
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={handleSelect}
            disabled={!isScanning}
            className={`h-32 text-4xl font-black uppercase tracking-tighter shadow-xl ${
              isCVIMode 
                ? 'bg-yellow-400 text-black hover:bg-yellow-300 disabled:bg-yellow-900/50' 
                : 'bg-slate-900 hover:bg-slate-800 disabled:opacity-50'
            }`}
          >
            Select (Space / Enter)
          </Button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => setIsScanning(!isScanning)}
              className={`h-32 text-xl font-bold border-4 ${
                isCVIMode 
                  ? 'bg-black text-yellow-400 border-yellow-400 hover:bg-yellow-900/20' 
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isScanning ? <Pause className="mr-2 fill-current" /> : <Play className="mr-2 fill-current" />}
              {isScanning ? 'Pause' : 'Resume'}
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleNoResponse}
              className={`h-32 text-xl font-bold ${
                isCVIMode 
                  ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/40 border-2 border-yellow-900/50' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              }`}
            >
              No Response <ChevronRight className="ml-1" />
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleFinishTest}
              className={`h-32 text-xl font-bold ${
                isCVIMode 
                  ? 'bg-red-900/20 text-red-500 hover:bg-red-900/40 border-2 border-red-900/50' 
                  : 'bg-red-100 hover:bg-red-200 text-red-900'
              }`}
            >
              Discontinue
            </Button>
          </div>
        </div>

        <div className={`flex flex-col md:flex-row justify-center items-center gap-8 pt-6 border-t mt-4 ${
          isCVIMode ? 'border-yellow-900/30' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-4 w-80">
            <Label className={`text-xs font-bold uppercase whitespace-nowrap ${
              isCVIMode ? 'text-yellow-400/50' : 'text-slate-400'
            }`}>Speed: {(scanSpeed / 1000).toFixed(1)}s</Label>
            <Slider 
              value={[scanSpeed]} 
              onValueChange={(val) => setScanSpeed(Array.isArray(val) ? val[0] : val)} 
              min={500} 
              max={10000} 
              step={500}
              className="flex-1"
            />
          </div>
          <div className="flex gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsCVIMode(!isCVIMode)} 
              className={isCVIMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-400 hover:text-slate-900'}
            >
              CVI {isCVIMode ? 'On' : 'Off'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsTTSActive(!isTTSActive)} 
              className={isCVIMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-400 hover:text-slate-900'}
            >
              {isTTSActive ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
              TTS {isTTSActive ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderSplash = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="flex flex-col items-center justify-center min-h-[60vh]"
    >
      <h2 className={`text-6xl md:text-8xl font-black tracking-tighter ${isCVIMode ? 'text-yellow-400' : 'text-[#2B3990]'}`}>
        Question {currentQuestion}
      </h2>
    </motion.div>
  );

  const renderResults = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <Card className="border-2 overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-4xl font-black tracking-tight">Assessment Report</CardTitle>
              <CardDescription className="text-slate-400 text-lg">Results for {studentId}</CardDescription>
            </div>
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-slate-50 p-6 grid grid-cols-3 gap-4 border-b">
            <div className="text-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Test</p>
              <p className="font-bold text-slate-900 truncate">{testName}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Questions</p>
              <p className="font-bold text-slate-900">{responses.length} / {actualNumQuestions}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
              <p className="font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Response Log</h3>
            <div className="space-y-2">
              {responses.map((resp, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold text-slate-500">
                      {resp.questionNumber}
                    </span>
                    <span className="font-bold text-slate-900">Question {resp.questionNumber}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-slate-400 font-mono">{resp.timestamp}</span>
                    <div className="flex items-center gap-3">
                      {resp.optionText && (
                        <span className="font-bold text-slate-700 text-right max-w-[200px] truncate">
                          {resp.optionText}
                        </span>
                      )}
                      <span className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-lg font-black text-xl shrink-0">
                        {resp.option}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {responses.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No responses recorded.
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t p-6 flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={handleReset} className="flex-1 h-12 font-bold border-2">
            <RotateCcw className="mr-2 w-4 h-4" /> New Test
          </Button>
          <Button variant="outline" onClick={exportToCSV} className="flex-1 h-12 font-bold border-2">
            <Download className="mr-2 w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={() => window.print()} className="flex-1 h-12 font-bold bg-slate-900">
            <Save className="mr-2 w-4 h-4" /> Print Results
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );

  return (
    <div className={`min-h-screen p-4 md:p-8 font-sans transition-colors duration-500 ${isCVIMode ? 'bg-black text-yellow-400' : 'bg-[#f5f5f5] text-slate-900'}`}>
      <header className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl ${isCVIMode ? 'bg-yellow-400 text-black' : 'bg-slate-900 text-white'}`}>M</div>
          <h1 className="text-xl font-black tracking-tighter uppercase">Miller <span className={isCVIMode ? 'text-yellow-400/50' : 'text-slate-400'}>Scanner</span></h1>
        </div>
        {appState !== 'setup' && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500 hover:text-slate-900">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        )}
      </header>

      <main className="pb-20">
        <AnimatePresence mode="wait">
          {appState === 'setup' && renderSetup()}
          {appState === 'splash' && renderSplash()}
          {appState === 'testing' && renderTesting()}
          {appState === 'results' && renderResults()}
        </AnimatePresence>
      </main>

      <Toaster position="bottom-center" />
    </div>
  );
}
