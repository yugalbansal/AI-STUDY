// Supabase Edge Function: chat-completion
// Configurable provider via environment variables
//
// Required env vars:
// - API_KEY: Your API key (OpenCode, OpenRouter, etc.)
// - MODEL: Model name to use (e.g., minimax-m2.5-free)
//
// Optional env vars:
// - STREAM_TIMEOUT_MS: Request timeout (default: 60000ms)
// - MAX_TOKENS: Max tokens to generate (default: 8192)
// - EXTRA_HEADERS: Additional headers (format: "key:value,key2:value2")

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: string;
  content: string;
  imageUrls?: string[];
}

interface RequestBody {
  messages: Message[];
  systemPrompt?: string;
  stream?: boolean;
}

// Timeout wrapper to prevent hanging requests
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    )
  ]);
}

// Parse stream line (Handles Anthropic/OpenCode format)
function parseStreamLine(line: string): { content?: string; done?: boolean } | null {
  const trimmed = line.trim();
  
  // Handle end of stream
  if (trimmed === "[DONE]") return { done: true };
  
  // Skip empty lines or event lines (we only care about data lines)
  if (!trimmed || !trimmed.startsWith("data: ")) return null;

  const jsonStr = trimmed.slice(6); // Remove "data: "
  if (!jsonStr) return null;

  try {
    const data = JSON.parse(jsonStr);
    
    // Anthropic/OpenCode specific parsing
    if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
      return { content: data.delta.text };
    }
    
    if (data.type === 'message_stop') {
      return { done: true };
    }
    
    return null;
  } catch (e) {
    // JSON parse errors are common with partial chunks, ignore them
    return null;
  }
}

// Parse non-streaming response
function parseNonStreamResponse(data: any): string {
  if (data.content?.[0]?.text) {
    return data.content[0].text;
  }
  if (typeof data.content === 'string') {
    return data.content;
  }
  return '';
}

serve(async (req: Request) => {
  // Handle CORS preflight
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

    // --- Configuration ---
    const API_KEY = Deno.env.get("API_KEY");
    const MODEL = Deno.env.get("MODEL") || "minimax-m2.5-free";
    // Hardcoded for OpenCode based on your request
    const BASE_URL = "https://opencode.ai/zen/v1/messages"; 
    
    const MAX_TOKENS = parseInt(Deno.env.get("MAX_TOKENS") || "8192");
    const REQUEST_TIMEOUT_MS = parseInt(Deno.env.get("STREAM_TIMEOUT_MS") || "60000");
    const EXTRA_HEADERS = Deno.env.get("EXTRA_HEADERS");

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "API_KEY not configured in environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CONFIG] Model: ${MODEL}, Stream: ${stream}`);

    // --- Request Body Construction ---

    const requestBody: any = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      stream: stream,
    };

    // 1. Handle System Prompt (Anthropic Style)
    // NOTE: We do NOT prepend this to the user message.
    if (systemPrompt) {
      requestBody.system = [{ type: "text", text: systemPrompt }];
    }

    // 2. Handle Messages (Support for Multimodal Images)
    const hasImages = messages.some(msg => msg.imageUrls && msg.imageUrls.length > 0);

    if (hasImages) {
      // Transform messages into Anthropic content block format: [{type: "text"}, {type: "image"}]
      requestBody.messages = messages.map(msg => {
        const contentBlocks: any[] = [];

        // Add Text Block
        if (msg.content) {
          contentBlocks.push({ type: "text", text: msg.content });
        }

        // Add Image Blocks
        if (msg.imageUrls) {
          for (const imageUrl of msg.imageUrls) {
            if (imageUrl.startsWith('data:')) {
              // Base64 Image
              const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (matches) {
                contentBlocks.push({
                  type: "image",
                  source: { 
                    type: "base64", 
                    media_type: matches[1], 
                    data: matches[2] 
                  }
                });
              }
            } else {
              // URL Image
              contentBlocks.push({
                type: "image",
                source: { type: "url", url: imageUrl }
              });
            }
          }
        }

        return { role: msg.role, content: contentBlocks };
      });
    } else {
      // Simple Text Messages
      requestBody.messages = messages;
    }

    // --- Execute Request ---

    const commonHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": API_KEY,
    };

    if (EXTRA_HEADERS) {
      EXTRA_HEADERS.split(',').forEach(h => {
        const [key, val] = h.split(':').map(s => s.trim());
        if (key && val) commonHeaders[key] = val;
      });
    }

    // --- Streaming Mode ---
    if (stream) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            const fetchPromise = fetch(BASE_URL, {
              method: "POST",
              headers: commonHeaders,
              body: JSON.stringify(requestBody),
            });

            const response = await withTimeout(fetchPromise, REQUEST_TIMEOUT_MS);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[STREAM] API Error ${response.status}: ${errorText}`);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorText })}\n\n`));
              controller.close();
              return;
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              
              if (done) break;

              // Decode chunk and handle buffer for split lines
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              // Keep the last partial line in the buffer
              buffer = lines.pop() || "";

              for (const line of lines) {
                const result = parseStreamLine(line);
                
                if (result?.content) {
                  // Forward standardized format to frontend
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: result.content })}\n\n`));
                }
                
                if (result?.done) {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  controller.close();
                  return;
                }
              }
            }

            // Flush any remaining buffer
            if (buffer.trim()) {
                const result = parseStreamLine(buffer);
                if (result?.content) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: result.content })}\n\n`));
            }
            
            controller.close();

          } catch (error) {
            console.error("[STREAM] Exception:", error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(responseStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // --- Non-Streaming Mode ---
    const response = await withTimeout(fetch(BASE_URL, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ ...requestBody, stream: false }),
    }), REQUEST_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `API Error (${response.status}): ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = parseNonStreamResponse(data);

    return new Response(
      JSON.stringify({ content, model: MODEL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Fatal Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});