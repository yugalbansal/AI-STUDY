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
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}import * as mammoth from 'mammoth';
import JSZip from 'jszip';

export interface ParsedDocument {
  content: string;
  metadata?: {
    pageCount?: number;
    fileSize: number;
    mimeType: string;
  };
}

/**
 * Parse a PDF file using a simple approach without external workers
 * This is a basic implementation that attempts to extract text
 */
async function parsePDF(file: File): Promise<string> {
  try {
    // For now, we'll use a simple approach that works reliably
    // This attempts to extract text using basic PDF parsing
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to string to search for text content
    let text = '';
    let textStarted = false;
    
    // Simple text extraction - look for text objects in PDF
    const decoder = new TextDecoder('latin1');
    const pdfString = decoder.decode(uint8Array);
    
    // Look for text streams in the PDF
    const textRegex = /BT\s+.*?ET/gs;
    const matches = pdfString.match(textRegex);
    
    if (matches) {
      for (const match of matches) {
        // Extract text from PDF text objects
        const textCommands = match.match(/\((.*?)\)\s*Tj/g);
        if (textCommands) {
          for (const cmd of textCommands) {
            const textMatch = cmd.match(/\((.*?)\)/);
            if (textMatch && textMatch[1]) {
              text += textMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r') + ' ';
            }
          }
        }
        
        // Also look for show text commands
        const showCommands = match.match(/\[(.*?)\]\s*TJ/g);
        if (showCommands) {
          for (const cmd of showCommands) {
            const arrayMatch = cmd.match(/\[(.*?)\]/);
            if (arrayMatch && arrayMatch[1]) {
              // Parse the array content
              const arrayContent = arrayMatch[1];
              const textParts = arrayContent.match(/\((.*?)\)/g);
              if (textParts) {
                for (const part of textParts) {
                  const partMatch = part.match(/\((.*?)\)/);
                  if (partMatch && partMatch[1]) {
                    text += partMatch[1] + ' ';
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // If no text found with the above method, try a different approach
    if (!text.trim()) {
      // Look for stream objects that might contain text
      const streamRegex = /stream\s+(.*?)\s+endstream/gs;
      const streamMatches = pdfString.match(streamRegex);
      
      if (streamMatches) {
        for (const stream of streamMatches) {
          // Try to find readable text in streams
          const readableText = stream.match(/[a-zA-Z0-9\s.,!?;:'"()-]{4,}/g);
          if (readableText) {
            text += readableText.join(' ') + ' ';
          }
        }
      }
    }
    
    // Clean up the extracted text
    text = text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters
      .trim();
    
    if (!text) {
      throw new Error('No readable text found in PDF. The PDF might be image-based or encrypted.');
    }
    
    return text;
    
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF: This PDF might be image-based, encrypted, or in a complex format. Please try converting it to text first.`);
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