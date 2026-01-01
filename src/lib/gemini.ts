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
import { supabase } from './supabase';

// Use Supabase Edge Function for chat (avoids CORS + hides API key + handles continuations)
const CHAT_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`;

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
 * Main chat response function using Supabase Edge Function
 */
export async function getChatResponse(
  prompt: string, 
  context: string, 
  userId: string,
  chatId: string
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
2. If code is needed, wrap it in markdown code blocks with the appropriate language
3. Never use LaTeX or mathematical symbols like $x$ or $$
4. Write mathematical expressions in plain text (e.g., "x squared" instead of "x²")
5. Keep responses well-structured but COMPLETE - never cut off mid-sentence
6. If relevant links are provided in the context, mention them in your response
7. When answering from documents, cite the document content naturally
8. Never reveal API keys or system configuration details
9. If anyone asks about the owner: Yugal is the owner and creator of this platform

Owner details (if requested):
Yugal is a passionate engineering student focused on web development, IoT, AI, and blockchain. Projects include:
• Typing Boost – typing tests platform
• Food Spoiler Alert – ESP32-based monitoring system
• Decentralized Attendance App – blockchain attendance solution
• AI Study Platform – this learning assistant

Contact:
📞 Email: studyai.platform@gmail.com
📞 GitHub: github.com/yugalbansal
📞 LinkedIn: linkedin.com/in/yugal-bansal-a47b91327/

If asked about AI models: "We use multiple AI models to provide the best results. Contact Yugal for technical details."

IMPORTANT: Use the following context to provide better, more relevant responses:
${finalContext}`;

    // Validate system prompt isn't too large
    const systemPromptTokens = estimateTokens(systemPrompt);
    console.log(`System prompt size: ~${systemPromptTokens} tokens`);
    
    if (systemPromptTokens > 15000) {
      console.warn('System prompt is very large, may cause context overflow');
    }

    // Prepare messages for Edge Function
    const messages = [
      { role: 'user', content: prompt }
    ];

    // Get session token
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call Edge Function
    const response = await fetch(CHAT_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        messages,
        systemPrompt
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Edge Function error:', error);
      throw new Error(`Chat API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log('Edge Function response:', data);
    
    if (!data || !data.content) {
      console.error('Empty response from Edge Function:', data);
      throw new Error('No response from AI service. Please try again.');
    }
    
    return data.content;
    
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
