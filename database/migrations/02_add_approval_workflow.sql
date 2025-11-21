-- ============================================
-- 承認ワークフロー機能追加マイグレーション
-- ============================================

BEGIN;

-- 1. ユーザーロールの追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'inspector';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('inspector', 'approver', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_organization_role ON users(organization_id, role);

-- 2. inspectionsテーブルの拡張

-- 既存の 'submitted' ステータスを 'pending_approval' に変更
UPDATE inspections
SET status = 'pending_approval'
WHERE status = 'submitted';

-- 新しいカラムを追加
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES users(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- 既存の pending_approval レコードに submitted_at を設定（created_at と同じ値）
UPDATE inspections
SET submitted_at = created_at
WHERE status = 'pending_approval' AND submitted_at IS NULL;

-- 制約を更新
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE inspections ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_approver ON inspections(approver_id);

-- 3. 承認履歴テーブル
CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'return')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_logs_inspection ON approval_logs(inspection_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_created_at ON approval_logs(created_at DESC);

ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approval logs in their organization" ON approval_logs;
CREATE POLICY "Users can view approval logs in their organization"
  ON approval_logs FOR SELECT
  USING (
    inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create approval logs" ON approval_logs;
CREATE POLICY "Users can create approval logs"
  ON approval_logs FOR INSERT
  WITH CHECK (
    inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE u.id = auth.uid()
    )
  );

-- 4. 組織設定テーブル
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  default_approver_id UUID REFERENCES users(id),
  require_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization settings" ON organization_settings;
CREATE POLICY "Users can view their organization settings"
  ON organization_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage their organization settings" ON organization_settings;
CREATE POLICY "Admins can manage their organization settings"
  ON organization_settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMIT;
