# トラブルシューティング

## 目次

- [セットアップ時の問題](#セットアップ時の問題)
- [データベース関連](#データベース関連)
- [承認ワークフロー関連](#承認ワークフロー関連)
- [テンプレート関連](#テンプレート関連)

---

## セットアップ時の問題

### エラー: "Invalid Supabase credentials"

**原因**: `.env.local` の設定が間違っている

**解決方法**:
1. Supabaseダッシュボードで正しい値を確認
2. `.env.local` を更新
3. 開発サーバーを再起動

---

## データベース関連

### エラー: "column does not exist"

**原因**: マイグレーションが実行されていない

**解決方法**:
1. `SETUP.md` の順序通りにマイグレーションを実行
2. 特に最新のマイグレーション (`06_add_inspection_overview_fields.sql`) を確認

### エラー: "permission denied for table"

**原因**: RLSポリシーが正しく設定されていない

**解決方法**:
```sql
-- RLSポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 基本テンプレートが表示されない

**原因**: システムテンプレートのRLSが設定されていない

**解決方法**:
1. `database/migrations/04_add_system_template_rls.sql` を実行
2. システムテンプレートが存在するか確認:
```sql
SELECT id, name, is_system_template
FROM templates
WHERE is_system_template = true;
```

---

## 承認ワークフロー関連

### 承認申請できない

**症状**: 「承認申請」ボタンがグレーアウト

**原因と解決方法**:

1. **ステータスが draft でない**
   - 既に申請済みの場合は取り下げてから再申請

2. **チェックリストが未入力**
   - すべての必須項目を入力

3. **承認設定がない**
```sql
-- 承認設定を確認
SELECT * FROM approval_settings WHERE organization_id = 'your_org_id';

-- 初期データを投入
-- database/seeds/01_seed_approval_initial_data.sql を実行
```

### 承認申請後にステータスが変わらない

**原因**: フロントエンドのキャッシュ

**解決方法**:
1. ブラウザをリロード
2. `router.refresh()` が呼ばれているか確認

---

## テンプレート関連

### システムテンプレートの詳細が表示されない

**エラー**: "テンプレートの取得に失敗しました"

**原因**: APIのORフィルタが設定されていない

**解決方法**:
- `/api/templates/[id]/route.ts` で `.or()` フィルタを使用しているか確認
- ブラウザのコンソールでエラー詳細を確認

### テンプレート複製時にエラー

**エラー**: "Failed to copy template items"

**原因**: `display_facility_types` カラムが存在しない

**解決方法**:
```sql
-- カラムの存在を確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'template_items' AND column_name = 'display_facility_types';

-- なければマイグレーション実行
-- database/migrations/06_add_inspection_overview_fields.sql
```

### チェックリスト項目が表示されない

**原因**: 施設種別のフィルタリングで除外されている

**確認方法**:
1. 施設の `facility_types` を確認
2. テンプレート項目の `display_facility_types` を確認
3. OR条件に該当しているか確認

**デバッグ用SQL**:
```sql
-- 施設の種別を確認
SELECT id, name, facility_types FROM sites WHERE id = 'site_id';

-- テンプレート項目の表示条件を確認
SELECT id, label, display_facility_types
FROM template_items
WHERE template_id = 'template_id'
ORDER BY sort_order;
```

---

## よくある質問

### Q: マイグレーションの実行順序を間違えた

**A**: 以下の順序で再実行:
1. すべてのテーブルを削除（注意: データが失われます）
2. `SETUP.md` の順序通りに再実行

### Q: 開発サーバーが起動しない

**A**:
1. ポートが使用中: `PORT=3001 npm run dev`
2. node_modules削除: `rm -rf node_modules && npm install`
3. .nextキャッシュ削除: `rm -rf .next`

### Q: 画像アップロードができない

**A**: Supabase Storageの設定を確認:
1. `NEXT_PUBLIC_SUPABASE_INSPECTION_PHOTO_BUCKET` に指定したバケットが存在し、Public設定になっているか
2. `docs/archive/rls-policies.sql` の `photos`テーブル向けRLSポリシーが適用されているか
3. プロジェクト設定のアップロードサイズ制限が5MB以上になっているか
4. Supabase Storageのキーと`photos.file_path`の階層（`organization_id/inspection_id/template_item_id/...`）が一致しているか

---

## サポート

問題が解決しない場合:
1. ブラウザのコンソールでエラーを確認
2. Supabase Logsでバックエンドエラーを確認
3. GitHub Issuesで報告
