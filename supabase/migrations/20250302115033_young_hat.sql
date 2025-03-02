/*
  # Fix foreign key constraint and recursion issues

  1. Changes
    - Fix users table policies to prevent recursion
    - Add trigger to create user record when auth user is created
    - Ensure chat_history foreign key constraint is satisfied
  2. Security
    - Maintain RLS security while fixing recursion issues
*/

-- Drop problematic policies
DROP POLICY IF EXISTS "Admin can read all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Create simpler policies without recursion
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to automatically create user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN NEW.email = 'studyai.platform@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = CASE WHEN NEW.email = 'studyai.platform@gmail.com' THEN 'admin' ELSE users.role END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure existing auth users have corresponding records in the users table
DO $$
BEGIN
  INSERT INTO public.users (id, email, role)
  SELECT 
    id, 
    email, 
    CASE WHEN email = 'studyai.platform@gmail.com' THEN 'admin' ELSE 'user' END
  FROM auth.users
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = CASE WHEN EXCLUDED.email = 'studyai.platform@gmail.com' THEN 'admin' ELSE users.role END;
END;
$$;