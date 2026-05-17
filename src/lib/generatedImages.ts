import type { SupabaseClient } from '@supabase/supabase-js';

export type GeneratedImageSource = 'chat' | 'image_page';

export interface GeneratedImageRecord {
  id: string;
  user_id: string;
  chat_id: string | null;
  message_id: string | null;
  prompt: string;
  enhanced_prompt: string | null;
  image_url: string;
  model: string | null;
  seed: number | null;
  width: number | null;
  height: number | null;
  source: GeneratedImageSource;
  created_at: string;
}

export interface SaveGeneratedImagePayload {
  user_id: string;
  prompt: string;
  image_url: string;
  enhanced_prompt?: string | null;
  model?: string | null;
  seed?: number | null;
  width?: number | null;
  height?: number | null;
  source?: GeneratedImageSource;
  chat_id?: string | null;
  message_id?: string | null;
}

export async function saveGeneratedImageRecord(
  supabase: SupabaseClient,
  payload: SaveGeneratedImagePayload,
): Promise<GeneratedImageRecord | null> {
  const { data, error } = await supabase
    .from('generated_images')
    .insert({
      user_id: payload.user_id,
      chat_id: payload.chat_id ?? null,
      message_id: payload.message_id ?? null,
      prompt: payload.prompt,
      enhanced_prompt: payload.enhanced_prompt ?? null,
      image_url: payload.image_url,
      model: payload.model ?? null,
      seed: payload.seed ?? null,
      width: payload.width ?? null,
      height: payload.height ?? null,
      source: payload.source ?? 'chat',
    })
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as GeneratedImageRecord | null;
}
