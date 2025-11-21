# 基本テンプレートのセットアップ手順

このドキュメントでは、システムデフォルトの「基本テンプレート」をデータベースに追加する手順を説明します。

## 前提条件

- Supabaseプロジェクトが作成されている
- `migration.sql`が実行済みである
- Supabaseダッシュボードにアクセスできる

## セットアップ手順

### 1. スキーマ変更の適用

Supabaseダッシュボード → SQL Editor を開き、以下のSQLファイルを順番に実行してください。

#### 1-1. システムテンプレートサポートの追加

`add-system-template-support.sql` の内容を実行します。

```sql
-- Add support for system templates that cannot be edited or deleted

ALTER TABLE templates
  ADD COLUMN is_system_template BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN templates.is_system_template IS 'System templates cannot be edited or deleted';
```

**注意**: もし既にデータベースが最新の`migration.sql`から作成されている場合、このカラムは既に存在します。その場合はスキップしてください。

### 2. 基本テンプレートのシードデータを投入

`seed-basic-template.sql` の内容を実行します。

このSQLファイルは以下を実行します：
- 「基本テンプレート」を作成（編集・削除不可）
- 69個のチェック項目を作成（セクションヘッダー含む）

**重要な注意事項**:
- シードデータは固定UUID `00000000-0000-0000-0000-000000000001` を使用します
- `ON CONFLICT DO NOTHING` により、既に存在する場合はスキップされます
- 最初の組織IDを使用しますが、RLSポリシーにより全組織からアクセス可能になる予定です

### 3. RLSポリシーの更新（推奨）

システムテンプレートを全組織で参照できるようにするため、以下のRLSポリシーを追加してください：

```sql
-- Allow all users to view system templates
CREATE POLICY "Users can view system templates"
  ON templates FOR SELECT
  USING (is_system_template = true);

-- Allow all users to view template items of system templates
CREATE POLICY "Users can view system template items"
  ON template_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND templates.is_system_template = true
    )
  );
```

## チェック項目の構成

基本テンプレートには以下のセクションが含まれます：

### 【共通項目】（17項目）
1. 従業員の管理状況（4項目）
2. 情報公開の状況（5項目）
3. 環境管理活動の状況（2項目）
4. 経営倫理の状況（1項目）
5. 処理業者の許可状況（3項目）
6. 書面の保存状況（2項目）

### 【収集運搬業と積替え保管施設】（18項目）
1. 車両の状況（6項目）
2. 運行管理の状況（5項目）
3. 積替え保管施設における産業廃棄物の状況（7項目）

### 【中間処理業者の処理施設】（20項目）
1. 処理施設の状況（11項目）
2. 処理施設における産業廃棄物の状況（9項目）

**合計**: 55項目の評価項目 + 14個のセクションヘッダー = 69レコード

## 評価タイプ

各チェック項目は以下の評価タイプを使用します：

- **section_header**: セクションの見出し（評価不要）
- **rating_1_5_na**: 1～5の5段階評価 + 該当なし（N/A）

### 必須項目について

`required: true` の項目は、該当なし（N/A）を選択できません。
`required: false` の項目は、該当なし（N/A）を選択可能です。

## 確認方法

セットアップが正しく完了したか確認するには：

```sql
-- テンプレートの確認
SELECT id, name, is_system_template, is_default
FROM templates
WHERE is_system_template = true;

-- テンプレート項目数の確認
SELECT COUNT(*) as item_count
FROM template_items
WHERE template_id = '00000000-0000-0000-0000-000000000001';
-- 結果: 69 が返ってくるはずです
```

## トラブルシューティング

### エラー: "column is_system_template does not exist"

→ `add-system-template-support.sql` を実行してください。

### エラー: "organization_id violates foreign key constraint"

→ 最初に1つ以上の組織を作成してください。アカウント登録により自動的に組織が作成されます。

### テンプレートが表示されない

→ RLSポリシーを確認してください。システムテンプレートを全組織から参照できるようにするポリシーが必要です。

## 次のステップ

セットアップ完了後、以下を確認してください：

1. テンプレート一覧ページで「基本テンプレート」が表示されること
2. 基本テンプレートの編集ボタンが無効化されていること
3. 基本テンプレートの削除ボタンが無効化されていること
4. 基本テンプレートを使用して新規確認を作成できること
