// Supabase Edge Function: chat-completion
// Purpose: Handle OpenCode (Anthropic-compatible) chat completions with streaming support

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: string;
  content: string;
}

interface RequestBody {
  messages: Message[];
  systemPrompt?: string;
  stream?: boolean;
}

// Timeout wrapper for fetch calls
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    )
  ]);
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

    // Read config from environment
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const ANTHROPIC_BASE_URL = Deno.env.get("ANTHROPIC_BASE_URL") || "https://opencode.ai/zen";
    const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") || "minimax-m2.5-free";

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages array with system prompt prepended to first user message
    let anthropicMessages: Message[];
    if (systemPrompt) {
      anthropicMessages = messages.map((msg, index) => {
        if (msg.role === "user" && index === 0) {
          return { role: msg.role, content: `${systemPrompt}\n\n${msg.content}` };
        }
        return msg;
      });
    } else {
      anthropicMessages = messages;
    }

    console.log(`Using model: ${ANTHROPIC_MODEL} from ${ANTHROPIC_BASE_URL}, stream: ${stream}`);

    const REQUEST_TIMEOUT_MS = 60000; // 60 second timeout

    if (stream) {
      // Streaming mode - use Server-Sent Events
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const responsePromise = fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${ANTHROPIC_API_KEY}`,
                "Content-Type": "application/json",
                "anthropic-beta": "prompt-caching-2025-05-14",
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: ANTHROPIC_MODEL,
                messages: anthropicMessages,
                max_tokens: 8192,
                stream: true,
              }),
            });

            const response = await withTimeout(responsePromise, REQUEST_TIMEOUT_MS);

            if (!response.ok) {
              const errorText = await response.text();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `API error: ${response.status} - ${errorText}` })}\n\n`));
              controller.close();
              return;
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]" || trimmed === "event: message_stop") continue;
                if (!trimmed.startsWith("data: ") && !trimmed.startsWith("event: ")) continue;

                // Handle both "data: " and plain "event: " formats
                const jsonStr = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed.slice(6);
                if (!jsonStr) continue;

                try {
                  const data = JSON.parse(jsonStr);

                  // Handle content block messages
                  if (data.type === "content_block_delta" && data.delta?.text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data.delta.text })}\n\n`));
                  }
                  // Handle completion
                  if (data.type === "message_stop") {
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  }
                } catch (e) {
                  // Ignore parse errors for non-JSON lines
                }
              }
            }

            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message || "Streaming failed" })}\n\n`));
            controller.close();
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

    // Non-streaming mode
    const responsePromise = fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ANTHROPIC_API_KEY}`,
        "Content-Type": "application/json",
        "anthropic-beta": "prompt-caching-2025-05-14",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        messages: anthropicMessages,
        max_tokens: 8192,
      }),
    });

    const response = await withTimeout(responsePromise, REQUEST_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenCode API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenCode API error (${response.status}): ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Extract content from Anthropic-style response
    const contentBlocks = data.content || [];
    const textBlock = contentBlocks.find((b: any) => b.type === "text");
    const content = textBlock?.text || "";

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Model returned empty response. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        content,
        model: ANTHROPIC_MODEL,
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
