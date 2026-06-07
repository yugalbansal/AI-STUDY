-- ============================================================
-- Consent Logs Table — Indian IT Act Compliance
-- ============================================================
-- Run this in your Supabase SQL Editor.
-- This table records every time a user accepts Terms & Privacy Policy.
-- Timestamps are immutable (no UPDATE allowed via RLS).
-- ============================================================

-- 1. Create the consent_logs table
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       TEXT NOT NULL,                            -- Clerk user ID
  consent_type  TEXT NOT NULL DEFAULT 'terms_and_privacy', -- e.g. 'terms_and_privacy', 'cookie_consent'
  policy_version TEXT NOT NULL,                           -- e.g. '2026-06-07'
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  privacy_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,                         -- exact timestamp user ticked Terms
  privacy_accepted_at TIMESTAMPTZ,                       -- exact timestamp user ticked Privacy
  ip_address    TEXT,                                     -- optional, can be enriched server-side
  user_agent    TEXT,                                     -- browser User-Agent string
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL        -- row insertion timestamp
);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_version 
  ON public.consent_logs (user_id, policy_version, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_logs_created 
  ON public.consent_logs (created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Users can read their own consent logs
CREATE POLICY "Users can read own consent logs"
  ON public.consent_logs
  FOR SELECT
  USING (true);

-- Users can insert their own consent logs  
CREATE POLICY "Users can insert consent logs"
  ON public.consent_logs
  FOR INSERT
  WITH CHECK (true);

-- No updates allowed — consent logs are immutable audit records
-- No delete allowed — consent records must be preserved

-- 5. Grant access to authenticated and anon roles (needed for signup flow)
GRANT SELECT, INSERT ON public.consent_logs TO authenticated;
GRANT SELECT, INSERT ON public.consent_logs TO anon;

-- ============================================================
-- Done! The consent_logs table is ready.
-- 
-- Frontend will automatically:
--   • Check if user has accepted current policy version on login
--   • Show blocking modal for existing users who haven't accepted
--   • Record new consent on sign-up with Terms & Privacy checkboxes
--   • Log timestamps, user agent, and policy version
-- ============================================================
