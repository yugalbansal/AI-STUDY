// Supabase Edge Function: generate-embedding
// Purpose: Generate embeddings using OpenRouter API (server-side to avoid CORS)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/embeddings";
const EMBEDDING_MODEL = "openai/text-embedding-3-small"; // Free model
const EXPECTED_EMBEDDING_DIMS = Number(Deno.env.get("EMBEDDING_DIMS") ?? "1536");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  text: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { text }: RequestBody = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid request: 'text' field is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip empty or very short text
    if (text.trim().length < 15) {
      return new Response(
        JSON.stringify({ error: "Text too short (minimum 15 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OpenRouter API key from secrets
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not configured");
    }

    // Call OpenRouter embeddings API
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://auth.yugal.site",
        "X-Title": "AI Study Platform - Embeddings",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Extract embedding from OpenRouter response
    // OpenRouter returns: { data: [{ embedding: [...] }] }
    const embedding = data.data?.[0]?.embedding;

    if (!Array.isArray(embedding)) {
      throw new Error("Invalid embedding format from OpenRouter API");
    }

    // Validate dimensions to avoid DB vector(n) mismatch
    if (Number.isFinite(EXPECTED_EMBEDDING_DIMS) && EXPECTED_EMBEDDING_DIMS > 0) {
      if (embedding.length !== EXPECTED_EMBEDDING_DIMS) {
        console.error(
          `Embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMS}, got ${embedding.length}. Model=${EMBEDDING_MODEL}`
        );
        return new Response(
          JSON.stringify({
            error: `Embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMS}, got ${embedding.length}.`,
            model: EMBEDDING_MODEL,
            expected_dims: EXPECTED_EMBEDDING_DIMS,
            actual_dims: embedding.length
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ embedding }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating embedding:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
