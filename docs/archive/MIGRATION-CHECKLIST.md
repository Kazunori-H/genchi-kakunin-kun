# マイグレーション実行チェックリスト
## 📅 実行予定: 2025年11月19日 朝8時

### ⚠️ 事前確認

- [ ] Cloudflareが正常に稼働していることを確認
- [ ] Supabaseダッシュボードにアクセスできることを確認
- [ ] 本番環境のバックアップが最新であることを確認（念のため）

### 📝 実行するマイグレーション

**ファイル名**: `add-inspection-overview-fields.sql`

**内容**:
1. `inspections`テーブルに`overview_metadata` (JSONB)カラムを追加
   - 時刻情報（開始時刻、終了時刻）
   - 立会者情報（氏名、所属、役職）

2. `sites`テーブルに`facility_types` (TEXT[])カラムを追加 ⭐ **複数選択対応**
   - 施設種別：運搬/積替保管施設/中間処理施設/最終処分場
   - 既存の`facility_type`（単一）から`facility_types`（配列）へ自動移行

3. `template_items`テーブルに`display_facility_types` (JSONB)カラムを追加 ⭐ **NEW**
   - チェックリスト項目の表示条件（施設種別）
   - 空配列の場合はすべての施設種別で表示（共通項目）

### 🚀 実行手順

1. **Supabaseにログイン**
   - ダッシュボードにアクセス: https://supabase.com
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック

3. **マイグレーションファイルを実行**
   - 「New query」をクリック
   - `add-inspection-overview-fields.sql`の内容をコピー&ペースト
   - 「Run」ボタンをクリック

4. **実行結果を確認**
   ```sql
   -- 以下のクエリで確認（マイグレーションファイルの最後に含まれています）
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'inspections' AND column_name = 'overview_metadata';

   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'sites' AND column_name = 'facility_types';

   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'template_items' AND column_name = 'display_facility_types';
   ```

   ✅ 期待される結果:
   - `inspections.overview_metadata`: `jsonb` 型
   - `sites.facility_types`: `ARRAY` 型
   - `template_items.display_facility_types`: `jsonb` 型

### ✅ 動作確認

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **現地確認先の登録/編集ページで施設種別が複数選択できることを確認**
   - `/sites/new` - 新規登録ページ
   - チェックボックスで複数選択可能
   - `/sites/[id]/edit` - 編集ページ

3. **確認記録の概要編集ページで新しいフィールドが表示されることを確認**
   - `/inspections/[id]/edit` - 概要編集ページ
   - 時刻情報セクション（開始時刻、終了時刻）
   - 立会者情報セクション（動的追加・削除）

4. **サマリーページで新しい情報が表示されることを確認**
   - `/inspections/[id]` - サマリーページ
   - 施設種別がタグ形式で複数表示される
   - 時刻情報（開始時刻、終了時刻、所要時間）
   - 立会者情報

5. **チェックリスト入力ページで項目フィルタリングが動作することを確認** ⭐ **NEW**
   - `/inspections/[id]/checklist` - チェックリスト入力ページ
   - 施設の種別に応じてチェックリスト項目が動的に表示される
   - 表示条件が未設定の項目は常に表示される（共通項目）

### 🐛 トラブルシューティング

#### エラー: Column already exists
既にカラムが存在する場合のエラー。マイグレーションファイルには`IF NOT EXISTS`が含まれているので問題なし。

#### エラー: Constraint violation
既存データがある場合、NULLまたは空配列が許可されているため問題なし。

#### 既存の facility_type データはどうなる？
マイグレーションに自動移行ロジックが含まれています：
- `facility_type` = 'transport' → `facility_types` = ['transport']
- 旧カラムは自動的に削除されます

#### フロントエンドでエラーが出る場合
1. 開発サーバーを再起動
2. ブラウザのキャッシュをクリア
3. TypeScriptの型エラーがないか確認

### 📊 ロールバック手順（万が一の場合）

```sql
-- 追加したカラムを削除（本当に必要な場合のみ）
BEGIN;

ALTER TABLE inspections DROP COLUMN IF EXISTS overview_metadata;
ALTER TABLE sites DROP COLUMN IF EXISTS facility_types;
ALTER TABLE template_items DROP COLUMN IF EXISTS display_facility_types;

-- 旧カラムを復元する場合（データは失われます）
ALTER TABLE sites ADD COLUMN IF NOT EXISTS facility_type VARCHAR(50);

COMMIT;
```

### 📞 問題が発生した場合

- まず落ち着いて、エラーメッセージをメモ
- Supabaseのログを確認
- 必要に応じてロールバック実行

---

## 🎯 実装の特徴

### 施設種別の複数選択
- チェックボックスで複数の種別を選択可能
- 例：「運搬」と「中間処理」の両方を持つ施設

### チェックリスト項目の条件付き表示（OR条件）
- 各チェックリスト項目に「どの施設種別で表示するか」を設定可能
- 施設が複数の種別を持つ場合、いずれかに該当する項目がすべて表示される
- 表示条件が未設定の項目は常に表示（共通項目）

**表示例：**
- 施設A: 種別 = [`transport`, `intermediate_treatment`]
- チェックリスト項目：
  - 項目1（共通、`display_facility_types` = []） → ✅ 表示
  - 項目2（`display_facility_types` = [`transport`]） → ✅ 表示
  - 項目3（`display_facility_types` = [`intermediate_treatment`]） → ✅ 表示
  - 項目4（`display_facility_types` = [`final_disposal`]） → ❌ 非表示

---

## 📝 実行記録

**実行日時**: ___________

**実行者**: ___________

**結果**:
- [ ] 成功
- [ ] 失敗（理由: ___________）

**備考**:
___________________________________________
___________________________________________
