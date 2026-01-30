// Supabase Edge Function: chat-completion
// Purpose: Handle Cerebras chat completions with streaming support for fast response

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MODEL SELECTION STRATEGY - Optimized for speed
const selectModel = (prompt: string, hasContext: boolean = false): string => {
  const wordCount = prompt.trim().split(/\s+/).length;
  
  // Always prefer fastest model for better UX
  if (wordCount <= 50 || !hasContext) {
    return "llama-3.3-70b"; // Fastest model
  }
  
  // Use larger model only for complex queries with context
  return "gpt-oss-120b";
};

// Fallback model order (speed-prioritized)
const FALLBACK_MODELS = [
  "llama-3.3-70b",    // Fastest - try first
  "qwen-3-32b",       // Fast alternative
  "gpt-oss-120b",     // Larger model as last resort
];

interface Message {
  role: string;
  content: string;
}

interface RequestBody {
  messages: Message[];
  systemPrompt?: string;
  stream?: boolean;
}

async function* streamCerebras(
  messages: Message[],
  model: string,
  apiKey: string
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(CEREBRAS_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_completion_tokens: 32768,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cerebras error (${response.status}): ${error}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const data = JSON.parse(trimmed.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (e) {
          console.error("Failed to parse SSE line:", trimmed);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function callCerebras(
  messages: Message[],
  model: string,
  apiKey: string
): Promise<{ content: string; finishReason: string }> {
  const response = await fetch(CEREBRAS_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      max_completion_tokens: 32768,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cerebras error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  
  if (!choice) {
    throw new Error("No response from Cerebras");
  }

  return {
    content: choice.message?.content || "",
    finishReason: choice.finish_reason || "stop",
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, stream = true }: RequestBody = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: 'messages' array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY_1");
    if (!CEREBRAS_API_KEY) {
      throw new Error("Cerebras API key not configured");
    }

    // Build final messages array
    const finalMessages: Message[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    // Select model based on last user message and whether we have context
    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
    const hasContext = systemPrompt && systemPrompt.includes("RELEVANT DOCUMENTS");
    const selectedModel = selectModel(lastUserMessage, hasContext);

    console.log(`Selected model: ${selectedModel} (streaming: ${stream})`);

    // If streaming is requested, stream the response
    if (stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamCerebras(finalMessages, selectedModel, CEREBRAS_API_KEY)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming fallback (for compatibility)
    let result: { content: string; finishReason: string } | null = null;
    let lastError: Error | null = null;

    // Try selected model first
    try {
      result = await callCerebras(finalMessages, selectedModel, CEREBRAS_API_KEY);
    } catch (error) {
      console.error(`Primary model ${selectedModel} failed:`, error);
      lastError = error;
    }

    // Try fallbacks if primary failed
    if (!result) {
      for (const fallbackModel of FALLBACK_MODELS) {
        if (fallbackModel === selectedModel) continue; // Skip already tried model
        
        try {
          console.log(`Trying fallback model: ${fallbackModel}`);
          result = await callCerebras(finalMessages, fallbackModel, CEREBRAS_API_KEY);
          break;
        } catch (error) {
          console.error(`Fallback model ${fallbackModel} failed:`, error);
          lastError = error;
        }
      }
    }

    if (!result) {
      console.error("All models failed. Last error:", lastError);
      throw lastError || new Error("All models failed");
    }

    // Validate we got content
    if (!result.content || result.content.trim().length === 0) {
      console.error("Model returned empty content:", result);
      throw new Error("Model returned empty response. Please try again.");
    }

    // Handle continuation if response was cut off
    let fullContent = result.content;
    let attempts = 0;
    const MAX_CONTINUATIONS = 3;

    while (result.finishReason === "length" && attempts < MAX_CONTINUATIONS) {
      console.log(`Response truncated, requesting continuation (attempt ${attempts + 1})`);
      
      // Add the incomplete response and ask for continuation
      const continuationMessages: Message[] = [
        ...finalMessages,
        { role: "assistant", content: fullContent },
        { role: "user", content: "Continue your response from where you left off." },
      ];

      try {
        result = await callCerebras(continuationMessages, selectedModel, CEREBRAS_API_KEY);
        fullContent += " " + result.content;
        attempts++;
      } catch (error) {
        console.error("Continuation failed:", error);
        break;
      }
    }

    return new Response(
      JSON.stringify({ 
        content: fullContent,
        model: selectedModel,
        wasContinued: attempts > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in chat completion:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
