-- Add reply_to column to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS reply_to TEXT;