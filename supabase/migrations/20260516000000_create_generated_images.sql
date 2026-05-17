-- Store metadata for images generated from chat and the image page.
-- Image files stay at their generated URL for now; add a storage bucket later
-- if permanent blob copies are needed.

CREATE TABLE IF NOT EXISTS generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES chats(id) ON DELETE SET NULL,
  message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  enhanced_prompt text,
  image_url text NOT NULL,
  model text,
  seed integer,
  width integer,
  height integer,
  source text NOT NULL DEFAULT 'chat' CHECK (source IN ('chat', 'image_page')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_images_user_created_idx
  ON generated_images (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS generated_images_chat_idx
  ON generated_images (chat_id);

ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generated_images_select_own" ON generated_images;
CREATE POLICY "generated_images_select_own"
  ON generated_images FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

DROP POLICY IF EXISTS "generated_images_select_admin" ON generated_images;
CREATE POLICY "generated_images_select_admin"
  ON generated_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (auth.jwt()->>'sub')::text
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "generated_images_insert_own" ON generated_images;
CREATE POLICY "generated_images_insert_own"
  ON generated_images FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

DROP POLICY IF EXISTS "generated_images_update_own" ON generated_images;
CREATE POLICY "generated_images_update_own"
  ON generated_images FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id)
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

DROP POLICY IF EXISTS "generated_images_delete_own" ON generated_images;
CREATE POLICY "generated_images_delete_own"
  ON generated_images FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);
