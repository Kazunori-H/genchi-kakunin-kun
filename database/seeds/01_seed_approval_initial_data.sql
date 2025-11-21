-- ============================================
-- 承認ワークフロー初期データ投入
-- ============================================

BEGIN;

-- 1. 既存ユーザーに管理者ロールを付与（組織ごとに最初のユーザーを管理者に）
UPDATE users
SET role = 'admin'
WHERE id IN (
  SELECT DISTINCT ON (organization_id) id
  FROM users
  ORDER BY organization_id, created_at
);

-- 2. 組織設定の初期化
INSERT INTO organization_settings (organization_id, require_approval, default_approver_id)
SELECT
  o.id,
  true,
  (
    SELECT u.id
    FROM users u
    WHERE u.organization_id = o.id AND u.role = 'admin'
    ORDER BY u.created_at
    LIMIT 1
  )
FROM organizations o
ON CONFLICT (organization_id) DO NOTHING;

COMMIT;

-- 確認クエリ
SELECT
  u.name,
  u.email,
  u.role,
  o.name as organization_name
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE u.role = 'admin';

SELECT
  o.name as organization_name,
  os.require_approval,
  u.name as default_approver_name,
  u.email as default_approver_email
FROM organization_settings os
JOIN organizations o ON o.id = os.organization_id
LEFT JOIN users u ON u.id = os.default_approver_id;
