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
 * Main chat response function with streaming support for faster perceived response time
 */
export async function getChatResponse(
  prompt: string, 
  context: string, 
  userId: string,
  chatId: string,
  supabaseClient: SupabaseClient,
  onChunk?: (chunk: string) => void
): Promise<string> {
  try {
    // Get vector-based context from chat history and documents
    let chatContext: ChatContext | null = null;
    let vectorContext = '';
    
    try {
      // Skip vector search for very short prompts (less than 15 chars)
      if (prompt.trim().length >= 15) {
        chatContext = await vectorSearchService.buildChatContext(prompt, userId, chatId);
        vectorContext = vectorSearchService.formatContextForPrompt(chatContext);
        
        // Truncate vector context if too large
        vectorContext = truncateToTokenLimit(vectorContext, MAX_CONTEXT_LENGTH);
      } else {
        console.log('Prompt too short for vector search, using direct response');
      }
    } catch (contextError) {
      console.warn('Failed to get vector context (embeddings may not be ready):', contextError);
    }

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

    // If streaming callback is provided, use streaming
    if (onChunk) {
      console.log('Using streaming mode');
      return await streamChatResponse(supabaseClient, messages, systemPrompt, onChunk);
    }

    // Otherwise, use regular request
    console.log('Using non-streaming mode');
    const { data, error } = await supabaseClient.functions.invoke('chat-completion', {
      body: { messages, systemPrompt, stream: false },
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`Chat API error: ${error.message}`);
    }

    console.log('Edge Function response data type:', typeof data, data);
    
    if (!data || !(data as any).content) {
      console.error('Empty response from Edge Function:', data);
      throw new Error('No response from AI service. Please try again.');
    }
    
    return (data as any).content;
    
  } catch (error: any) {
    console.error('Error getting chat response:', error);
    
    // Graceful degradation - return helpful error message
    if (error.message && error.message.includes('429')) {
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
    
    return `I apologize, but I encountered an error: ${error.message || 'Unknown error'}. Please try again.`;
  }
}

/**
 * Stream chat response for real-time display
 */
async function streamChatResponse(
  supabaseClient: SupabaseClient,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const response = await supabaseClient.functions.invoke('chat-completion', {
    body: { messages, systemPrompt, stream: true },
  });

  if (response.error) {
    throw new Error(`Chat API error: ${response.error.message}`);
  }

  // Check if we got a streaming response (Response object with body)
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
    return content;
  } else {
    throw new Error('Invalid response format');
  }

  if (!reader) {
    throw new Error('No response body reader');
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

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
          if (parsedData.content) {
            fullContent += parsedData.content;
            onChunk(parsedData.content);
          }
        } catch (e) {
          console.error('Failed to parse SSE line:', trimmed);
        }
      }
    }
  } catch (streamError) {
    console.error('Streaming error:', streamError);
    // If streaming fails, return what we have so far
    if (fullContent) {
      return fullContent;
    }
    throw streamError;
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}
