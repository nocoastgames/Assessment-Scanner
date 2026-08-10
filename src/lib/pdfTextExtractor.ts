import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to use the local worker script
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    let pageText = '';
    for (const item of textContent.items) {
      if ('str' in item) {
        pageText += item.str;
        if (item.hasEOL) {
          pageText += '\n';
        } else if (item.str.trim() !== '') {
          // If not EOL, ensure there's a space so words don't run together
          if (!pageText.endsWith(' ')) {
             pageText += ' ';
          }
        }
      }
    }
    
    fullText += pageText + '\n\n';
  }
  
  return fullText;
}
