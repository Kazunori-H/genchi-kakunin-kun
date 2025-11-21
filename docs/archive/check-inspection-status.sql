-- ============================================
-- 確認記録のステータス確認
-- ============================================

-- 特定のIDの確認記録を確認
SELECT
  id,
  status,
  submitted_at,
  approver_id,
  created_at,
  updated_at,
  inspector_id
FROM inspections
WHERE id = '6b566fa7-f57a-4dbc-8c90-936db059549e';

-- このユーザーの全確認記録を確認
SELECT
  id,
  status,
  submitted_at,
  created_at,
  sites.name as site_name
FROM inspections
JOIN sites ON sites.id = inspections.site_id
WHERE inspector_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
