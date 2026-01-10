-- Adds configurable admin email allowlist and ensures sync_clerk_user can promote existing users to admin.

CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY
);

-- Seed with the existing admin email used in earlier migration (safe if already present)
INSERT INTO public.admin_emails (email)
VALUES ('studyai.platform@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Lock down the table (no public access by default)
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Recreate sync function so it can PROMOTE users to admin when applicable,
-- without ever demoting an existing admin.
CREATE OR REPLACE FUNCTION public.sync_clerk_user(
  clerk_user_id text,
  user_email text,
  user_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_user_id text;
  user_role text := CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.admin_emails a
      WHERE lower(a.email) = lower(user_email)
    ) THEN 'admin'
    ELSE 'user'
  END;
BEGIN
  -- If this email already exists under a different user id (common when mixing
  -- Clerk dev/prod instances against the same Supabase DB), migrate all data to
  -- the incoming Clerk user id.
  SELECT id
  INTO existing_user_id
  FROM public.users
  WHERE lower(email) = lower(user_email)
  LIMIT 1;

  IF existing_user_id IS NOT NULL AND existing_user_id <> clerk_user_id THEN
    UPDATE public.chats SET user_id = clerk_user_id WHERE user_id = existing_user_id;
    UPDATE public.chat_messages SET user_id = clerk_user_id WHERE user_id = existing_user_id;
    UPDATE public.chat_history SET user_id = clerk_user_id WHERE user_id = existing_user_id;
    UPDATE public.documents SET user_id = clerk_user_id WHERE user_id = existing_user_id;
    UPDATE public.chat_embeddings SET user_id = clerk_user_id WHERE user_id = existing_user_id;
    UPDATE public.document_embeddings SET user_id = clerk_user_id WHERE user_id = existing_user_id;

    IF to_regclass('public.user_sessions') IS NOT NULL THEN
      EXECUTE 'UPDATE public.user_sessions SET user_id = $1 WHERE user_id = $2'
      USING clerk_user_id, existing_user_id;
    END IF;

    DELETE FROM public.users WHERE id = existing_user_id;
  END IF;

  INSERT INTO public.users (id, email, full_name, role, last_seen, is_online)
  VALUES (
    clerk_user_id,
    user_email,
    COALESCE(user_name, split_part(user_email, '@', 1)),
    user_role,
    NOW(),
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, users.email),
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = CASE
      WHEN user_role = 'admin' THEN 'admin'
      ELSE users.role
    END,
    last_seen = NOW(),
    is_online = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_clerk_user TO authenticated, anon;
