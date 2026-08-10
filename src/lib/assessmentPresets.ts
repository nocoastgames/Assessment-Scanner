import { TestQuestion } from '../types';

export const ULS_UNIT1_CHECKPOINT_QUESTIONS: TestQuestion[] = [
  {
    id: 'uls-u1-item-1',
    questionText: 'Leo walks to school. Who is Leo?',
    alternatePrompt: 'Who is Leo?',
    options: [
      { letter: 'A', text: 'Leo', image: null, isCorrect: true, isActive: true },
      { letter: 'B', text: 'teachers', image: null, isCorrect: false, isActive: true },
      { letter: 'C', text: 'Keisha', image: null, isCorrect: false, isActive: true },
    ]
  },
  {
    id: 'uls-u1-item-2',
    questionText: 'Leo and Gabby walk in the crosswalk. Where do Leo and Gabby walk?',
    alternatePrompt: 'Where do Leo and Gabby walk?',
    options: [
      { letter: 'A', text: 'house', image: null, isCorrect: false, isActive: true },
      { letter: 'B', text: 'crosswalk', image: null, isCorrect: true, isActive: true },
      { letter: 'C', text: 'park', image: null, isCorrect: false, isActive: true },
    ]
  },
  {
    id: 'uls-u1-item-3',
    questionText: 'The cars stop for the school bus. Find the school bus.',
    alternatePrompt: 'Find the school bus.',
    options: [
      { letter: 'A', text: 'car', image: null, isCorrect: false, isActive: true },
      { letter: 'B', text: 'sidewalk', image: null, isCorrect: false, isActive: true },
      { letter: 'C', text: 'school bus', image: null, isCorrect: true, isActive: true },
    ]
  },
  {
    id: 'uls-u1-item-4',
    questionText: 'Leo and Gabby will wait for the walk sign to cross the street. What will Leo and Gabby do?',
    alternatePrompt: 'What will Leo and Gabby do?',
    options: [
      { letter: 'A', text: 'run', image: null, isCorrect: false, isActive: true },
      { letter: 'B', text: 'wait', image: null, isCorrect: true, isActive: true },
      { letter: 'C', text: 'sleep', image: null, isCorrect: false, isActive: true },
    ]
  },
  {
    id: 'uls-u1-item-5',
    questionText: 'Keisha has 2 folders. Show me 2 folders.',
    alternatePrompt: 'Show me 2 folders.',
    options: [
      { letter: 'A', text: '2 folders', image: null, isCorrect: true, isActive: true },
      { letter: 'B', text: '3 desks', image: null, isCorrect: false, isActive: true },
      { letter: 'C', text: '1 chair', image: null, isCorrect: false, isActive: true },
    ]
  },
  {
    id: 'uls-u1-item-6',
    questionText: 'Randy cleans 4 desks. How many desks does Randy clean?',
    alternatePrompt: 'How many desks does Randy clean?',
    options: [
      { letter: 'A', text: '9', image: null, isCorrect: false, isActive: true },
      { letter: 'B', text: '5', image: null, isCorrect: false, isActive: true },
      { letter: 'C', text: '4', image: null, isCorrect: true, isActive: true },
    ]
  }
];

export function parseRawAssessmentText(rawText: string): TestQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: TestQuestion[] = [];
  let currentQ: Partial<TestQuestion> | null = null;
  let optionIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line starts a new Item or Question (e.g., "Item 1", "Question 2", "1.", "Item 1:")
    const qMatch = line.match(/^(?:Item|Question|Q)?\s*(\d+)[:\.\)]?\s*(.*)/i);
    if (qMatch && (line.toLowerCase().startsWith('item') || line.toLowerCase().startsWith('question') || line.toLowerCase().startsWith('q') || /^\d+[\.\)]/.test(line))) {
      if (currentQ && currentQ.options && currentQ.options.length > 0) {
        questions.push(currentQ as TestQuestion);
      }

      const qNum = parseInt(qMatch[1], 10);
      const rest = qMatch[2] || '';

      currentQ = {
        id: `parsed-q-${Date.now()}-${qNum}`,
        questionText: rest,
        alternatePrompt: '',
        options: []
      };
      optionIndex = 0;
      continue;
    }

    if (!currentQ) {
      currentQ = {
        id: `parsed-q-${Date.now()}-1`,
        questionText: '',
        alternatePrompt: '',
        options: []
      };
      optionIndex = 0;
    }

    // Check for Alternate Prompt / Attempt 2 (e.g. "Attempt 2: Find the bus", "Alt: ...")
    if (line.toLowerCase().includes('attempt 2') || line.toLowerCase().startsWith('alt:') || line.toLowerCase().startsWith('prompt 2:')) {
      const altContent = line.replace(/^(?:attempt 2|alt|prompt 2)[:\.\s]*/i, '').trim();
      currentQ.alternatePrompt = altContent;
      continue;
    }

    // Check for Options (e.g., "a. house", "b. crosswalk (correct)", "A) car", "*c. school bus")
    const optMatch = line.match(/^[\*\-]?\s*([a-cA-C1-3])[\.\)]\s*(.*)/);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase();
      const rawOptText = optMatch[2];
      const isCorrect = line.includes('*') || rawOptText.toLowerCase().includes('(correct)') || rawOptText.toLowerCase().includes('[correct]') || rawOptText.toLowerCase().includes('correct in bold');
      const cleanOptText = rawOptText.replace(/\s*[\(\[]correct[\)\]]/gi, '').trim();

      const optionLetter = ['A', 'B', 'C'][optionIndex] || letter;

      currentQ.options = currentQ.options || [];
      currentQ.options.push({
        letter: optionLetter,
        text: cleanOptText,
        image: null,
        isCorrect: isCorrect,
        isActive: true
      });
      optionIndex++;
      continue;
    }

    // If no questionText yet, concatenate line
    if (!currentQ.questionText) {
      currentQ.questionText = line;
    } else if (!currentQ.options || currentQ.options.length === 0) {
      currentQ.questionText += ' ' + line;
    }
  }

  if (currentQ && currentQ.options && currentQ.options.length > 0) {
    questions.push(currentQ as TestQuestion);
  }

  return questions;
}
