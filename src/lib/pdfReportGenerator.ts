import { jsPDF } from 'jspdf';
import { Response, AssessmentType, TestQuestion } from '../types';

interface PDFReportData {
  studentId: string;
  testName: string;
  assessmentType?: AssessmentType;
  questions?: TestQuestion[];
  responses: Response[];
  dateString?: string;
}

export function generateAssessmentPDF({
  studentId,
  testName,
  assessmentType = 'pre-test',
  questions = [],
  responses,
  dateString = new Date().toLocaleDateString()
}: PDFReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor: [number, number, number] = [43, 57, 144]; // #2B3990
  const slateDark: [number, number, number] = [15, 23, 42];
  const slateMuted: [number, number, number] = [100, 116, 139];
  const slateLight: [number, number, number] = [241, 245, 249];
  const emeraldColor: [number, number, number] = [16, 185, 129];
  const redColor: [number, number, number] = [239, 68, 68];

  // Calculate statistics
  const totalQuestions = questions.length > 0 ? questions.length : Math.max(responses.length, 1);
  const correctCount = responses.filter(r => r.isCorrect).length;
  const attempt1Correct = responses.filter(r => r.isCorrect && (r.attempt === 1 || !r.attempt)).length;
  const attempt2Correct = responses.filter(r => r.isCorrect && r.attempt === 2).length;
  const noResponseCount = responses.filter(r => r.option === 'NR' || r.optionText === 'No Response').length;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);

  // --- Header Banner ---
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, 35, contentWidth, 70, 8, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MILLER SCANNER ASSESSMENT REPORT', margin + 16, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Unique Learning System & Switch Assessment Checkpoint`, margin + 16, 82);

  const cleanDate = new Date().toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.setFontSize(9);
  doc.text(`Generated: ${cleanDate}`, pageWidth - margin - 16, 82, { align: 'right' });

  // --- Student & Assessment Info Card ---
  let y = 120;
  doc.setFillColor(...slateLight);
  doc.roundedRect(margin, y, contentWidth, 75, 6, 6, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 75, 6, 6, 'S');

  // Column 1: Student & Assessment
  doc.setTextColor(...slateDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('STUDENT IDENTIFIER', margin + 14, y + 20);
  doc.setFontSize(13);
  doc.text(studentId || 'Anonymous / Not Specified', margin + 14, y + 36);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ASSESSMENT NAME', margin + 14, y + 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(testName || 'Standard Switch Assessment', margin + 14, y + 66);

  // Column 2: Mode & Type
  const col2X = margin + contentWidth * 0.45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ASSESSMENT TYPE', col2X, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const formattedType = assessmentType ? assessmentType.toUpperCase() : 'STANDARD';
  doc.text(formattedType, col2X, y + 36);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATE RECORDED', col2X, y + 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(dateString, col2X, y + 66);

  // Column 3: Overall Score Badge
  const col3X = pageWidth - margin - 90;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(col3X - 10, y + 10, 90, 55, 6, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(col3X - 10, y + 10, 90, 55, 6, 6, 'S');

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`${scorePercent}%`, col3X + 35, y + 36, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(...slateMuted);
  doc.text(`${correctCount}/${totalQuestions} Correct`, col3X + 35, y + 52, { align: 'center' });

  // --- Performance Breakdown Stats Bar ---
  y += 90;
  const statBoxWidth = (contentWidth - 18) / 4;
  const stats = [
    { label: 'Total Items', value: `${totalQuestions}` },
    { label: 'Attempt 1 Correct', value: `${attempt1Correct}` },
    { label: 'Attempt 2 Correct', value: `${attempt2Correct}` },
    { label: 'No Response / Missed', value: `${noResponseCount}` }
  ];

  stats.forEach((st, idx) => {
    const boxX = margin + idx * (statBoxWidth + 6);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(boxX, y, statBoxWidth, 42, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(boxX, y, statBoxWidth, 42, 4, 4, 'S');

    doc.setTextColor(...slateMuted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(st.label.toUpperCase(), boxX + statBoxWidth / 2, y + 16, { align: 'center' });

    doc.setTextColor(...slateDark);
    doc.setFontSize(13);
    doc.text(st.value, boxX + statBoxWidth / 2, y + 33, { align: 'center' });
  });

  // --- Response Log Table ---
  y += 58;
  doc.setTextColor(...slateDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DETAILED ITEM RESPONSES', margin, y);

  y += 10;
  // Table Header
  doc.setFillColor(...slateDark);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');

  doc.text('ITEM #', margin + 10, y + 14);
  doc.text('QUESTION / PROMPT', margin + 55, y + 14);
  doc.text('SELECTED ANSWER', margin + contentWidth * 0.58, y + 14);
  doc.text('ATTEMPT', margin + contentWidth * 0.78, y + 14);
  doc.text('RESULT', margin + contentWidth - 40, y + 14, { align: 'right' });

  y += 22;

  // Rows
  const rowHeight = 26;
  if (responses.length === 0) {
    doc.setTextColor(...slateMuted);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('No student responses were recorded for this session.', margin + 15, y + 25);
  } else {
    responses.forEach((resp, rIdx) => {
      // Check page overflow
      if (y + rowHeight > pageHeight - 50) {
        doc.addPage();
        y = 40;
        // Repeat minimal table header on next page
        doc.setFillColor(...slateDark);
        doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('ITEM #', margin + 10, y + 13);
        doc.text('QUESTION / PROMPT', margin + 55, y + 13);
        doc.text('SELECTED ANSWER', margin + contentWidth * 0.58, y + 13);
        doc.text('ATTEMPT', margin + contentWidth * 0.78, y + 13);
        doc.text('RESULT', margin + contentWidth - 40, y + 13, { align: 'right' });
        y += 20;
      }

      // Alternate row background
      if (rIdx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      // Item #
      doc.setTextColor(...slateDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Q${resp.questionNumber}`, margin + 10, y + 16);

      // Question Text / Prompt
      const qObj = questions[resp.questionNumber - 1];
      const qText = qObj?.questionText || `Question ${resp.questionNumber}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const truncatedQText = qText.length > 42 ? qText.substring(0, 40) + '...' : qText;
      doc.text(truncatedQText, margin + 55, y + 16);

      // Selected Answer
      const optText = resp.optionText ? `${resp.option}. ${resp.optionText}` : resp.option;
      const truncatedOpt = optText.length > 22 ? optText.substring(0, 20) + '...' : optText;
      doc.setFont('helvetica', 'bold');
      doc.text(truncatedOpt, margin + contentWidth * 0.58, y + 16);

      // Attempt
      doc.setFont('helvetica', 'normal');
      doc.text(`Attempt ${resp.attempt || 1}`, margin + contentWidth * 0.78, y + 16);

      // Result Badge
      if (resp.isCorrect) {
        doc.setTextColor(...emeraldColor);
        doc.setFont('helvetica', 'bold');
        doc.text('CORRECT', margin + contentWidth - 15, y + 16, { align: 'right' });
      } else if (resp.option === 'NR' || resp.optionText === 'No Response') {
        doc.setTextColor(...slateMuted);
        doc.setFont('helvetica', 'normal');
        doc.text('NO RESP', margin + contentWidth - 15, y + 16, { align: 'right' });
      } else {
        doc.setTextColor(...redColor);
        doc.setFont('helvetica', 'bold');
        doc.text('INCORRECT', margin + contentWidth - 15, y + 16, { align: 'right' });
      }

      // Row separator
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      y += rowHeight;
    });
  }

  // --- Sign-off / Notes Section ---
  if (y + 60 < pageHeight - 40) {
    y += 25;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, margin + 200, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slateMuted);
    doc.text("Instructor / Evaluator Signature", margin, y + 12);

    doc.line(margin + 240, y, margin + 440, y);
    doc.text("Date Reviewed", margin + 240, y + 12);
  }

  // Save the PDF
  const sanitizedStudent = (studentId || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedTest = (testName || 'Assessment').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Miller_Report_${sanitizedStudent}_${sanitizedTest}.pdf`;

  doc.save(fileName);
  return fileName;
}
