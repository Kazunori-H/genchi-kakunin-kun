# 承認ワークフロー セットアップガイド

## 実装完了内容

承認ワークフローの実装が完了しました。以下の機能が追加されています。

### 📋 追加された機能

#### 1. **データベース拡張**
- ユーザーロール管理（inspector/approver/admin）
- 承認ステータス（draft/pending_approval/approved/rejected）
- 承認履歴記録
- 組織設定（デフォルト承認者）

#### 2. **API エンドポイント**
- `POST /api/inspections/[id]/submit` - 確認記録の提出
- `POST /api/inspections/[id]/approve` - 承認・差し戻し・却下
- `GET /api/inspections/[id]/logs` - 承認履歴の取得
- `GET /api/approvals/pending` - 承認待ち一覧
- `GET /api/auth/me` - 現在のユーザー情報取得

#### 3. **フロントエンド画面**
- **確認記録詳細ページ**: 提出ボタン、承認アクション、承認履歴表示
- **承認待ち一覧ページ**: 承認者向けの承認待ち記録一覧
- **ステータスバッジ**: 統一されたステータス表示
- **ナビゲーション**: 承認者向けに「承認待ち」メニューを追加

---

## 🚀 セットアップ手順

### ステップ 1: データベースマイグレーション

Supabase SQL Editor で以下のSQLファイルを順番に実行してください。

#### 1-1. マイグレーション実行

```sql
-- ファイル: add-approval-workflow.sql
```

Supabase にログイン → SQL Editor → 新規クエリ → `add-approval-workflow.sql` の内容をコピー&ペースト → Run

**確認**: テーブルとカラムが正しく追加されたか確認

```sql
-- users テーブルに role カラムがあるか確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- inspections テーブルに新しいカラムがあるか確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inspections'
  AND column_name IN ('approver_id', 'approved_at', 'submitted_at');

-- 新しいテーブルが作成されたか確認
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('approval_logs', 'organization_settings');
```

#### 1-2. 初期データ投入

```sql
-- ファイル: seed-approval-initial-data.sql
```

Supabase SQL Editor → 新規クエリ → `seed-approval-initial-data.sql` の内容をコピー&ペースト → Run

**確認**: 管理者ロールが付与されたか、組織設定が作成されたか確認

```sql
-- 管理者ロールが付与されたユーザーを確認
SELECT u.name, u.email, u.role, o.name as organization_name
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE u.role = 'admin';

-- 組織設定が作成されたか確認
SELECT
  o.name as organization_name,
  os.require_approval,
  u.name as default_approver_name,
  u.email as default_approver_email
FROM organization_settings os
JOIN organizations o ON o.id = os.organization_id
LEFT JOIN users u ON u.id = os.default_approver_id;
```

### ステップ 2: アプリケーションの再起動

開発サーバーを再起動してください。

```bash
npm run dev
```

### ステップ 3: 動作確認

#### 3-1. ログイン

既存のアカウントでログインしてください。初回マイグレーション後、最初に作成されたユーザーが自動的に `admin` ロールになっています。

#### 3-2. ナビゲーション確認

ログイン後、ナビゲーションバーに「承認待ち」メニューが表示されているか確認してください（admin または approver ロールのみ）。

#### 3-3. 確認記録の提出テスト

1. **確認記録の作成**
   - 「確認記録」→「新規確認作成」
   - 現地確認先、テンプレートを選択
   - チェックシートを入力

2. **下書き保存**
   - 「下書き保存」ボタンで保存
   - ステータスが「下書き」になっていることを確認

3. **提出**
   - すべての必須項目を入力
   - 「提出する」ボタンをクリック
   - ステータスが「承認待ち」になることを確認

#### 3-4. 承認フローのテスト

1. **承認待ち一覧の確認**
   - ナビゲーションから「承認待ち」をクリック
   - 提出した確認記録が表示されることを確認

2. **承認記録の詳細表示**
   - 承認待ち一覧から記録をクリック
   - 「承認アクション」セクションが表示されることを確認

3. **承認**
   - コメント（オプション）を入力
   - 「承認」ボタンをクリック
   - ステータスが「承認済み」になることを確認
   - 承認履歴に記録が表示されることを確認

4. **差し戻しのテスト**（別の記録で）
   - コメント（必須）を入力
   - 「差し戻し」ボタンをクリック
   - ステータスが「下書き」に戻ることを確認
   - 承認履歴に「差し戻し」が記録されることを確認

5. **却下のテスト**（別の記録で）
   - コメント（必須）を入力
   - 「却下」ボタンをクリック
   - ステータスが「却下」になることを確認
   - 承認履歴に「却下」が記録されることを確認

---

## 🔐 ユーザーロールの管理

### ロールの種類

| ロール | 権限 |
|--------|------|
| `inspector` | 確認記録の作成・編集・提出 |
| `approver` | 確認記録の承認・差し戻し・却下 |
| `admin` | すべての操作 + 承認者の指定 |

### ロールの変更方法

Supabase SQL Editor で以下のクエリを実行してユーザーのロールを変更できます。

#### ユーザーを承認者にする

```sql
UPDATE users
SET role = 'approver'
WHERE email = 'user@example.com';
```

#### ユーザーを管理者にする

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@example.com';
```

#### ユーザーを確認者（デフォルト）にする

```sql
UPDATE users
SET role = 'inspector'
WHERE email = 'user@example.com';
```

### デフォルト承認者の設定

組織のデフォルト承認者を変更する場合:

```sql
-- まず、承認者にしたいユーザーのIDを確認
SELECT id, name, email FROM users WHERE email = 'approver@example.com';

-- 組織設定でデフォルト承認者を設定
UPDATE organization_settings
SET default_approver_id = 'ユーザーのUUID'
WHERE organization_id = '組織のUUID';
```

---

## 📊 ワークフロー状態遷移

```
draft (下書き)
  ↓ 提出 (submit)
pending_approval (承認待ち)
  ↓ 承認 (approve)          ↓ 差し戻し (return)     ↓ 却下 (reject)
approved (承認済み)         draft (下書き)          rejected (却下)
```

### 各ステータスでの操作

| ステータス | 確認者の操作 | 承認者の操作 |
|------------|--------------|--------------|
| `draft` | 編集、提出 | - |
| `pending_approval` | - | 承認、差し戻し、却下 |
| `approved` | 閲覧のみ | 閲覧のみ |
| `rejected` | 閲覧のみ | 閲覧のみ |

---

## 🐛 トラブルシューティング

### Q1. 「承認待ち」メニューが表示されない

**原因**: ユーザーロールが `inspector` になっている

**解決方法**:
```sql
-- ユーザーのロールを確認
SELECT name, email, role FROM users WHERE email = 'your@email.com';

-- ロールを変更（approver または admin に）
UPDATE users SET role = 'approver' WHERE email = 'your@email.com';
```

### Q2. 提出ボタンをクリックしてもエラーになる

**原因1**: 必須項目が未入力

**解決方法**: すべての必須項目（赤い * マーク）を入力してください

**原因2**: データベースに `submitted_at` カラムがない

**解決方法**: マイグレーションSQLを再度実行してください

### Q3. 承認待ち一覧が空のまま

**原因**: 確認記録のステータスが `pending_approval` になっていない

**確認方法**:
```sql
SELECT id, status FROM inspections WHERE status = 'pending_approval';
```

### Q4. 承認アクションボタンが表示されない

**原因**: ユーザーロールが `inspector` になっている

**解決方法**: Q1 を参照

---

## ✅ チェックリスト

実装が完了したら、以下をチェックしてください:

- [ ] マイグレーションSQL (`add-approval-workflow.sql`) を実行
- [ ] 初期データSQL (`seed-approval-initial-data.sql`) を実行
- [ ] 開発サーバーを再起動
- [ ] 管理者ユーザーでログイン
- [ ] 「承認待ち」メニューが表示される
- [ ] 確認記録を作成・提出できる
- [ ] 承認待ち一覧に提出した記録が表示される
- [ ] 承認・差し戻し・却下の操作ができる
- [ ] 承認履歴が正しく記録される
- [ ] ステータスバッジが正しく表示される

---

## 📚 関連ファイル

### データベース
- `add-approval-workflow.sql` - マイグレーションSQL
- `seed-approval-initial-data.sql` - 初期データ投入SQL

### バックエンド
- `src/lib/supabase/auth.ts` - ユーザーロール管理
- `src/app/api/inspections/[id]/submit/route.ts` - 提出API
- `src/app/api/inspections/[id]/approve/route.ts` - 承認API
- `src/app/api/inspections/[id]/logs/route.ts` - 承認履歴API
- `src/app/api/approvals/pending/route.ts` - 承認待ち一覧API
- `src/app/api/auth/me/route.ts` - 現在のユーザー情報API

### フロントエンド
- `src/components/StatusBadge.tsx` - ステータスバッジ
- `src/app/inspections/[id]/page.tsx` - 確認記録詳細
- `src/app/approvals/page.tsx` - 承認待ち一覧
- `src/app/approvals/layout.tsx` - 承認ページレイアウト
- `src/app/dashboard/layout.tsx` - ダッシュボード（ナビゲーション更新）

---

## 🎉 完了

承認ワークフローの実装が完了しました！

次のステップ:
1. データベースマイグレーションを実行
2. 開発サーバーを再起動
3. 動作確認を実施
4. 組織内のユーザーロールを適切に設定

ご不明な点があれば、`APPROVAL-WORKFLOW-IMPLEMENTATION.md` を参照してください。
