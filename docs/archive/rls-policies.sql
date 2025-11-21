-- ============================================
-- Row Level Security (RLS) Policies
-- 現地確認くん - Multi-tenant Security
-- ============================================

-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper Function: Get Current User's Organization ID
-- ============================================
CREATE OR REPLACE FUNCTION public.user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- Organizations Table Policies
-- ============================================

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = public.user_organization_id());

-- Admins can update their own organization
CREATE POLICY "Admins can update own organization"
  ON organizations FOR UPDATE
  USING (
    id = public.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- Users Table Policies
-- ============================================

-- Users can view users in their organization
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (organization_id = public.user_organization_id());

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Admins can insert users in their organization
CREATE POLICY "Admins can create users"
  ON users FOR INSERT
  WITH CHECK (
    organization_id = public.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update users in their organization
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (
    organization_id = public.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- ============================================
-- Sites Table Policies
-- ============================================

-- Users can view sites in their organization
CREATE POLICY "Users can view org sites"
  ON sites FOR SELECT
  USING (organization_id = public.user_organization_id());

-- Users and admins can create sites
CREATE POLICY "Users can create sites"
  ON sites FOR INSERT
  WITH CHECK (organization_id = public.user_organization_id());

-- Users and admins can update sites
CREATE POLICY "Users can update sites"
  ON sites FOR UPDATE
  USING (organization_id = public.user_organization_id());

-- Admins can delete sites
CREATE POLICY "Admins can delete sites"
  ON sites FOR DELETE
  USING (
    organization_id = public.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- Templates Table Policies
-- ============================================

-- Users can view templates in their organization
CREATE POLICY "Users can view org templates"
  ON templates FOR SELECT
  USING (organization_id = public.user_organization_id());

-- Users and admins can create templates
CREATE POLICY "Users can create templates"
  ON templates FOR INSERT
  WITH CHECK (organization_id = public.user_organization_id());

-- Users and admins can update templates
CREATE POLICY "Users can update templates"
  ON templates FOR UPDATE
  USING (organization_id = public.user_organization_id());

-- Admins can delete templates
CREATE POLICY "Admins can delete templates"
  ON templates FOR DELETE
  USING (
    organization_id = public.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- Template Items Table Policies
-- ============================================

-- Users can view template items for templates in their org
CREATE POLICY "Users can view org template items"
  ON template_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND templates.organization_id = public.user_organization_id()
    )
  );

-- Users can create template items for their org templates
CREATE POLICY "Users can create template items"
  ON template_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND templates.organization_id = public.user_organization_id()
    )
  );

-- Users can update template items for their org templates
CREATE POLICY "Users can update template items"
  ON template_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND templates.organization_id = public.user_organization_id()
    )
  );

-- Users can delete template items for their org templates
CREATE POLICY "Users can delete template items"
  ON template_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND templates.organization_id = public.user_organization_id()
    )
  );

-- ============================================
-- Inspections Table Policies
-- ============================================

-- Users can view inspections in their organization
CREATE POLICY "Users can view org inspections"
  ON inspections FOR SELECT
  USING (organization_id = public.user_organization_id());

-- Users can create inspections
CREATE POLICY "Users can create inspections"
  ON inspections FOR INSERT
  WITH CHECK (
    organization_id = public.user_organization_id() AND
    inspector_id = auth.uid()
  );

-- Inspectors can update their own inspections (draft status)
CREATE POLICY "Inspectors can update own inspections"
  ON inspections FOR UPDATE
  USING (
    organization_id = public.user_organization_id() AND
    inspector_id = auth.uid() AND
    status = 'draft'
  );

-- Admins can update any inspection in their org
CREATE POLICY "Admins can update inspections"
  ON inspections FOR UPDATE
  USING (
    organization_id = public.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Approvers can update inspections for approval
CREATE POLICY "Approvers can update for approval"
  ON inspections FOR UPDATE
  USING (
    organization_id = public.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.approval_level > 0
    )
  );

-- Admins can delete inspections
CREATE POLICY "Admins can delete inspections"
  ON inspections FOR DELETE
  USING (
    organization_id = public.user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- Inspection Items Table Policies
-- ============================================

-- Users can view inspection items for inspections in their org
CREATE POLICY "Users can view org inspection items"
  ON inspection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_items.inspection_id
      AND inspections.organization_id = public.user_organization_id()
    )
  );

-- Inspectors can create items for their inspections
CREATE POLICY "Inspectors can create inspection items"
  ON inspection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_items.inspection_id
      AND inspections.inspector_id = auth.uid()
      AND inspections.status = 'draft'
    )
  );

-- Inspectors can update items for their draft inspections
CREATE POLICY "Inspectors can update inspection items"
  ON inspection_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_items.inspection_id
      AND inspections.inspector_id = auth.uid()
      AND inspections.status = 'draft'
    )
  );

-- Admins can update inspection items
CREATE POLICY "Admins can update inspection items"
  ON inspection_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_items.inspection_id
      AND inspections.organization_id = public.user_organization_id()
    ) AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Inspectors can delete items from their draft inspections
CREATE POLICY "Inspectors can delete inspection items"
  ON inspection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_items.inspection_id
      AND inspections.inspector_id = auth.uid()
      AND inspections.status = 'draft'
    )
  );

-- ============================================
-- Photos Table Policies
-- ============================================

-- Users can view photos for inspections in their org
CREATE POLICY "Users can view org photos"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = photos.inspection_id
      AND inspections.organization_id = public.user_organization_id()
    )
  );

-- Inspectors can upload photos for their inspections
CREATE POLICY "Inspectors can upload photos"
  ON photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = photos.inspection_id
      AND inspections.inspector_id = auth.uid()
      AND inspections.status = 'draft'
    )
  );

-- Inspectors can update photos for their draft inspections
CREATE POLICY "Inspectors can update photos"
  ON photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = photos.inspection_id
      AND inspections.inspector_id = auth.uid()
      AND inspections.status = 'draft'
    )
  );

-- Admins can update photos
CREATE POLICY "Admins can update photos"
  ON photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = photos.inspection_id
      AND inspections.organization_id = public.user_organization_id()
    ) AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Inspectors can delete photos from their draft inspections
CREATE POLICY "Inspectors can delete photos"
  ON photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = photos.inspection_id
      AND inspections.inspector_id = auth.uid()
      AND inspections.status = 'draft'
    )
  );

-- ============================================
-- Approval Logs Table Policies
-- ============================================

-- Users can view approval logs for inspections in their org
CREATE POLICY "Users can view org approval logs"
  ON approval_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = approval_logs.inspection_id
      AND inspections.organization_id = public.user_organization_id()
    )
  );

-- Approvers can create approval logs
CREATE POLICY "Approvers can create logs"
  ON approval_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = approval_logs.inspection_id
      AND inspections.organization_id = public.user_organization_id()
    ) AND
    approver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.approval_level > 0
    )
  );

-- ============================================
-- END OF RLS POLICIES
-- ============================================
