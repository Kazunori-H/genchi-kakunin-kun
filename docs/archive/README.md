# アーカイブファイル

このディレクトリには、過去のトラブルシューティングや一時的な修正用のファイルが保存されています。

## 📁 SQLファイル

### デバッグ・検証用
- `check-rls-policies.sql` - RLSポリシーの確認用
- `check-inspection-status.sql` - ステータスの確認用
- `verify-database.sql` - データベース構造の確認用

### 一時的な修正用（実行済み）
- `fix-updated-at.sql` - updated_atカラムの修正（完了）
- `fix-inspection-statuses.sql` - ステータスの修正（完了）
- `fix-inspections-rls.sql` - RLSの修正（完了）

### 参考資料
- `rls-policies.sql` - RLSポリシーの定義（参考用）

---

## 📄 ドキュメントファイル

### 過去の実装ガイド
- `APPROVAL-WORKFLOW-IMPLEMENTATION.md` - 承認ワークフロー実装ガイド（完了）
- `APPROVAL-WORKFLOW-SETUP.md` - 承認ワークフローセットアップ（完了）
- `SETUP-BASIC-TEMPLATE.md` - 基本テンプレートセットアップ（完了）

### トラブルシューティング（解決済み）
- `MIGRATION-CHECKLIST.md` - マイグレーション実行チェックリスト（完了）
- `STATUS-FIX-GUIDE.md` - ステータス修正ガイド（完了）
- `SUBMIT-TROUBLESHOOTING.md` - 申請関連のトラブルシューティング（完了）

---

## ⚠️ 注意事項

これらのファイルは **参考用・アーカイブ用** です。

**本番環境では実行しないでください。**

現在の最新情報は以下を参照してください:
- セットアップ: `/SETUP.md`
- トラブルシューティング: `/docs/TROUBLESHOOTING.md`
- 機能一覧: `/FEATURES.md`
