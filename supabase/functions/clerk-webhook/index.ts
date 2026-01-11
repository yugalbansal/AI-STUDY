/**
 * Clerk Webhook Handler for Supabase Edge Function
 * 
 * This function handles Clerk webhook events to sync users to Supabase database.
 * 
 * Events handled:
 * - user.created: Create new user in Supabase
 * - user.updated: Update user in Supabase
 * - user.deleted: Delete user from Supabase
 * 
 * Setup:
 * 1. Deploy this function: `supabase functions deploy clerk-webhook`
 * 2. Get function URL: `https://your-project.supabase.co/functions/v1/clerk-webhook`
 * 3. Add webhook in Clerk Dashboard → Webhooks
 * 4. Set CLERK_WEBHOOK_SECRET in Supabase Edge Function secrets
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/svix@1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

interface ClerkUserEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    email_addresses: Array<{
      id: string;
      email_address: string;
    }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const CLERK_WEBHOOK_SECRET = Deno.env.get('CLERK_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_KEY');

    const missing: string[] = [];
    if (!CLERK_WEBHOOK_SECRET) missing.push('CLERK_WEBHOOK_SECRET');
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (missing.length > 0) {
      console.error('Missing required env vars:', missing);
      return new Response(
        JSON.stringify({ error: 'Missing required env vars', missing }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Svix headers for webhook verification
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('Missing Svix headers');
      return new Response(
        JSON.stringify({ error: 'Missing Svix headers', has: {
          'svix-id': !!svixId,
          'svix-timestamp': !!svixTimestamp,
          'svix-signature': !!svixSignature,
        } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const body = await req.text();

    // Verify webhook signature
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    let evt: ClerkUserEvent;

    try {
      evt = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkUserEvent;
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Webhook verification failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('Webhook event received:', evt.type, 'for user:', evt.data.id);

    // Handle user.created and user.updated events
    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const { id, email_addresses, primary_email_address_id, first_name, last_name } = evt.data;

      // Get primary email
      const primaryEmail = email_addresses.find(
        (e) => e.id === primary_email_address_id
      )?.email_address;

      if (!primaryEmail) {
        console.error('No primary email found for user:', id);
        return new Response(
          JSON.stringify({ error: 'No primary email found', userId: id }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Construct full name
      const fullName = [first_name, last_name].filter(Boolean).join(' ') || null;

      // Sync user to Supabase
      const { error } = await supabase.rpc('sync_clerk_user', {
        clerk_user_id: id,
        user_email: primaryEmail,
        user_name: fullName,
      });

      if (error) {
        console.error('Error syncing user to Supabase:', error);
        return new Response(
          JSON.stringify({ error: 'Supabase sync failed', details: error.message, code: (error as any).code ?? null }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ User synced successfully:', id, primaryEmail);
    }

    // Handle user.deleted event
    if (evt.type === 'user.deleted') {
      const { id } = evt.data;

      // Delete user from Supabase (cascade will delete related data)
      const { error } = await supabase.from('users').delete().eq('id', id);

      if (error) {
        console.error('Error deleting user from Supabase:', error);
        return new Response(
          JSON.stringify({ error: 'Supabase delete failed', details: error.message, code: (error as any).code ?? null }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ User deleted successfully:', id);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
