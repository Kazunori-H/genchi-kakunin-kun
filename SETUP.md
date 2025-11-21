# セットアップガイド

## 📋 目次

- [環境構築](#環境構築)
- [データベースセットアップ](#データベースセットアップ)
- [開発サーバー起動](#開発サーバー起動)
- [初期データ投入](#初期データ投入)

---

## 環境構築

### 必要な環境

- Node.js 18以上
- npm または yarn
- Supabase アカウント

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd genchi-kakunin-kun
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local` ファイルをプロジェクトルートに作成:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_INSPECTION_PHOTO_BUCKET=inspection-photos
```

### 4. Supabase Storageの設定

1. Supabaseダッシュボードで **inspection-photos** というStorageバケットを作成（名前は環境変数で変更可能）。
2. バケットは「Public」を推奨（Privateにする場合は署名付きURLを生成する必要があります）。
3. `database/storage/setup_inspection_photos.sql` をSupabase SQL Editorで実行（バケット作成〜RLS設定まで自動化）。バケット名を変える場合はファイル内の `'inspection-photos'` を一括置換してから実行してください。
4. 最大アップロードサイズは5MBなので、必要に応じてプロジェクト設定 > Storage で制限を確認・更新してください。

---

## データベースセットアップ

### 実行順序

以下の順番でSupabase SQL Editorで実行してください:

#### 1. 基本スキーマ作成

```bash
database/migrations/01_initial_schema.sql
```

**内容**: organizations, users, sites, templates, template_items, inspections, inspection_responses テーブルの作成

#### 2. 承認ワークフロー追加

```bash
database/migrations/02_add_approval_workflow.sql
```

**内容**: approval_settings, approval_requests, approval_actions テーブルの作成

#### 3. システムテンプレート機能追加

```bash
database/migrations/03_add_system_template_support.sql
```

**内容**: templates.is_system_template カラム追加

#### 4. システムテンプレート用RLS追加

```bash
database/migrations/04_add_system_template_rls.sql
```

**内容**: システムテンプレート用の読み取り専用RLSポリシー

#### 5. 取り下げアクション追加

```bash
database/migrations/05_add_withdraw_action.sql
```

**内容**: 承認申請の取り下げ機能

#### 6. 確認記録の概要フィールド追加

```bash
database/migrations/06_add_inspection_overview_fields.sql
```

**内容**:
- `inspections.overview_metadata` (JSONB) - 時刻情報、立会者情報
- `sites.facility_types` (TEXT[]) - 施設種別（複数選択対応）
- `template_items.display_facility_types` (JSONB) - 項目の表示条件

---

## 初期データ投入

マイグレーション実行後、以下の順番で初期データを投入:

#### 1. 承認設定の初期データ

```bash
database/seeds/01_seed_approval_initial_data.sql
```

**内容**: デフォルトの承認設定（承認者数など）

#### 2. 基本テンプレートの投入

```bash
database/seeds/02_seed_basic_template.sql
```

**内容**: 産業廃棄物処理業者向け標準チェックシート

---

## 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

---

## 確認事項

### データベースが正しくセットアップされたか確認

Supabase SQL Editorで以下を実行:

```sql
-- テーブル一覧確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- システムテンプレート確認
SELECT id, name, is_system_template, is_default
FROM templates
WHERE is_system_template = true;
```

期待される結果:
- 全テーブルが存在
- 基本テンプレートが1件存在

---

## トラブルシューティング

問題が発生した場合は `docs/TROUBLESHOOTING.md` を参照してください。

---

## 次のステップ

- [機能一覧](FEATURES.md) - 実装済み機能の詳細
- [開発ロードマップ](DEVELOPMENT-ROADMAP.md) - 今後の開発予定
