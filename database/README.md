# データベースマイグレーション

## 📂 ディレクトリ構成

```
database/
├── migrations/     # マイグレーションファイル（番号順に実行）
└── seeds/          # 初期データ投入
```

---

## 🔄 マイグレーション実行手順

### 前提条件
- Supabaseプロジェクトが作成済み
- SQL Editorにアクセス可能

### 実行順序

**必ず以下の順序で実行してください:**

#### 1. 基本スキーマ作成
```
migrations/01_initial_schema.sql
```
- organizations, users, sites, templates, inspections などの基本テーブル作成
- RLSポリシーの設定

#### 2. 承認ワークフロー追加
```
migrations/02_add_approval_workflow.sql
```
- approval_settings, approval_requests, approval_actions テーブル作成
- 承認フロー用のRLSポリシー

#### 3. システムテンプレート機能追加
```
migrations/03_add_system_template_support.sql
```
- templates.is_system_template カラム追加

#### 4. システムテンプレート用RLS追加
```
migrations/04_add_system_template_rls.sql
```
- システムテンプレート読み取り専用ポリシー

#### 5. 取り下げアクション追加
```
migrations/05_add_withdraw_action.sql
```
- approval_requests.withdrawn_at カラム追加
- 取り下げ機能

#### 6. 確認記録の概要フィールド追加
```
migrations/06_add_inspection_overview_fields.sql
```
- inspections.overview_metadata (JSONB) - 時刻・立会者情報
- sites.facility_types (TEXT[]) - 施設種別（複数選択）
- template_items.display_facility_types (JSONB) - 表示条件

---

## 🌱 初期データ投入

マイグレーション実行後、以下の順序で実行:

#### 1. 承認設定の初期データ
```
seeds/01_seed_approval_initial_data.sql
```

#### 2. 基本テンプレートの投入
```
seeds/02_seed_basic_template.sql
```

---

## ✅ 確認方法

### すべてのテーブルが作成されたか確認
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### システムテンプレートが投入されたか確認
```sql
SELECT id, name, is_system_template, is_default
FROM templates
WHERE is_system_template = true;
```

期待される結果: 1件（基本テンプレート）

---

## 🔙 ロールバック

**注意**: データが失われます。本番環境では慎重に実行してください。

### すべてのテーブルを削除
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

その後、マイグレーションを最初から実行。

---

## 📝 マイグレーション作成ガイドライン

新しいマイグレーションを作成する場合:

1. **命名規則**: `XX_description.sql` (XX = 番号)
2. **冪等性**: `IF NOT EXISTS` を使用
3. **トランザクション**: `BEGIN; ... COMMIT;` で囲む
4. **コメント**: 各変更内容を説明
5. **確認クエリ**: ファイル末尾に確認用SQLを追加

### テンプレート例
```sql
-- ============================================
-- 説明: 新機能の追加
-- ============================================

BEGIN;

-- テーブル変更
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS new_column TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_name ON table_name (column);

COMMIT;

-- 確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'table_name' AND column_name = 'new_column';
```

---

## トラブルシューティング

問題が発生した場合は `/docs/TROUBLESHOOTING.md` を参照してください。
