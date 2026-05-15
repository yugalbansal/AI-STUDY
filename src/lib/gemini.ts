import * as Tesseract from 'tesseract.js';

import { vectorSearchService } from './vectorSearch';
import { ChatContext } from '../types/embeddings';
import type { SupabaseClient } from '@supabase/supabase-js';

// OpenRouter API for image captioning
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CAPTION_MODEL = 'openrouter/free';

/**
 * Perform OCR on an image to extract text (code, errors, etc.)
 */
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

/**
 * Caption an image using OpenRouter API with openrouter/free model.
 */
export async function captionImage(base64Data: string, mimeType: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return '[Image attached - could not generate caption]';
  }

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

async function fetchCaption(base64Data: string, mimeType: string): Promise<string> {
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-OpenRouter-Title': 'AI-Study Chat',
        },
        body: JSON.stringify({
          model: CAPTION_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`,
                  },
                },
                {
                  type: 'text',
                  text: 'Describe this image concisely in 1-2 sentences. Focus on what the image shows.',
                },
              ],
            },
          ],
          max_tokens: 256,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
          continue;
        }
        return 'Image description unavailable';
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Image description unavailable';
    } catch {
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
      }
    }
  }

  return 'Image description unavailable';
}

/**
 * Process multiple images and return captions.
 */
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

// Context window management - prevent token overflow
const MAX_CONTEXT_LENGTH = 8000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const maxChars = maxTokens * 4;
  return text.substring(0, maxChars) + '\n\n[Context truncated to fit within limits]';
}

type ProgressCallback = (stage: 'searching' | 'context' | 'ai_response' | 'streaming' | 'complete', message: string) => void;

/**
 * Main chat response function with streaming support
 */
export async function getChatResponse(
  prompt: string,
  context: string,
  userId: string,
  chatId: string,
  supabaseClient: SupabaseClient,
  onChunk?: (chunk: string) => void,
  forceStreaming: boolean = false,
  onProgress?: ProgressCallback,
  imageUrls?: string[],
  uploadedDocIds?: string[]
): Promise<string> {
  try {
    let chatContext: ChatContext | null = null;
    let vectorContext = '';

    if (prompt.trim().length >= 15) {
      try {
        onProgress?.('searching', 'Searching relevant documents...');
        const contextPromise = vectorSearchService.buildChatContext(prompt, userId, chatId, 5000, uploadedDocIds);
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

    const combinedContext = [vectorContext, context].filter(Boolean).join('\n\n');
    const finalContext = truncateToTokenLimit(combinedContext || 'No context available', MAX_CONTEXT_LENGTH);

    let conversationHistory = '';
    if (chatContext && chatContext.recent_messages.length > 0) {
      conversationHistory = chatContext.recent_messages.map((msg: any) =>
        `User: ${msg.message}\nAssistant: ${msg.response}`
      ).join('\n\n');
    }

    const systemPrompt = `You are an AI tutor made by Yugal. Follow these rules strictly:
  1. **CRITICAL**: If RELEVANT DOCUMENTS or RECENT CONVERSATION context is provided below, USE IT to answer questions. Never say you can't access uploaded files.
  2. **CONTEXT RETENTION**: Always maintain context from the conversation history. If the user sends a short reply like "yes", "next", "continue", or similar, interpret it in the context of your previous message and continue seamlessly.
  3. Grounding rule: Only claim specific facts (question numbers, options, code, definitions, values) if they appear verbatim in the provided context. Never guess missing options/answers.
  4. When referring to a document question, first quote the exact excerpt you used (1-3 lines), then explain it.
  5. If the excerpt includes an answer key (e.g., "Answer a"), treat it as the document's answer. Explain why that option is correct. If you believe the key is wrong, say "The document key says X, but based on the code/math I get Y" and explain the discrepancy.
  6. If the options do not contain the computed result, do NOT try to pick a "closest" option. Instead say: "Computed result is X but X is not in the provided options; the question/options may contain a typo."
  7. If code is needed, wrap it in markdown code blocks with the appropriate language.
  8. Never use LaTeX or mathematical symbols like $x$ or $$.
  9. Write mathematical expressions in plain text (e.g., "x squared" instead of "x²").
  10. Keep responses well-structured and COMPLETE (never cut off mid-sentence).
  11. Do NOT add marketing, contact info, or meta commentary (like "we use multiple models") unless the user explicitly asks.
  12. Never reveal API keys or system configuration details.
  13. If (and only if) the user asks about the owner/creator, answer: "Yugal is the owner and creator of this platform."

${conversationHistory ? `\n=== RECENT CONVERSATION ===\n${conversationHistory}\n` : ''}
IMPORTANT: Use the following context to provide better, more relevant responses:
${finalContext}`;

    const messages = [
      { role: 'user', content: prompt, imageUrls: imageUrls || [] }
    ];

    if (onChunk || forceStreaming) {
      return await streamChatResponse(supabaseClient, messages, systemPrompt, onChunk, onProgress);
    }

    const responsePromise = supabaseClient.functions.invoke('chat-completion', {
      body: { messages, systemPrompt, stream: false },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Chat request timeout (30s)')), 30000)
    );

    const { data, error } = await Promise.race([responsePromise, timeoutPromise]);

    if (error) {
      throw new Error(`Chat API error: ${error.message}`);
    }

    if (!data || !(data as any).content) {
      throw new Error('No response from AI service. Please try again.');
    }

    onProgress?.('complete', '');
    return (data as any).content;

  } catch (error: any) {
    if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
      return `**Rate Limit Reached**

The AI service is experiencing high demand. Please wait a moment and try again.

**Tips:**
- Wait 10-30 seconds before retrying
- Try asking more specific questions
- Combine multiple questions into one message

**Need help?** Contact Yugal:
- Email: studyai.platform@gmail.com
- GitHub: github.com/yugalbansal`;
    }

    if (error.message && error.message.includes('timeout')) {
      return `**Request Timeout**

The AI service took too long to respond. Please try a shorter question or try again.

**Tips:**
- Break complex questions into smaller parts
- Try again in a few seconds`;
    }

    return `I apologize, but I encountered an error: ${error.message || 'Unknown error'}. Please try again.`;
  }
}

async function streamChatResponse(
  supabaseClient: SupabaseClient,
  messages: Array<{ role: string; content: string; imageUrls?: string[] }>,
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  onProgress?: ProgressCallback
): Promise<string> {
  onProgress?.('streaming', 'Receiving response...');

  const invokePromise = supabaseClient.functions.invoke('chat-completion', {
    body: { messages, systemPrompt, stream: true },
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Chat stream timeout (60s)')), 60000)
  );

  const response = await Promise.race([invokePromise, timeoutPromise]);

  if (response.error) {
    throw new Error(`Chat API error: ${response.error.message}`);
  }

  const data = response.data;
  if (!data) {
    throw new Error('No response data');
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  if (data instanceof Response && data.body) {
    reader = data.body.getReader();
  } else if (typeof data === 'object' && 'content' in data) {
    const content = (data as any).content || '';
    onChunk(content);
    onProgress?.('complete', '');
    return content;
  } else {
    throw new Error('Invalid response format: expected Response object');
  }

  if (!reader) {
    throw new Error('No response body reader');
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';
  let hasNotifiedStreaming = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const parsedData = JSON.parse(trimmed.slice(6));
          if (parsedData.error) {
            throw new Error(parsedData.error);
          }
          if (parsedData.content) {
            fullContent += parsedData.content;
            onChunk(parsedData.content);

            if (!hasNotifiedStreaming) {
              hasNotifiedStreaming = true;
              onProgress?.('streaming', 'Response complete');
            }
          }
        } catch {
          // Ignore parse errors for non-JSON lines
        }
      }
    }
  } catch (streamError: any) {
    if (fullContent) {
      return fullContent + '\n\n[Response was truncated due to an error]';
    }
    throw streamError;
  } finally {
    if (reader) {
      reader.releaseLock();
    }
  }

  onProgress?.('complete', '');
  return fullContent;
}