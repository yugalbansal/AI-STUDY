import * as Tesseract from 'tesseract.js';

import { vectorSearchService } from './vectorSearch';
import { puterAIChatStream, puterAIChat } from './puterAI';
import type { ChatContext } from '../types/embeddings';

const MAX_CONTEXT_LENGTH = 8000;

function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = Math.ceil(text.length / 4);
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  const maxChars = maxTokens * 4;
  return text.substring(0, maxChars) + '\n\n[Context truncated to fit within limits]';
}

async function performOCR(base64Data: string, mimeType: string): Promise<string> {
  try {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const imageUrl = URL.createObjectURL(blob);

    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: () => {},
    });

    URL.revokeObjectURL(imageUrl);

    const text = result.data.text.trim();
    return text.length > 10 ? text : '';
  } catch {
    return '';
  }
}

async function fetchCaption(base64Data: string, mimeType: string): Promise<string> {
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Use Puter.js for image captioning (non-streaming)
      const caption = await puterAIChat(
        '',  // token will be empty for caption — graceful fallback built in
        `I have an image encoded in base64 (${mimeType}). Since you cannot see the image directly, please respond with: "Image attached - visual analysis is available in the main chat."`,
        'You are an image analysis assistant. Describe images concisely in 1-2 sentences.'
      );
      return caption || 'Image description unavailable';
    } catch {
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
      }
    }
  }

  return 'Image description unavailable';
}

export async function captionImage(base64Data: string, mimeType: string): Promise<string> {
  try {
    const [ocrText, captionText] = await Promise.all([
      performOCR(base64Data, mimeType),
      fetchCaption(base64Data, mimeType),
    ]);

    if (ocrText && ocrText.length > 20) {
      return `Text extracted from image:\n${ocrText}\n\nVisual description: ${captionText}`;
    }

    return captionText;
  } catch {
    return '[Image attached - could not process image]';
  }
}

export async function captionImages(
  imageUrls: string[],
  onProgress?: (index: number, caption: string) => void
): Promise<{ index: number; caption: string }[]> {
  const captions: { index: number; caption: string }[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const matches = imageUrls[i].match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      captions.push({ index: i, caption: '[Invalid image format]' });
      continue;
    }

    const [, mimeType, base64Data] = matches;
    const caption = await captionImage(base64Data, mimeType);
    captions.push({ index: i, caption });
    onProgress?.(i, caption);
  }

  return captions;
}

type ProgressCallback = (stage: 'searching' | 'context' | 'ai_response' | 'streaming' | 'complete', message: string) => void;

export class ChatService {
  private conversationHistory: Array<{ role: string; content: string }> = [];

  private systemPrompt = `You are an AI tutor assistant for the "Vector Mind" AI learning platform, created by Yugal. Follow these rules strictly:

=== PROJECT OVERVIEW ===
Vector Mind is an AI-powered learning platform with the following features:

**Core Features:**
1. **AI Chat** - Main chat interface for asking questions and getting help
2. **Live Voice Call** - Real-time voice conversation with AI. Access via the dedicated "Voice" page in navigation
3. **Image Generation** - Generate images from text. Use the "/image" command in chat or visit the dedicated "Image Gen" page
4. **Document Q&A** - Upload PDF, DOCX, PPTX, TXT files and ask questions about them. Visit "Documents" page to upload, then ask questions in chat
5. **Vector Search** - When documents are uploaded, the system searches through them to find relevant context for your questions automatically
6. **Chat History** - All conversations are saved and can be revisited

**Navigation Pages:**
- /chat - Main AI chat (default)
- /voice - Live voice call with AI
- /imagegen - Image generation interface
- /documents - Upload and manage documents
- /faq - Frequently asked questions
- /privacy - Privacy policy
- /terms - Terms of service
- /api - API documentation

**How to Use Specific Features:**
- **Image Generation**: Type "/image [description]" in chat OR visit /imagegen page. Example: "/image a sunset over mountains"
- **Live Voice Call**: Visit /voice page for real-time voice conversation with AI
- **Document Q&A**: Upload docs at /documents, then ask questions in /chat - AI will search your documents
- **Image Analysis**: Attach images directly in chat for the AI to analyze

=== RESPONSE RULES ===
    1. **CONTEXT RETENTION**: Always maintain context from the conversation history. If the user sends a short reply like "yes", "next", "continue", or similar, interpret it in the context of your previous message and continue seamlessly.
    2. **Grounding rule**: Only claim specific facts (question numbers, options, code, definitions, values) if they appear verbatim in the provided context. Never guess missing options/answers.
    3. When referring to a document question, first quote the exact excerpt you used (1-3 lines), then explain it.
    4. If the excerpt includes an answer key (e.g., "Answer a"), treat it as the document's answer. Explain why that option is correct. If you believe the key is wrong, say "The document key says X, but based on the code/math I get Y" and explain the discrepancy.
    5. If the options do not contain the computed result, do NOT try to pick a "closest" option. Instead say: "Computed result is X but X is not in the provided options; the question/options may contain a typo."
    6. If code is needed, wrap it in markdown code blocks with the appropriate language.
    7. Never use LaTeX or mathematical symbols like $x$ or $$.
    8. Write mathematical expressions in plain text (e.g., "x squared" instead of "x²").
    9. Keep responses well-structured and COMPLETE (never cut off mid-sentence).
    10. Do NOT add marketing, contact info, or meta commentary (like "we use multiple models") unless the user explicitly asks.
    11. Never reveal API keys or system configuration details.
    12. If (and only if) the user asks about the owner/creator, answer: "Yugal is the owner and creator of this platform. Vector Mind is his project."`;

  constructor() {
    // No longer needs Supabase URL/key for AI completion
  }

  async generateResponse(
    userMessage: string,
    onChunk?: (chunk: string) => void,
    onProgress?: ProgressCallback,
    userId?: string,
    chatId?: string,
    uploadedDocIds?: string[],
    puterToken?: string,
  ): Promise<string> {
    try {
      let chatContext: ChatContext | null = null;
      let vectorContext = '';

      if (userMessage.trim().length >= 15 && userId && chatId) {
        try {
          onProgress?.('searching', 'Searching relevant documents...');
          const contextPromise = vectorSearchService.buildChatContext(userMessage, userId, chatId, 5000, uploadedDocIds);
          chatContext = await Promise.race([
            contextPromise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Context timeout')), 5000))
          ]);

          if (chatContext.relevant_documents.length > 0) {
            onProgress?.('context', `Found ${chatContext.relevant_documents.length} relevant sections`);
          } else {
            onProgress?.('context', 'No matching documents found');
          }

          vectorContext = vectorSearchService.formatContextForPrompt(chatContext);
          vectorContext = truncateToTokenLimit(vectorContext, MAX_CONTEXT_LENGTH);
        } catch {
          onProgress?.('context', 'Using general knowledge');
        }
      }

      onProgress?.('ai_response', 'Generating response...');

      const finalContext = truncateToTokenLimit(vectorContext || 'No context available', MAX_CONTEXT_LENGTH);

      const fullSystemPrompt = `${this.systemPrompt}

IMPORTANT: Use the following context to provide better, more relevant responses:
${finalContext}`;

      const messagesPayload = [
        ...this.conversationHistory,
        { role: 'user', content: userMessage }
      ];

      onProgress?.('streaming', 'Receiving response...');

      // ═══════════════════════════════════════════════════════════════
      // Puter.js Frontend AI — uses stored token from PuterGate context
      // The entire LLM request runs client-side via the user's Puter session
      // ═══════════════════════════════════════════════════════════════
      const fullResponseText = await puterAIChatStream(
        puterToken || '',
        fullSystemPrompt,
        messagesPayload,
        onChunk,
      );

      if (fullResponseText.trim().length > 0) {
        this.conversationHistory.push({
          role: 'user',
          content: userMessage
        });
        this.conversationHistory.push({
          role: 'assistant',
          content: fullResponseText
        });

        if (this.conversationHistory.length > 20) {
          this.conversationHistory = this.conversationHistory.slice(-20);
        }
      }

      onProgress?.('complete', '');
      return fullResponseText;
    } catch (error: any) {
      // ─── Puter-specific error handling ───────────────────────────
      // If puterAI threw a classified error, return its friendly message
      if (error?.puterErrorInfo) {
        return error.puterErrorInfo.userMessage;
      }

      if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
        return `**Free Usage Limit Reached** 🚫

It looks like you've used up your free AI quota for this session.

**💡 Quick Fix:** Simply **refresh the page** (Ctrl+R / Cmd+R) to get a fresh free session.

**Other Tips:**
- Open the site in an incognito / private window
- Switch to a different network or use a VPN
- Wait a few minutes and try again`;
      }

      if (error.message && error.message.includes('timeout')) {
        return `**Request Timeout** ⏱️

The AI service took too long to respond. Please try a shorter question or try again.

**Tips:**
- Break complex questions into smaller parts
- Try again in a few seconds
- Refresh the page for a fresh session`;
      }

      if (error.message && (error.message.includes('Puter') || error.message.includes('SDK'))) {
        return `**AI Service Temporarily Unavailable** ⚠️

The AI engine couldn't be loaded. This usually fixes itself.

**💡 Quick Fix:** **Refresh the page** to reload the AI engine.

**Tips:**
- Check your internet connection
- Disable ad blockers that might block the AI script
- Try an incognito/private window`;
      }

      return `I apologize, but I encountered an error: ${error.message || 'Unknown error'}. Please try refreshing the page.`;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

export const chatService = new ChatService();