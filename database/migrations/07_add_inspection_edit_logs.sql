-- ============================================
-- 確認記録の編集履歴テーブル追加
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS inspection_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL DEFAULT 'update_overview',
  changed_fields TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  changes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspection_edit_logs_inspection ON inspection_edit_logs(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_edit_logs_created_at ON inspection_edit_logs(created_at DESC);

ALTER TABLE inspection_edit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view inspection edit logs in their organization" ON inspection_edit_logs;
CREATE POLICY "Users can view inspection edit logs in their organization"
  ON inspection_edit_logs FOR SELECT
  USING (
    inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert inspection edit logs" ON inspection_edit_logs;
CREATE POLICY "Users can insert inspection edit logs"
  ON inspection_edit_logs FOR INSERT
  WITH CHECK (
    inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE u.id = auth.uid()
    )
  );

COMMENT ON TABLE inspection_edit_logs IS '確認記録の概要編集履歴';
COMMENT ON COLUMN inspection_edit_logs.changed_fields IS '変更されたフィールド一覧';
COMMENT ON COLUMN inspection_edit_logs.changes IS '各フィールドの変更内容（before/after）';

COMMIT;

-- 確認
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'inspection_edit_logs';

SELECT indexname
FROM pg_indexes
WHERE tablename = 'inspection_edit_logs';
