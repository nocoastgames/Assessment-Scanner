import fs from 'fs';

const filePath = 'src/components/ULSAssessmentManagerModal.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const replacement = `export function parseRawAssessmentText(rawText: string): TestQuestion[] {
  if (!rawText.trim()) return [];

  const blocks = rawText.split(/(?=(?:^|\\n)(?:Item\\s+\\d+|Question\\s+\\d+|\\d+\\.)\\s*[:-]?\\s*)/i).filter(b => b.trim().length > 0);
  const parsedQuestions: { questionText: string, options: string[], alternatePrompt?: string }[] = [];
  
  const questionRegex = /^(?:Item\\s+\\d+|Question\\s+\\d+|\\d+\\.)\\s*[:-]?\\s*/i;
  // Support a., a), a ., etc.
  const optionRegex = /^([a-e])\\s*[.)]\\s*(.*)/i;

  for (const block of blocks) {
     let originalLines = block.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
     if (originalLines.length === 0) continue;
     
     if (!questionRegex.test(originalLines[0])) continue;
     
     let lines: string[] = [];
     for (let line of originalLines) {
        const matches = Array.from(line.matchAll(/\\b([a-e])\\s*[.)]\\s*/ig));
        if (matches.length > 1 || (matches.length === 1 && !optionRegex.test(line))) {
            let parts = line.split(/\\b[a-e]\\s*[.)]\\s*/ig);
            let letters = matches.map(m => m[1]);
            
            if (parts[0].trim() !== '') {
               lines.push(parts[0].trim());
            }
            
            for (let j = 0; j < letters.length; j++) {
                lines.push(\`\${letters[j]}. \${parts[j + 1]?.trim() || ''}\`);
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
        optText = optText.replace(/\\(correct\\)/i, '').trim();
      }
      if (optText.includes('*')) {
        isCorrect = true;
        optText = optText.replace(/\\*/g, '').trim();
      }

      optText = optText.replace(/^[a-e]\\s*[.)]\\s*/i, '').trim();

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
        id: \`parsed-q-\${Date.now()}-\${idx}\`,
        questionText: parsed.questionText || 'Empty Question',
        alternatePrompt: parsed.alternatePrompt || parsed.questionText || 'Empty Question',
        options
      });
    }
  });

  return finalQuestions;
}`;

const startMarker = 'export function parseRawAssessmentText(rawText: string): TestQuestion[] {';
const endMarker = 'interface ULSAssessmentManagerModalProps {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement + '\n\n' + content.substring(endIndex);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Successfully updated file.');
} else {
  console.error('Could not find markers');
}
