-- ============================================
-- inspections テーブルの RLS ポリシー修正
-- ============================================

BEGIN;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view inspections in their organization" ON inspections;
DROP POLICY IF EXISTS "Users can create inspections in their organization" ON inspections;
DROP POLICY IF EXISTS "Users can update inspections in their organization" ON inspections;
DROP POLICY IF EXISTS "Users can delete inspections in their organization" ON inspections;
DROP POLICY IF EXISTS "Users can update their own draft inspections" ON inspections;
DROP POLICY IF EXISTS "Users can update their own inspections" ON inspections;

-- SELECT: 組織内の確認記録を閲覧可能
CREATE POLICY "Users can view inspections in their organization"
  ON inspections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- INSERT: 組織内に確認記録を作成可能
CREATE POLICY "Users can create inspections in their organization"
  ON inspections FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND inspector_id = auth.uid()
  );

-- UPDATE: 自分が作成した確認記録を更新可能（ステータス制限なし）
CREATE POLICY "Users can update their own inspections"
  ON inspections FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND inspector_id = auth.uid()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND inspector_id = auth.uid()
  );

-- DELETE: 自分が作成した下書きのみ削除可能
CREATE POLICY "Users can delete their own draft inspections"
  ON inspections FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND inspector_id = auth.uid()
    AND status = 'draft'
  );

COMMIT;

-- 確認
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'inspections'
ORDER BY policyname;
