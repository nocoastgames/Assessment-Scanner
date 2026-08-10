import { TestQuestion, AssessmentType } from '../types';

export interface ULSAssessment {
  id: string;
  title: string;
  gradeBand: 'Elementary' | 'Intermediate' | 'Middle School' | 'High School';
  unitNumber: number;
  level: 1 | 2 | 3;
  assessmentType: AssessmentType;
  description: string;
  questions: TestQuestion[];
  createdAt: string;
  isBuiltIn?: boolean;
}

// Built-in ULS Checkpoint Questions (Saved in code)
export const BUILTIN_ULS_ASSESSMENTS: ULSAssessment[] = [
  {
    id: 'uls-hs-u1-l1-pre',
    title: 'High School Unit 1 Level 1 Checkpoint - Pre-Test',
    gradeBand: 'High School',
    unitNumber: 1,
    level: 1,
    assessmentType: 'pre-test',
    description: 'Unique Learning System High School Unit 1 Level 1 Checkpoints baseline assessment.',
    createdAt: '2026-08-10',
    isBuiltIn: true,
    questions: [
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
    ]
  },
  {
    id: 'uls-hs-u1-l1-post',
    title: 'High School Unit 1 Level 1 Checkpoint - Post-Test',
    gradeBand: 'High School',
    unitNumber: 1,
    level: 1,
    assessmentType: 'post-test',
    description: 'Unique Learning System High School Unit 1 Level 1 Checkpoints post-instruction growth assessment.',
    createdAt: '2026-08-10',
    isBuiltIn: true,
    questions: [
      {
        id: 'uls-u1-post-item-1',
        questionText: 'Gabby walks to the park. Who walks to the park?',
        alternatePrompt: 'Who walks to the park?',
        options: [
          { letter: 'A', text: 'teachers', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: 'Gabby', image: null, isCorrect: true, isActive: true },
          { letter: 'C', text: 'Leo', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u1-post-item-2',
        questionText: 'Leo and Gabby see the traffic light at school. Where do they see the traffic light?',
        alternatePrompt: 'Where do they see the traffic light?',
        options: [
          { letter: 'A', text: 'school', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'park', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'house', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u1-post-item-3',
        questionText: 'The students walk on the sidewalk. Find the sidewalk.',
        alternatePrompt: 'Find the sidewalk.',
        options: [
          { letter: 'A', text: 'sidewalk', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'car', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'school bus', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u1-post-item-4',
        questionText: 'Leo and Gabby run across the playground. What do Leo and Gabby do?',
        alternatePrompt: 'What do Leo and Gabby do?',
        options: [
          { letter: 'A', text: 'sleep', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: 'run', image: null, isCorrect: true, isActive: true },
          { letter: 'C', text: 'wait', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u1-post-item-5',
        questionText: 'Randy cleans 3 desks. Show me 3 desks.',
        alternatePrompt: 'Show me 3 desks.',
        options: [
          { letter: 'A', text: '2 folders', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: '3 desks', image: null, isCorrect: true, isActive: true },
          { letter: 'C', text: '1 chair', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u1-post-item-6',
        questionText: 'Keisha holds 1 folder. How many folders does Keisha hold?',
        alternatePrompt: 'How many folders does Keisha hold?',
        options: [
          { letter: 'A', text: '1', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: '5', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: '9', image: null, isCorrect: false, isActive: true },
        ]
      }
    ]
  },
  {
    id: 'uls-hs-u2-l1-pre',
    title: 'High School Unit 2 Level 1 Checkpoint - Pre-Test',
    gradeBand: 'High School',
    unitNumber: 2,
    level: 1,
    assessmentType: 'pre-test',
    description: 'Unique Learning System High School Unit 2 Level 1 Checkpoints baseline assessment.',
    createdAt: '2026-08-10',
    isBuiltIn: true,
    questions: [
      {
        id: 'uls-u2-pre-1',
        questionText: 'Sarah works at the library. Who works at the library?',
        alternatePrompt: 'Who works at the library?',
        options: [
          { letter: 'A', text: 'Sarah', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'custodian', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'doctor', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u2-pre-2',
        questionText: 'They organize books on the shelf. Where do they organize books?',
        alternatePrompt: 'Where do they organize books?',
        options: [
          { letter: 'A', text: 'table', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: 'shelf', image: null, isCorrect: true, isActive: true },
          { letter: 'C', text: 'desk', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u2-pre-3',
        questionText: 'Find the computer.',
        alternatePrompt: 'Find the computer.',
        options: [
          { letter: 'A', text: 'book', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: 'pencil', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'computer', image: null, isCorrect: true, isActive: true },
        ]
      },
      {
        id: 'uls-u2-pre-4',
        questionText: 'Sarah scans the library card. What does Sarah do?',
        alternatePrompt: 'What does Sarah do?',
        options: [
          { letter: 'A', text: 'scans card', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'eats lunch', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'sings', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u2-pre-5',
        questionText: 'Sarah has 5 books. Show me 5 books.',
        alternatePrompt: 'Show me 5 books.',
        options: [
          { letter: 'A', text: '2 books', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: '5 books', image: null, isCorrect: true, isActive: true },
          { letter: 'C', text: '1 book', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u2-pre-6',
        questionText: 'How many cards are on the table?',
        alternatePrompt: 'How many cards?',
        options: [
          { letter: 'A', text: '3', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: '7', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: '10', image: null, isCorrect: false, isActive: true },
        ]
      }
    ]
  },
  {
    id: 'uls-hs-u2-l1-post',
    title: 'High School Unit 2 Level 1 Checkpoint - Post-Test',
    gradeBand: 'High School',
    unitNumber: 2,
    level: 1,
    assessmentType: 'post-test',
    description: 'Unique Learning System High School Unit 2 Level 1 Checkpoints post-test assessment.',
    createdAt: '2026-08-10',
    isBuiltIn: true,
    questions: [
      {
        id: 'uls-u2-post-1',
        questionText: 'John stacks boxes at the store. Who stacks boxes?',
        alternatePrompt: 'Who stacks boxes?',
        options: [
          { letter: 'A', text: 'John', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'police officer', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'bus driver', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u2-post-2',
        questionText: 'John stacks boxes in the store. Where does John stack boxes?',
        alternatePrompt: 'Where does John stack boxes?',
        options: [
          { letter: 'A', text: 'park', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: 'store', image: null, isCorrect: true, isActive: true },
          { letter: 'C', text: 'home', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u2-post-3',
        questionText: 'Find the shopping cart.',
        alternatePrompt: 'Find the shopping cart.',
        options: [
          { letter: 'A', text: 'shelf', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: 'box', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'shopping cart', image: null, isCorrect: true, isActive: true },
        ]
      },
      {
        id: 'uls-u2-post-4',
        questionText: 'John wipes the counter clean. What does John do?',
        alternatePrompt: 'What does John do?',
        options: [
          { letter: 'A', text: 'wipes counter', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'sleeps', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'runs away', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u2-post-5',
        questionText: 'Show me 4 carts.',
        alternatePrompt: 'Show me 4 carts.',
        options: [
          { letter: 'A', text: '1 cart', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: '4 carts', image: null, isCorrect: true, isActive: true },
          { letter: 'C', text: '8 carts', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-u2-post-6',
        questionText: 'How many boxes does John carry?',
        alternatePrompt: 'How many boxes?',
        options: [
          { letter: 'A', text: '2', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: '6', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: '9', image: null, isCorrect: false, isActive: true },
        ]
      }
    ]
  },
  {
    id: 'uls-ms-u1-l1-pre',
    title: 'Middle School Unit 1 Level 1 Checkpoint - Pre-Test',
    gradeBand: 'Middle School',
    unitNumber: 1,
    level: 1,
    assessmentType: 'pre-test',
    description: 'Unique Learning System Middle School Unit 1 Level 1 Checkpoints baseline assessment.',
    createdAt: '2026-08-10',
    isBuiltIn: true,
    questions: [
      {
        id: 'uls-ms-pre-1',
        questionText: 'Maya reads a book in class. Who reads a book?',
        alternatePrompt: 'Who reads a book?',
        options: [
          { letter: 'A', text: 'Maya', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'principal', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'coach', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-ms-pre-2',
        questionText: 'Maya sits at her desk. Where does Maya sit?',
        alternatePrompt: 'Where does Maya sit?',
        options: [
          { letter: 'A', text: 'bus', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: 'desk', image: null, isCorrect: true, isActive: true },
          { letter: 'C', text: 'cafeteria', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-ms-pre-3',
        questionText: 'Find the notebook.',
        alternatePrompt: 'Find the notebook.',
        options: [
          { letter: 'A', text: 'ruler', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: 'crayon', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'notebook', image: null, isCorrect: true, isActive: true },
        ]
      },
      {
        id: 'uls-ms-pre-4',
        questionText: 'Maya writes her name. What does Maya do?',
        alternatePrompt: 'What does Maya do?',
        options: [
          { letter: 'A', text: 'writes name', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'dances', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'cooks', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-ms-pre-5',
        questionText: 'Show me 3 pencils.',
        alternatePrompt: 'Show me 3 pencils.',
        options: [
          { letter: 'A', text: '3 pencils', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: '6 markers', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: '1 eraser', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-ms-pre-6',
        questionText: 'How many markers are on the table?',
        alternatePrompt: 'How many markers?',
        options: [
          { letter: 'A', text: '2', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: '5', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: '8', image: null, isCorrect: false, isActive: true },
        ]
      }
    ]
  },
  {
    id: 'uls-elem-u1-l1-pre',
    title: 'Elementary Unit 1 Level 1 Checkpoint - Pre-Test',
    gradeBand: 'Elementary',
    unitNumber: 1,
    level: 1,
    assessmentType: 'pre-test',
    description: 'Unique Learning System Elementary Unit 1 Level 1 Checkpoints baseline assessment.',
    createdAt: '2026-08-10',
    isBuiltIn: true,
    questions: [
      {
        id: 'uls-elem-pre-1',
        questionText: 'Tim plays with blocks. Who plays with blocks?',
        alternatePrompt: 'Who plays with blocks?',
        options: [
          { letter: 'A', text: 'Tim', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'teacher', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'nurse', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-elem-pre-2',
        questionText: 'Tim plays in the playroom. Where does Tim play?',
        alternatePrompt: 'Where does Tim play?',
        options: [
          { letter: 'A', text: 'playroom', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'kitchen', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'car', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-elem-pre-3',
        questionText: 'Find the red block.',
        alternatePrompt: 'Find the block.',
        options: [
          { letter: 'A', text: 'ball', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: 'doll', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'red block', image: null, isCorrect: true, isActive: true },
        ]
      },
      {
        id: 'uls-elem-pre-4',
        questionText: 'Tim builds a tower. What does Tim do?',
        alternatePrompt: 'What does Tim do?',
        options: [
          { letter: 'A', text: 'builds tower', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: 'paints wall', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: 'sleeps', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-elem-pre-5',
        questionText: 'Show me 2 blocks.',
        alternatePrompt: 'Show me 2 blocks.',
        options: [
          { letter: 'A', text: '1 ball', image: null, isCorrect: false, isActive: true },
          { letter: 'B', text: '2 blocks', image: null, isCorrect: true, isActive: true },
          { letter: 'C', text: '4 cars', image: null, isCorrect: false, isActive: true },
        ]
      },
      {
        id: 'uls-elem-pre-6',
        questionText: 'How many blocks are in the tower?',
        alternatePrompt: 'How many blocks?',
        options: [
          { letter: 'A', text: '3', image: null, isCorrect: true, isActive: true },
          { letter: 'B', text: '6', image: null, isCorrect: false, isActive: true },
          { letter: 'C', text: '9', image: null, isCorrect: false, isActive: true },
        ]
      }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'miller_scanner_uls_history_v1';

// Retrieve all ULS assessments (Built-in + User saved in LocalStorage)
export function getULSLibrary(): ULSAssessment[] {
  if (typeof window === 'undefined') return BUILTIN_ULS_ASSESSMENTS;

  try {
    const customData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!customData) return BUILTIN_ULS_ASSESSMENTS;

    const parsed: ULSAssessment[] = JSON.parse(customData);
    
    // Combine built-in presets with user saved items (avoid duplicates by ID)
    const builtInIds = new Set(BUILTIN_ULS_ASSESSMENTS.map(a => a.id));
    const userCustomOnly = parsed.filter(a => !builtInIds.has(a.id));

    return [...BUILTIN_ULS_ASSESSMENTS, ...userCustomOnly];
  } catch (e) {
    console.error('Error reading ULS library from storage:', e);
    return BUILTIN_ULS_ASSESSMENTS;
  }
}

// Save a custom or imported ULS assessment into local code/storage
export function saveULSAssessment(assessment: ULSAssessment): ULSAssessment[] {
  if (typeof window === 'undefined') return BUILTIN_ULS_ASSESSMENTS;

  try {
    const currentLibrary = getULSLibrary();
    
    // Check if updating existing
    const existingIndex = currentLibrary.findIndex(a => a.id === assessment.id);
    let updated: ULSAssessment[];

    if (existingIndex >= 0) {
      updated = [...currentLibrary];
      updated[existingIndex] = { ...assessment, isBuiltIn: false };
    } else {
      updated = [assessment, ...currentLibrary];
    }

    // Save only user custom/modified items to localStorage
    const customToSave = updated.filter(a => !a.isBuiltIn);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customToSave));

    return getULSLibrary();
  } catch (e) {
    console.error('Error saving ULS assessment:', e);
    return getULSLibrary();
  }
}

// Delete a custom ULS assessment from local library
export function deleteULSAssessment(id: string): ULSAssessment[] {
  if (typeof window === 'undefined') return BUILTIN_ULS_ASSESSMENTS;

  try {
    const currentLibrary = getULSLibrary();
    const updated = currentLibrary.filter(a => a.id !== id || a.isBuiltIn);

    const customToSave = updated.filter(a => !a.isBuiltIn);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customToSave));

    return getULSLibrary();
  } catch (e) {
    console.error('Error deleting ULS assessment:', e);
    return getULSLibrary();
  }
}

// Export ULS Library to a JSON file download
export function exportULSLibraryJSON(): void {
  if (typeof window === 'undefined') return;

  const library = getULSLibrary();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(library, null, 2));
  
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `ULS_Assessment_History_Library_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Import JSON file string into ULS Library
export function importULSLibraryJSON(jsonString: string): ULSAssessment[] {
  try {
    const imported: ULSAssessment[] = JSON.parse(jsonString);
    if (!Array.isArray(imported)) {
      throw new Error('Invalid JSON format: Expected an array of assessments');
    }

    let library = getULSLibrary();

    for (const item of imported) {
      if (item.title && Array.isArray(item.questions)) {
        const cleanItem: ULSAssessment = {
          id: item.id || `uls-imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: item.title,
          gradeBand: item.gradeBand || 'High School',
          unitNumber: item.unitNumber || 1,
          level: item.level || 1,
          assessmentType: item.assessmentType || 'pre-test',
          description: item.description || 'Imported ULS Assessment',
          questions: item.questions,
          createdAt: item.createdAt || new Date().toISOString().slice(0, 10),
          isBuiltIn: false
        };
        library = saveULSAssessment(cleanItem);
      }
    }

    return library;
  } catch (e) {
    console.error('Failed to import ULS JSON:', e);
    throw e;
  }
}
