-- Migration: Ensure all user_id columns are TEXT for Clerk compatibility
-- Users table is already TEXT, but need to check related tables

-- Check what columns need conversion by querying the schema
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Get all columns named 'user_id' that are NOT text
  FOR rec IN 
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND column_name = 'user_id' 
      AND data_type != 'text'
  LOOP
    RAISE NOTICE 'Found UUID user_id in table: %.%', rec.table_name, rec.column_name;
    
    -- Drop foreign key constraint if exists
    EXECUTE format('ALTER TABLE IF EXISTS %I DROP CONSTRAINT IF EXISTS %I_user_id_fkey', 
      rec.table_name, rec.table_name);
    
    -- Convert column to TEXT
    EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT', 
      rec.table_name);
    
    -- Recreate foreign key constraint
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
      rec.table_name, rec.table_name);
      
    RAISE NOTICE 'Converted %.user_id to TEXT', rec.table_name;
  END LOOP;
END $$;

-- Verify all conversions
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
ORDER BY table_name;
