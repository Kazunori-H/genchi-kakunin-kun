# 招待・初期設定 手順（シンプル版）

## 1) 事前準備
- Supabaseのサービスロールキーを手元に用意する (`SUPABASE_SERVICE_ROLE_KEY`)。
- `.env` もしくはシェルで以下をセット:
  - `NEXT_PUBLIC_SUPABASE_URL`（SupabaseのURL）
  - `SUPABASE_SERVICE_ROLE_KEY`（サービスロールキー）
  - `APP_URL`（例: `https://your-app.example.com`。未設定なら `http://localhost:3000` で出力）
- 組織ロゴ用バケット `organization-logos` をSupabase Storageに作成（名前を変える場合は `NEXT_PUBLIC_SUPABASE_ORG_LOGO_BUCKET` で指定）。

## 2) 組織IDの確認（MCPで実行OK）
- SQL例:  
  `select id, name from organizations order by created_at desc;`
- 招待したい組織の `id` をメモ。

## 3) 招待実行（アプリから招待メール送信）
- 前提: 管理者ユーザーでログインし、`/settings/users` を開く
- フォームに「メールアドレス／氏名／ロール／承認レベル」を入力して送信
- 招待メールが送信される（Supabaseのメール設定が必要）

## 4) こちらが行うこと（自動メール内に含まれない場合）
- ログインURL: `APP_URL` の `/login`
- 初期設定URL: `APP_URL` の `/settings/profile`（パスワード/メール変更・表示名編集を依頼）

## 5) 代替: API/CLIで招待したい場合
- API: `POST /api/organization/users` に `{ email, name, role, approval_level }`
- CLI: `scripts/invite-user.mjs` でも実行可（サービスロールキーが必要）

## ポイント
- 招待メールはSupabaseのAuthメール機能を使用（サービスロールキーが必要）
- MCPでの確認用SQL例:
  - 承認レベル確認: `select id, name, approval_levels from organizations;`
  - ユーザー一覧:  
    `select id, name, email, role, approval_level, is_active from users where organization_id = '<org_id>';`
