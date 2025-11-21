-- ============================================
-- 組織・ユーザー管理テーブル定義
-- ============================================

BEGIN;

-- organizations テーブル
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  approval_levels SMALLINT NOT NULL DEFAULT 0,
  logo_url TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);

-- users テーブル
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'inspector' CHECK (role IN ('admin','approver','inspector','viewer')),
  approval_level SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- invitations テーブル（組織内招待用）
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'inspector' CHECK (role IN ('admin','approver','inspector','viewer')),
  approval_level SMALLINT NOT NULL DEFAULT 0,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

COMMIT;
