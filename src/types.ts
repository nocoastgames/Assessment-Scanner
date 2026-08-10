export type Response = {
  questionNumber: number;
  option: string;
  optionText?: string;
  timestamp: string;
  attempt?: number;
  isCorrect?: boolean;
};

export type AppState = 'setup' | 'splash' | 'testing' | 'results' | 'wrong-prompt';

export type AssessmentType = 'pre-test' | 'post-test' | 'standard';

export type TestOption = {
  letter: string;
  text: string;
  image: string | null;
  isCorrect?: boolean;
  isActive?: boolean;
};

export type TestQuestion = {
  id: string;
  questionText: string;
  alternatePrompt?: string;
  options: TestOption[];
};
