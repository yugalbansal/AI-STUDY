/*
  # Add user tracking features
  
  1. Changes
    - Add last_seen timestamp column to users table
    - Add is_online boolean column to users table
    - Create function to automatically update last_seen
    - Create trigger for updating last_seen
*/

-- Add user tracking fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- Create function to update last_seen
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_seen
DROP TRIGGER IF EXISTS update_user_last_seen ON users;
CREATE TRIGGER update_user_last_seen
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_seen();