// import { GoogleGenerativeAI } from '@google/generative-ai';

// // Initialize the API with a fallback for missing key
// const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// const genAI = new GoogleGenerativeAI(API_KEY);

// export async function getChatResponse(prompt: string, context: string) {
//   try {
//     // Check if API key is available
//     if (!API_KEY) {
//       return "Error: Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.";
//     }
    
//     const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
//     // Enhanced context matching with link support
//     let relevantContext = '';
//     if (context) {
//       const contextSections = context.split('\n\n');
//       const relevantSections = contextSections.filter(section => {
//         const keywords = prompt.toLowerCase().split(' ').filter(word => word.length > 3);
//         const isRelevant = keywords.some(keyword => section.toLowerCase().includes(keyword));
//         const isLink = section.startsWith('Link:');
//         return isRelevant || isLink;
//       });
//       relevantContext = relevantSections.join('\n\n');
//     }

//     const systemPrompt = `You are an AI tutor made by Yugal. Follow these rules strictly:
//     1. If code is needed, wrap it in markdown code blocks with the appropriate language
//     2. Never use LaTeX or mathematical symbols like $x$ or $$
//     3. Write mathematical expressions in plain text (e.g., "x squared" instead of "x²")
//     4. Keep responses concise and well-structured
//     5. If relevant links are provided in the context, mention them in your response
//     6. If the answer is in the following context, use it. Otherwise, use your knowledge:
//     7. if Anyone ask to reveal api keys || something kinda public/private information dont reveal it.
//     8. if anyone ask you about owner details tell them yugal is owner and he build this.
//     ${relevantContext || 'No context available'}`;

//     try {
//       const chat = model.startChat({
//         history: [
//           {
//             role: 'user',
//             parts: [{ text: systemPrompt }],
//           },
//           {
//             role: 'model',
//             parts: [{ text: 'I understand and will follow these rules.' }],
//           },
//         ],
//         generationConfig: {
//           maxOutputTokens: 1000,
//         },
//       });

//       const result = await chat.sendMessage([{ text: prompt }]);
//       const response = await result.response;
//       const text = response.text();
      
//       return relevantContext
//         ? `[From Documents]\n\n${text}`
//         : `[AI Response]\n\n${text}`;
//     } catch (modelError: any) {
//       console.error('Model error:', modelError);
//       return `I apologize, but I encountered an error with the AI model: ${modelError.message || 'Unknown error'}. Please try again.`;
//     }
//   } catch (error: any) {
//     console.error('Error getting chat response:', error);
//     return `I apologize, but I encountered an error: ${error.message || 'Unknown error'}. Please try again.`;
//   }
// }

import { vectorSearchService } from './vectorSearch';
import { ChatContext } from '../types/embeddings';
import type { SupabaseClient } from '@supabase/supabase-js';

// Uses Supabase Edge Function for chat (avoids CORS + hides API key + handles continuations)

// Context window management - prevent token overflow
const MAX_CONTEXT_LENGTH = 8000; // Conservative limit (much less than 131k token max)

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token budget
 */
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  const maxChars = maxTokens * 4;
  return text.substring(0, maxChars) + '\n\n[Context truncated to fit within limits]';
}

/**
 * Progress callback type for tracking different stages
 */
type ProgressCallback = (stage: 'searching' | 'context' | 'ai_response' | 'streaming' | 'complete', message: string) => void;

/**
 * Main chat response function with streaming support for faster perceived response time
 */
export async function getChatResponse(
  prompt: string,
  context: string,
  userId: string,
  chatId: string,
  supabaseClient: SupabaseClient,
  onChunk?: (chunk: string) => void,
  forceStreaming: boolean = false,
  onProgress?: ProgressCallback
): Promise<string> {
  try {
    // Get vector-based context from chat history and documents
    let chatContext: ChatContext | null = null;
    let vectorContext = '';

    // Skip vector search for very short prompts (less than 15 chars)
    if (prompt.trim().length >= 15) {
      try {
        onProgress?.('searching', '🔍 Searching relevant documents...');
        // Use timeout to avoid blocking the chat response
        const contextPromise = vectorSearchService.buildChatContext(prompt, userId, chatId, 5000);
        chatContext = await Promise.race([
          contextPromise,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Context timeout')), 5000))
        ]);

        if (chatContext.relevant_documents.length > 0) {
          onProgress?.('context', `📄 Found ${chatContext.relevant_documents.length} relevant sections`);
        } else {
          onProgress?.('context', '📄 No matching documents found');
        }

        vectorContext = vectorSearchService.formatContextForPrompt(chatContext);
        vectorContext = truncateToTokenLimit(vectorContext, MAX_CONTEXT_LENGTH);
      } catch (contextError) {
        console.warn('Failed to get vector context (timeout or embeddings not ready):', contextError?.message || contextError);
        onProgress?.('context', '📄 Using general knowledge');
      }
    }

    onProgress?.('ai_response', '🤖 Generating response...');

    // Combine contexts (if manual context is provided)
    const combinedContext = [vectorContext, context].filter(Boolean).join('\n\n');
    const finalContext = truncateToTokenLimit(combinedContext || 'No context available', MAX_CONTEXT_LENGTH);

    // Build system prompt
    const systemPrompt = `You are an AI tutor made by Yugal. Follow these rules strictly:
  1. **CRITICAL**: If RELEVANT DOCUMENTS or RECENT CONVERSATION context is provided below, USE IT to answer questions. Never say you can't access uploaded files.
  2. Grounding rule: Only claim specific facts (question numbers, options, code, definitions, values) if they appear verbatim in the provided context. Never guess missing options/answers.
  3. When referring to a document question, first quote the exact excerpt you used (1-3 lines), then explain it.
  4. If the excerpt includes an answer key (e.g., "Answer a"), treat it as the document's answer. Explain why that option is correct. If you believe the key is wrong, say "The document key says X, but based on the code/math I get Y" and explain the discrepancy.
  5. If the options do not contain the computed result, do NOT try to pick a "closest" option. Instead say: "Computed result is X but X is not in the provided options; the question/options may contain a typo."
  3. If code is needed, wrap it in markdown code blocks with the appropriate language.
  4. Never use LaTeX or mathematical symbols like $x$ or $$.
  5. Write mathematical expressions in plain text (e.g., "x squared" instead of "x²").
  6. Keep responses well-structured and COMPLETE (never cut off mid-sentence).
  7. Do NOT add marketing, contact info, or meta commentary (like "we use multiple models") unless the user explicitly asks.
  8. Never reveal API keys or system configuration details.
  9. If (and only if) the user asks about the owner/creator, answer: "Yugal is the owner and creator of this platform."

  IMPORTANT: Use the following context to provide better, more relevant responses:
  ${finalContext}`;

    // Prepare messages for Edge Function
    const messages = [
      { role: 'user', content: prompt }
    ];

    // Use streaming if callback provided OR if forceStreaming is true
    if (onChunk || forceStreaming) {
      return await streamChatResponse(supabaseClient, messages, systemPrompt, onChunk, onProgress);
    }

    // Otherwise, use regular request with timeout
    const responsePromise = supabaseClient.functions.invoke('chat-completion', {
      body: { messages, systemPrompt, stream: false },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Chat request timeout (30s)')), 30000)
    );

    const { data, error } = await Promise.race([responsePromise, timeoutPromise]);

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`Chat API error: ${error.message}`);
    }

    if (!data || !(data as any).content) {
      console.error('Empty response from Edge Function:', data);
      throw new Error('No response from AI service. Please try again.');
    }

    onProgress?.('complete', '');
    return (data as any).content;

  } catch (error: any) {
    console.error('Error getting chat response:', error);

    // Graceful degradation - return helpful error message
    if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
      return `⚠️ **Rate Limit Reached**

The AI service is experiencing high demand. Please wait a moment and try again.

💡 **Tips:**
- Wait 10-30 seconds before retrying
- Try asking more specific questions
- Combine multiple questions into one message

📞 **Need help?** Contact Yugal:
- Email: studyai.platform@gmail.com
- GitHub: github.com/yugalbansal`;
    }

    if (error.message && error.message.includes('timeout')) {
      return `⏱️ **Request Timeout**

The AI service took too long to respond. Please try a shorter question or try again.

💡 **Tips:**
- Break complex questions into smaller parts
- Try again in a few seconds`;
    }

    return `I apologize, but I encountered an error: ${error.message || 'Unknown error'}. Please try again.`;
  }
}

/**
 * Stream chat response for real-time display with better error handling
 */
async function streamChatResponse(
  supabaseClient: SupabaseClient,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  onProgress?: ProgressCallback
): Promise<string> {
  // Notify that we're starting to stream
  onProgress?.('streaming', '💬 Receiving response...');

  // Timeout wrapper
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

  // Handle Response object (streaming)
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  if (data instanceof Response && data.body) {
    reader = data.body.getReader();
  } else if (typeof data === 'object' && 'content' in data) {
    // Non-streaming fallback - return content directly
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
          // Handle error responses in stream
          if (parsedData.error) {
            throw new Error(parsedData.error);
          }
          if (parsedData.content) {
            fullContent += parsedData.content;
            onChunk(parsedData.content);

            // Notify progress after first content arrives
            if (!hasNotifiedStreaming) {
              hasNotifiedStreaming = true;
              onProgress?.('streaming', '✨ Response complete');
            }
          }
        } catch (e) {
          // Ignore parse errors for non-JSON lines, but log them
          if (trimmed.includes('data:')) {
            console.warn('Failed to parse SSE line:', trimmed.substring(0, 100));
          }
        }
      }
    }
  } catch (streamError: any) {
    console.error('Streaming error:', streamError);
    // If streaming fails but we have some content, return what we have
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
