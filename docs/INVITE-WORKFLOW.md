# 招待・初期設定フローガイド

## 役割分担

- **MCPでできること**
  - DBクエリ・更新（例: `select id, name from organizations;` で組織ID確認）
  - `organizations.logo_url` / `approval_levels` / `users` テーブルの確認・更新（SQL）
  - `organization-logos` バケット有無の確認や、バケット名定義（環境変数の確認）
  - API疎通確認（`/api/organization/users` など）※サーバーが起動している前提
- **手動でやること**
  - Supabase Auth へのユーザー作成（サービスロールキーが必須）
  - 仮パスワードの発行と招待メール送信
  - 招待されたユーザーへの初期設定URLの共有

## 1. 招待の実行方法

### A. 画面から招待する（推奨）
- ページ: `/settings/users` （管理者ロールのみ）
- 入力: メールアドレス、氏名、ロール、承認レベル
- 動作: Supabase Auth の招待メールを送信（サービスロールキー設定必須）

### B. CLIスクリプトで招待する（サーバー不要）
- スクリプト: `node scripts/invite-user.mjs`
- 必要な環境変数:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_URL`（共有するログインURLを出力するため、例: `https://your-app.example.com`）
- 例:
```bash
node scripts/invite-user.mjs \
  --email user@example.com \
  --name "Taro Yamada" \
  --org <organization_id> \
  --role approver \
  --approval 2
```
- 出力: 招待メールリンクではなく、authユーザー作成＋DB登録のみ。招待メールは送られません（CLI用途は管理者が直接共有する場合に限る）。
- 注意: Supabase Authを直接操作するため、サービスロールキーが必須。MCPからは実行できません。

## 2. 共有すべきURL
- ログイン: `{APP_URL}/login`
- 初期設定（パスワード/メール変更・表示名編集）: `{APP_URL}/settings/profile`

## 3. バケット設定
- 組織ロゴ用: `organization-logos`（`NEXT_PUBLIC_SUPABASE_ORG_LOGO_BUCKET` で上書き可）
- 写真アップロード用: `inspection-photos`（既存）

## 4. MCPでの補助例
- 組織ID確認: `select id, name from organizations order by created_at desc;`
- 承認レベル確認: `select id, name, approval_levels from organizations;`
- ユーザー一覧確認: `select id, name, email, role, approval_level, is_active from users where organization_id = '<org_id>';`

## 5. 手動での運用フロー
1. MCPで `organization_id` を確認
2. CLIスクリプトまたは `/api/organization/users` で招待（tempPassword取得）
3. 招待メールに `loginUrl`, `setupUrl`, `tempPassword` を記載して送信
4. 初回ログイン後、ユーザーに `/settings/profile` でパスワード変更を依頼
