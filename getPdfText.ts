import * as pdfjsLib from 'pdfjs-dist';
import fs from 'fs';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// We don't have the user's PDF file directly on disk, it was uploaded in the browser.
// But we have the screenshot which shows exactly what it looks like.
