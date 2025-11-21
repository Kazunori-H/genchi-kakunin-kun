-- ============================================
-- RLSポリシーの確認と修正
-- ============================================

-- 現在のinspectionsテーブルのRLSポリシーを確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'inspections'
ORDER BY policyname;
