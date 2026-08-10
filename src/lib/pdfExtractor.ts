import * as pdfjsLib from 'pdfjs-dist';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  extractedImages: {
    pageNumber: number;
    dataUrl: string;
    itemNumber?: number;
    optionLetter?: string;
  }[];
}

export async function extractPDFContent(file: File): Promise<PDFExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;

  let fullText = '';
  const extractedImages: {
    pageNumber: number;
    dataUrl: string;
    itemNumber?: number;
    optionLetter?: string;
  }[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Concatenate text items
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`;

    // Render page to canvas to allow cropping / extracting option graphics if it's an Item visual page
    // Check if page contains visual choices (e.g., "Item 1", "Item 2", "Combined Content")
    const isItemVisualPage = /Item\s*(\d+)/i.test(pageText) || /Combined Content/i.test(pageText);
    const itemMatch = pageText.match(/Item\s*(\d+)/i);
    const itemNumber = itemMatch ? parseInt(itemMatch[1], 10) : undefined;

    if (isItemVisualPage && itemNumber) {
      try {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context!,
          canvas: canvas,
          viewport: viewport
        } as any).promise;

        // Choice boxes in ULS checkpoints are horizontally arranged across the middle of the page:
        // Option A (left third), Option B (middle third), Option C (right third)
        // Usually vertical center from 30% to 80% height
        const w = canvas.width;
        const h = canvas.height;

        const options = [
          { letter: 'A', cropX: w * 0.05, cropY: h * 0.32, cropW: w * 0.28, cropH: h * 0.45 },
          { letter: 'B', cropX: w * 0.36, cropY: h * 0.32, cropW: w * 0.28, cropH: h * 0.45 },
          { letter: 'C', cropX: w * 0.67, cropY: h * 0.32, cropW: w * 0.28, cropH: h * 0.45 }
        ];

        for (const opt of options) {
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = opt.cropW;
          cropCanvas.height = opt.cropH;
          const cropCtx = cropCanvas.getContext('2d');

          if (cropCtx && context) {
            cropCtx.drawImage(
              canvas,
              opt.cropX, opt.cropY, opt.cropW, opt.cropH,
              0, 0, opt.cropW, opt.cropH
            );

            const dataUrl = cropCanvas.toDataURL('image/png');
            extractedImages.push({
              pageNumber: pageNum,
              dataUrl,
              itemNumber,
              optionLetter: opt.letter
            });
          }
        }
      } catch (err) {
        console.warn(`Could not render visual crops for page ${pageNum}:`, err);
      }
    }
  }

  return {
    text: fullText,
    pageCount,
    extractedImages
  };
}
