-- RLS policies for system templates
-- Allow all authenticated users to view system templates regardless of organization
-- Run this in Supabase SQL Editor

-- Allow all users to view system templates
CREATE POLICY "Users can view system templates"
  ON templates FOR SELECT
  USING (is_system_template = true);

-- Allow all users to view template items of system templates
CREATE POLICY "Users can view system template items"
  ON template_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND templates.is_system_template = true
    )
  );
