/**
 * Puter AI Chat — Uses the Puter.js SDK (loaded via CDN).
 *
 * After PuterGate triggers puter.auth.signIn(), the SDK holds the auth
 * token internally. We simply call puter.ai.chat() for AI completions.
 * The SDK handles all auth, drivers, and API routing.
 *
 * We still store a flag in Supabase so PuterGate knows the user has
 * already activated — the SDK persists its own session via cookies.
 */

/* ------------------------------------------------------------------ */
/* Puter SDK type declarations (loaded via CDN)                        */
/* ------------------------------------------------------------------ */

declare const puter: {
  auth: {
    signIn: (options?: { attempt_temp_user_creation?: boolean }) => Promise<any>;
    isSignedIn: () => boolean;
    signOut: () => Promise<void>;
  };
  ai: {
    chat: (...args: any[]) => Promise<any>;
  };
  authToken?: string;
};

/* ------------------------------------------------------------------ */
/* Error Classifier                                                    */
/* ------------------------------------------------------------------ */

export interface PuterErrorInfo {
  userMessage: string;
  isQuotaError: boolean;
  isNetworkError: boolean;
  isAuthError: boolean;
}

function classifyPuterError(error: any): PuterErrorInfo {
  const msg = (error?.message || error?.error || error?.toString?.() || '').toLowerCase();

  // Auth errors
  if (
    msg.includes('unauthorized') || msg.includes('forbidden') ||
    msg.includes('not signed in') || msg.includes('auth') ||
    msg.includes('sign in') || msg.includes('token')
  ) {
    return {
      isQuotaError: false,
      isNetworkError: false,
      isAuthError: true,
      userMessage: `**AI Session Expired** 🔄

Your AI session has expired. Please refresh the page to reconnect.

**💡 Quick Fix:** Refresh the page (Ctrl+R / Cmd+R).`,
    };
  }

  // Quota / rate-limit
  if (
    msg.includes('rate') || msg.includes('limit') || msg.includes('quota') ||
    msg.includes('exceeded') || msg.includes('too many') || msg.includes('429') ||
    msg.includes('capacity') || msg.includes('permission denied')
  ) {
    return {
      isQuotaError: true,
      isNetworkError: false,
      isAuthError: false,
      userMessage: `**Free Usage Limit Reached** 🚫

It looks like you've used up your free AI quota for this session.

**💡 Quick Fix:** **Refresh the page** or try an **incognito window** for a fresh session.

**Tips:**
- Refresh the page (Ctrl+R / Cmd+R)
- Open in an incognito / private window
- Wait a few minutes and try again`,
    };
  }

  // Network errors
  if (
    msg.includes('network') || msg.includes('fetch') || msg.includes('failed to') ||
    msg.includes('connection') || msg.includes('timeout') || msg.includes('abort') ||
    msg.includes('offline')
  ) {
    return {
      isQuotaError: false,
      isNetworkError: true,
      isAuthError: false,
      userMessage: `**Connection Issue** 🌐

I couldn't reach the AI service. Please check your internet connection and try again.`,
    };
  }

  return {
    isQuotaError: false,
    isNetworkError: false,
    isAuthError: false,
    userMessage: `**Something Went Wrong** ⚠️

${error?.message || 'Unknown error'}

**💡 Quick Fix:** Try refreshing the page.`,
  };
}

/* ------------------------------------------------------------------ */
/* SDK Readiness Check                                                 */
/* ------------------------------------------------------------------ */

function isPuterReady(): boolean {
  return typeof puter !== 'undefined' && puter?.ai?.chat !== undefined;
}

/* ------------------------------------------------------------------ */
/* Streaming Chat via SDK                                              */
/* ------------------------------------------------------------------ */

/**
 * Streaming chat completion using the Puter.js SDK.
 * The SDK handles auth internally — no raw token needed.
 *
 * @param _token    Unused — kept for API compatibility (token is in SDK)
 * @param systemPrompt  System instruction
 * @param messages      Conversation history
 * @param onChunk       Callback for each streamed chunk
 */
export async function puterAIChatStream(
  _token: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  if (!isPuterReady()) {
    throw {
      message: 'Puter SDK not loaded',
      puterErrorInfo: {
        isQuotaError: false,
        isNetworkError: false,
        isAuthError: true,
        userMessage: `**AI Not Connected** 🔌

The AI service is still loading. Please refresh the page and try again.`,
      },
    };
  }

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as string,
      content: m.content,
    })),
  ];

  try {
    // Use streaming mode via SDK
    const response = await puter.ai.chat(chatMessages, {
      model: 'minimax/minimax-m2.5',
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    });

    let fullText = '';

    // Extract text from a single SDK chunk (various shapes)
    function extractChunkText(chunk: any): string {
      if (!chunk) return '';
      if (typeof chunk === 'string') return chunk;
      // SDK streaming chunk: { text: '...' }
      if (typeof chunk.text === 'string') return chunk.text;
      // OpenAI-style delta: { choices: [{ delta: { content } }] }
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') return delta;
      // Full message: { message: { content } }
      if (typeof chunk.message?.content === 'string') return chunk.message.content;
      // Never fall back to toString() — that produces [object Object]
      return '';
    }

    // The SDK returns an async iterator for streaming
    if (response && typeof response[Symbol.asyncIterator] === 'function') {
      for await (const chunk of response) {
        const content = extractChunkText(chunk);
        if (content) {
          fullText += content;
          onChunk?.(content);
        }
      }
    } else {
      // Non-streaming fallback
      const content = extractChunkText(response);
      if (content) {
        fullText = content;
        onChunk?.(fullText);
      }
    }

    if (!fullText.trim()) {
      throw new Error('Empty response received from AI');
    }

    return fullText;
  } catch (error: any) {
    if (error?.puterErrorInfo) throw error;
    const errorInfo = classifyPuterError(error);
    throw { ...error, puterErrorInfo: errorInfo };
  }
}

/**
 * Non-streaming chat (for quick tasks like image captioning).
 */
export async function puterAIChat(
  _token: string,
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  if (!isPuterReady()) return 'AI service not available. Please refresh the page.';

  try {
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await puter.ai.chat(messages, {
      model: 'qwen/qwen3.6-plus-preview:free',
      temperature: 0.3,
      max_tokens: 512,
    });

    return response?.message?.content || response?.toString?.() || '';
  } catch {
    return 'Image analysis unavailable right now.';
  }
}
