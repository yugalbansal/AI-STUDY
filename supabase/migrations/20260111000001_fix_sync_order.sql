-- Fix sync_clerk_user to create user BEFORE migrating chats to avoid FK constraint violations

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
  -- Check if this email already exists under a different user id
  SELECT id
  INTO existing_user_id
  FROM public.users
  WHERE lower(email) = lower(user_email)
    AND id != clerk_user_id
  LIMIT 1;

  -- STEP 1: If email exists under different user, migrate data first, then delete old user
  IF existing_user_id IS NOT NULL THEN
    -- Create a temporary user record with new ID if it doesn't exist
    -- This prevents FK violations when migrating data
    INSERT INTO public.users (id, email, full_name, role, last_seen, is_online)
    VALUES (
      clerk_user_id,
      'temp_' || clerk_user_id || '@migration.temp',  -- Temporary email to avoid conflict
      COALESCE(user_name, split_part(user_email, '@', 1)),
      user_role,
      NOW(),
      true
    )
    ON CONFLICT (id) DO NOTHING;

    -- Migrate all data from old user to new user
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

    -- Delete the old user record (this frees up the email)
    DELETE FROM public.users WHERE id = existing_user_id;
  END IF;

  -- STEP 2: Now insert or update the user with correct email
  -- At this point, the email is free (either never existed or was freed by deleting old user)
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
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = CASE
      WHEN EXCLUDED.role = 'admin' THEN 'admin'
      ELSE users.role
    END,
    last_seen = NOW(),
    is_online = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_clerk_user TO authenticated, anon;
