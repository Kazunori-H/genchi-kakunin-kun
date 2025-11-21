-- ============================================
-- 確認記録の概要情報フィールド追加
-- ============================================

BEGIN;

-- inspectionsテーブルに概要メタデータカラムを追加
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS overview_metadata JSONB DEFAULT '{}';

-- インデックスの追加（JSONB検索の高速化）
CREATE INDEX IF NOT EXISTS idx_inspections_overview_metadata ON inspections USING gin (overview_metadata);

-- sitesテーブルに施設種別カラムを追加（複数選択対応）
ALTER TABLE sites ADD COLUMN IF NOT EXISTS facility_types TEXT[] DEFAULT '{}';

-- 既存のfacility_type（単一）からfacility_types（配列）へデータ移行
-- 既存データがある場合のみ実行
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sites' AND column_name = 'facility_type') THEN
    UPDATE sites
    SET facility_types = ARRAY[facility_type]::TEXT[]
    WHERE facility_type IS NOT NULL AND facility_type != '';

    -- 旧カラムと制約を削除
    ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_facility_type_check;
    ALTER TABLE sites DROP COLUMN IF EXISTS facility_type;
  END IF;
END $$;

-- 配列検索用のインデックス
CREATE INDEX IF NOT EXISTS idx_sites_facility_types ON sites USING gin (facility_types);

-- template_itemsテーブルに表示条件カラムを追加
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS display_facility_types JSONB DEFAULT '[]';

-- 表示条件検索用のインデックス
CREATE INDEX IF NOT EXISTS idx_template_items_display_facility_types ON template_items USING gin (display_facility_types);

-- コメントの追加
COMMENT ON COLUMN inspections.overview_metadata IS '概要メタデータ（時刻情報、立会者情報などをJSON形式で格納）';
COMMENT ON COLUMN sites.facility_types IS '施設種別（複数選択可）: transport（運搬）、transfer_storage（積替保管施設）、intermediate_treatment（中間処理施設）、final_disposal（最終処分場）';
COMMENT ON COLUMN template_items.display_facility_types IS 'チェックリスト項目の表示条件（施設種別）。空配列の場合はすべての施設種別で表示';

COMMIT;

-- 確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'inspections' AND column_name = 'overview_metadata';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sites' AND column_name = 'facility_types';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'template_items' AND column_name = 'display_facility_types';
