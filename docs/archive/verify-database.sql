-- Verify database schema is correct
-- Run this in Supabase SQL Editor to check if tables are set up correctly

-- Check organizations table structure
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- Check users table structure
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'users', 'sites', 'templates', 'inspections')
ORDER BY table_name;
