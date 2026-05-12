import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Use a more reliable CDN for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ParsedDocument {
  content: string;
  metadata?: {
    pageCount?: number;
    fileSize: number;
    mimeType: string;
  };
}

/**
 * Parse a PDF file using pdf.js library
 * Properly extracts text from PDF documents including image-based PDFs (via OCR fallback message)
 */
async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Load the PDF document
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;

  if (pageCount === 0) {
    throw new Error('PDF has no pages');
  }

  // Process pages in PARALLEL for speed (was sequential)
  const pagePromises: Promise<{ pageNum: number; text: string; error?: string }>[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    pagePromises.push(processPage(pdf, pageNum));
  }

  // Fire all page requests in parallel
  const results = await Promise.all(pagePromises);

  // Sort by page number and combine
  results.sort((a, b) => a.pageNum - b.pageNum);

  let fullText = '';
  const errors: string[] = [];

  for (const result of results) {
    if (result.text) {
      fullText += `Page ${result.pageNum}:\n${result.text}\n\n`;
    }
    if (result.error) {
      errors.push(result.error);
    }
  }

  // Clean up the extracted text
  fullText = fullText
    .replace(/\n{3,}/g, '\n\n')  // Limit consecutive newlines
    .replace(/[ \t]+/g, ' ')       // Normalize whitespace
    .replace(/^\s+|\s+$/g, '')     // Trim start/end
    .trim();

  // Check if we got meaningful text
  if (!fullText || fullText.length < 50) {
    if (errors.length > 0) {
      throw new Error(
        `PDF appears to be mostly image-based (${errors.length} pages have no extractable text). ` +
        `Please try: 1) Converting to DOCX/TXT first, or 2) Using an OCR tool to create a text-based PDF`
      );
    }
    throw new Error('No readable text found in PDF');
  }

  // Return with warning if some pages had issues
  if (errors.length > 0 && errors.length < pageCount) {
    console.warn('PDF parsing warnings:', errors);
    return fullText + '\n\n[Note: Some pages could not be parsed - they may be image-based]';
  }

  return fullText;
}

/**
 * Process a single page - extracted for parallel execution
 */
async function processPage(pdf: any, pageNum: number): Promise<{ pageNum: number; text: string; error?: string }> {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    if (textContent.items.length > 0) {
      // Build text with proper spacing
      let pageText = '';
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if ('str' in item) {
          // Check if we need to add a newline (new line detected by Y position change)
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }
      }

      return { pageNum, text: pageText.trim() };
    }

    // Check if it's an image-based page
    const operators = await page.getOperatorList();
    let hasImage = false;

    for (let i = 0; i < operators.fnArray.length; i++) {
      if (operators.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
        hasImage = true;
        break;
      }
    }

    if (hasImage) {
      return { pageNum, text: '', error: `Page ${pageNum}: Image-based` };
    }

    return { pageNum, text: '', error: `Page ${pageNum}: No text` };
  } catch (pageError) {
    console.warn(`Error reading page ${pageNum}:`, pageError);
    return { pageNum, text: '', error: `Page ${pageNum}: Error reading` };
  }
}

/**
 * Parse a DOCX file and extract text content
 */
async function parseDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    if (result.messages.length > 0) {
      console.warn('DOCX parsing warnings:', result.messages);
    }

    return result.value.trim();
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse a PPTX file and extract text content
 */
async function parsePPTX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(arrayBuffer);

    let fullText = '';
    let slideNumber = 0;

    // Get all slide files
    const slideFiles = Object.keys(zipContent.files)
      .filter(filename => filename.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
        const bNum = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
        return aNum - bNum;
      });

    // Extract text from each slide
    for (const slideFile of slideFiles) {
      slideNumber++;
      try {
        const slideXml = await zipContent.files[slideFile].async('text');

        // Parse XML to extract text content
        const textContent = extractTextFromSlideXML(slideXml);

        if (textContent.trim()) {
          fullText += `Slide ${slideNumber}:\n${textContent}\n\n`;
        }
      } catch (slideError) {
        console.warn(`Error parsing slide ${slideNumber}:`, slideError);
        fullText += `[Error reading slide ${slideNumber}]\n\n`;
      }
    }

    // Also try to extract from notes if present
    const noteFiles = Object.keys(zipContent.files)
      .filter(filename => filename.match(/ppt\/notesSlides\/notesSlide\d+\.xml$/))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/notesSlide(\d+)\.xml$/)?.[1] || '0');
        const bNum = parseInt(b.match(/notesSlide(\d+)\.xml$/)?.[1] || '0');
        return aNum - bNum;
      });

    if (noteFiles.length > 0) {
      fullText += '\n--- Speaker Notes ---\n\n';

      for (let i = 0; i < noteFiles.length; i++) {
        try {
          const noteXml = await zipContent.files[noteFiles[i]].async('text');
          const noteText = extractTextFromSlideXML(noteXml);

          if (noteText.trim()) {
            fullText += `Slide ${i + 1} Notes:\n${noteText}\n\n`;
          }
        } catch (noteError) {
          console.warn(`Error parsing notes for slide ${i + 1}:`, noteError);
        }
      }
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error parsing PPTX:', error);
    throw new Error(`Failed to parse PPTX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text content from PowerPoint slide XML
 */
function extractTextFromSlideXML(xmlContent: string): string {
  try {
    // Remove XML tags and extract text content
    // Look for text within <a:t> tags (text runs)
    const textMatches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gs);
    let extractedText = '';

    if (textMatches) {
      for (const match of textMatches) {
        const textContent = match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
        // Decode XML entities
        const decodedText = textContent
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");

        if (decodedText.trim()) {
          extractedText += decodedText.trim() + ' ';
        }
      }
    }

    // Also look for text in other common PowerPoint text elements
    const otherTextMatches = xmlContent.match(/<w:t[^>]*>(.*?)<\/w:t>/gs);
    if (otherTextMatches) {
      for (const match of otherTextMatches) {
        const textContent = match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
        const decodedText = textContent
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");

        if (decodedText.trim()) {
          extractedText += decodedText.trim() + ' ';
        }
      }
    }

    // Clean up the text
    return extractedText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

  } catch (error) {
    console.warn('Error extracting text from slide XML:', error);
    return '';
  }
}

/**
 * Parse a text file (TXT or MD)
 */
async function parseTextFile(file: File): Promise<string> {
  try {
    const text = await file.text();
    return text.trim();
  } catch (error) {
    console.error('Error parsing text file:', error);
    throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file type from MIME type
 */
function getFileType(mimeType: string): string {
  const mimeTypeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/markdown': 'md'
  };

  return mimeTypeMap[mimeType] || 'unknown';
}

/**
 * Validate if file type is supported
 */
function isSupportedFileType(mimeType: string): boolean {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown'
  ];

  return supportedTypes.includes(mimeType);
}

/**
 * Main function to parse various document types
 * @param file - The file to parse
 * @returns Promise<string> - The extracted text content
 */
export async function parseDocument(file: File): Promise<string> {
  if (!file) {
    throw new Error('No file provided');
  }

  console.log('File type:', file.type); // Debug log

  if (!isSupportedFileType(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Supported types: PDF, DOCX, PPTX, TXT, MD`);
  }

  // Check file size (limit to 10MB)
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxFileSize) {
    throw new Error(`File size too large. Maximum allowed size is ${maxFileSize / (1024 * 1024)}MB`);
  }

  let content: string;

  try {
    switch (file.type) {
      case 'application/pdf':
        content = await parsePDF(file);
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        content = await parseDOCX(file);
        break;

      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        content = await parsePPTX(file);
        break;

      case 'text/plain':
      case 'text/markdown':
        content = await parseTextFile(file);
        break;

      default:
        throw new Error(`Unsupported file type: ${file.type}`);
    }

    // Validate that we got some content
    if (!content || content.trim().length === 0) {
      throw new Error('No text content found in the document');
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
      .trim();

    return content;

  } catch (error) {
    console.error(`Error parsing ${getFileType(file.type).toUpperCase()} file:`, error);
    throw error;
  }
}

/**
 * Parse document with additional metadata
 * @param file - The file to parse
 * @returns Promise<ParsedDocument> - The extracted content with metadata
 */
export async function parseDocumentWithMetadata(file: File): Promise<ParsedDocument> {
  const content = await parseDocument(file);

  const metadata = {
    fileSize: file.size,
    mimeType: file.type
  };

  return {
    content,
    metadata
  };
}

export default parseDocument;
