// Supabase Edge Function: chat-completion
// Purpose: Handle OpenRouter chat completions with continuation support

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// FREE MODEL SELECTION STRATEGY
const selectModel = (prompt: string): string => {
  const wordCount = prompt.trim().split(/\s+/).length;
  
  // Short/simple prompts (≤ 20 words) → Fast model
  if (wordCount <= 20) {
    return "meta-llama/llama-3.3-70b-instruct:free";
  }
  
  // Long/complex prompts (> 20 words) → Better reasoning model
  return "nousresearch/hermes-3-llama-3.1-405b:free";
};

// Fallback model order (ONLY VERIFIED FREE MODELS)
const FALLBACK_MODELS = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1-0528:free",
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-coder:free",
];

interface Message {
  role: string;
  content: string;
}

interface RequestBody {
  messages: Message[];
  systemPrompt?: string;
}

async function callOpenRouter(
  messages: Message[],
  model: string,
  apiKey: string
): Promise<{ content: string; finishReason: string }> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ktjpfkrmsjopiytvxkzm.supabase.co",
      "X-Title": "AI Study Platform",
    },
    body: JSON.stringify({
      model,
      messages,
      // NO max_tokens - let model respond fully
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  
  if (!choice) {
    throw new Error("No response from OpenRouter");
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
    const { messages, systemPrompt }: RequestBody = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: 'messages' array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not configured");
    }

    // Build final messages array
    const finalMessages: Message[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    // Select model based on last user message
    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
    const selectedModel = selectModel(lastUserMessage);

    console.log(`Selected model: ${selectedModel} (${lastUserMessage.split(/\s+/).length} words)`);

    // Try selected model, fallback on error
    let result: { content: string; finishReason: string } | null = null;
    let lastError: Error | null = null;

    // Try selected model first
    try {
      result = await callOpenRouter(finalMessages, selectedModel, OPENROUTER_API_KEY);
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
          result = await callOpenRouter(finalMessages, fallbackModel, OPENROUTER_API_KEY);
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
        result = await callOpenRouter(continuationMessages, selectedModel, OPENROUTER_API_KEY);
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
