-- Add support for system templates that cannot be edited or deleted
-- Run this in Supabase SQL Editor

-- Add is_system_template column to templates table
ALTER TABLE templates
  ADD COLUMN is_system_template BOOLEAN NOT NULL DEFAULT false;

-- Add comment to clarify the column
COMMENT ON COLUMN templates.is_system_template IS 'System templates cannot be edited or deleted';
