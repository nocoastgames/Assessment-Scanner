import { useState, useEffect, useRef, useCallback } from 'react';
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
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// --- Types ---
type Response = {
  questionNumber: number;
  option: string;
  timestamp: string;
};

type AppState = 'setup' | 'testing' | 'results';

// --- Constants ---
const OPTIONS = ['A', 'B', 'C'];
const CLICK_SAFEGUARD_MS = 1000; // 1 second lockout between clicks

export default function App() {
  // --- State ---
  const [appState, setAppState] = useState<AppState>('setup');
  const [testName, setTestName] = useState('Nevada Alternate Assessment');
  const [numQuestions, setNumQuestions] = useState(10);
  const [studentId, setStudentId] = useState('');
  const [scanSpeed, setScanSpeed] = useState(5000); // Default to 5 seconds per option
  const [isTTSActive, setIsTTSActive] = useState(true);
  const [isCVIMode, setIsCVIMode] = useState(false);
  const [timeLimit, setTimeLimit] = useState(0); // 0 means no limit (minutes)
  
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const [timeLeft, setTimeLeft] = useState(0); // seconds

  const lastClickTime = useRef(0);
  const scanInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

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
    if (isScanning && appState === 'testing') {
      scanInterval.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % OPTIONS.length);
      }, scanSpeed);
    } else {
      if (scanInterval.current) clearInterval(scanInterval.current);
    }
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, [isScanning, scanSpeed, appState]);

  // --- Voice Sync Logic ---
  useEffect(() => {
    if (isScanning && appState === 'testing') {
      speak(OPTIONS[currentIndex]);
    }
  }, [currentIndex, isScanning, appState, speak]);

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

  // --- Handlers ---
  const handleStartTest = () => {
    if (!studentId.trim()) {
      toast.error('Please enter a student identifier');
      return;
    }
    setResponses([]);
    setCurrentQuestion(1);
    setCurrentIndex(0);
    setAppState('testing');
    setIsScanning(true);
  };

  const handleSelect = () => {
    const now = Date.now();
    if (now - lastClickTime.current < CLICK_SAFEGUARD_MS) {
      return; // Safeguard against rapid clicks
    }
    lastClickTime.current = now;

    const selectedOption = OPTIONS[currentIndex];
    const newResponse: Response = {
      questionNumber: currentQuestion,
      option: selectedOption,
      timestamp: new Date().toLocaleTimeString(),
    };

    setResponses((prev) => [...prev, newResponse]);
    setIsScanning(false);
    speak(`${selectedOption} selected.`);
    toast.success(`Question ${currentQuestion}: Selected ${selectedOption}`);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < numQuestions) {
      setCurrentQuestion((prev) => prev + 1);
      setCurrentIndex(0);
      setIsScanning(true);
    } else {
      handleFinishTest();
    }
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
      className="max-w-2xl mx-auto space-y-6"
    >
      <Card className="border-2">
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Settings className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Configuration</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Test Setup</CardTitle>
          <CardDescription>Configure the assessment parameters for the student.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
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

  const renderTesting = () => (
    <div className={`max-w-4xl mx-auto space-y-6 ${isCVIMode ? 'p-8 rounded-3xl bg-black' : ''}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div className="space-y-1">
          <h2 className={`text-2xl font-bold ${isCVIMode ? 'text-yellow-400' : 'text-slate-900'}`}>{testName}</h2>
          <div className={`flex items-center gap-4 text-sm ${isCVIMode ? 'text-yellow-400/70' : 'text-slate-500'}`}>
            <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {studentId}</span>
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> Question {currentQuestion} of {numQuestions}</span>
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

      <Progress value={(currentQuestion / numQuestions) * 100} className={`h-2 ${isCVIMode ? 'bg-yellow-900/30' : 'bg-slate-100'}`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
        {OPTIONS.map((option, index) => (
          <motion.div
            key={option}
            animate={{
              scale: currentIndex === index && isScanning ? 1.1 : 1,
              borderColor: currentIndex === index && isScanning 
                ? (isCVIMode ? '#ef4444' : '#0f172a') 
                : (isCVIMode ? '#451a03' : '#e2e8f0'),
              backgroundColor: currentIndex === index && isScanning 
                ? (isCVIMode ? '#000000' : '#f8fafc') 
                : (isCVIMode ? '#000000' : '#ffffff'),
            }}
            className={`relative h-80 rounded-3xl border-8 flex items-center justify-center transition-colors shadow-sm`}
          >
            <span className={`text-[12rem] font-black leading-none ${
              currentIndex === index && isScanning 
                ? (isCVIMode ? 'text-yellow-400' : 'text-slate-900') 
                : (isCVIMode ? 'text-yellow-900/40' : 'text-slate-200')
            }`}>
              {option}
            </span>
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
        ))}
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
        <div className="grid grid-cols-2 gap-4">
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
            onClick={handleNextQuestion}
            disabled={isScanning || responses.length < currentQuestion}
            className={`h-32 text-xl font-bold ${
              isCVIMode 
                ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/40 border-2 border-yellow-900/50' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
            }`}
          >
            Next <ChevronRight className="ml-1" />
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
              <p className="font-bold text-slate-900">{responses.length} / {numQuestions}</p>
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
                    <span className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-lg font-black text-xl">
                      {resp.option}
                    </span>
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
        <CardFooter className="bg-slate-50 border-t p-6 flex gap-4">
          <Button variant="outline" onClick={handleReset} className="flex-1 h-12 font-bold border-2">
            <RotateCcw className="mr-2 w-4 h-4" /> New Test
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
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
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
          {appState === 'testing' && renderTesting()}
          {appState === 'results' && renderResults()}
        </AnimatePresence>
      </main>

      <Toaster position="bottom-center" />
    </div>
  );
}
