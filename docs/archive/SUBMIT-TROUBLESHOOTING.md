# 提出機能のトラブルシューティングガイド

## 🐛 問題: 提出しても「承認待ち」にならない

### 原因の可能性

1. **RLSポリシーの制限**
   - inspectionsテーブルのUPDATEポリシーが厳しすぎる
   - ステータス変更が許可されていない

2. **APIエラー**
   - 提出APIでエラーが発生している
   - エラーメッセージが表示されていない

3. **データベース制約**
   - submitted_at カラムが存在しない
   - approver_id の参照制約エラー

---

## 🔧 修正手順

### ステップ1: RLSポリシーの確認

Supabase SQL Editor で以下を実行：

```sql
-- ファイル: check-rls-policies.sql
```

**確認ポイント:**
- `Users can update their own inspections` というポリシーが存在するか
- ステータス変更を許可しているか

### ステップ2: RLSポリシーの修正

Supabase SQL Editor で以下を実行：

```sql
-- ファイル: fix-inspections-rls.sql
```

このSQLは以下を実行します：
1. 古いRLSポリシーを削除
2. 新しいポリシーを作成:
   - ✅ SELECT: 組織内の確認記録を閲覧可能
   - ✅ INSERT: 組織内に確認記録を作成可能
   - ✅ UPDATE: 自分が作成した確認記録を更新可能（**ステータス制限なし**）
   - ✅ DELETE: 自分が作成した下書きのみ削除可能

### ステップ3: 開発サーバーの再起動

```bash
# ターミナルで実行
npm run dev
```

### ステップ4: ブラウザのキャッシュクリア

- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

---

## 🧪 テスト手順

### テスト1: 基本的な提出フロー

1. **下書きの確認記録を開く**
   ```
   http://localhost:3000/inspections/[ID]
   ```

2. **必須項目をすべて入力**
   - すべての「*」マークの付いた項目を入力

3. **開発者ツールを開く**
   - **Windows/Linux**: `F12`
   - **Mac**: `Cmd + Option + I`
   - 「Console」タブを開く

4. **「提出する」ボタンをクリック**

5. **エラーメッセージを確認**
   - コンソールにエラーが表示されていないか確認
   - 赤いエラーメッセージがないか確認

6. **ステータスの確認**
   ```sql
   -- Supabase SQL Editor で実行
   SELECT id, status, submitted_at, approver_id
   FROM inspections
   WHERE id = 'あなたのID'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **期待される結果:**
   ```
   status: pending_approval
   submitted_at: [現在の日時]
   approver_id: [承認者のID または NULL]
   ```

### テスト2: 承認履歴の確認

```sql
-- Supabase SQL Editor で実行
SELECT *
FROM approval_logs
WHERE inspection_id = 'あなたのID'
ORDER BY created_at DESC;
```

**期待される結果:**
```
action: submit
actor_id: [あなたのユーザーID]
created_at: [現在の日時]
```

---

## 🔍 デバッグ方法

### エラーメッセージの確認

**ブラウザのコンソールを開いて以下を確認:**

#### パターン1: APIエラー
```
Failed to submit inspection
```
→ 提出APIでエラーが発生しています

**確認事項:**
1. ネットワークタブで `/api/inspections/[id]/submit` のレスポンスを確認
2. ステータスコードを確認 (500, 400, 401など)
3. レスポンスボディのエラーメッセージを確認

#### パターン2: RLSポリシーエラー
```
new row violates row-level security policy
```
→ RLSポリシーが更新を許可していません

**解決方法:**
1. `fix-inspections-rls.sql` を実行
2. 開発サーバーを再起動

#### パターン3: 必須項目エラー
```
必須項目が入力されていません（X件）
```
→ すべての必須項目を入力してください

#### パターン4: 制約エラー
```
violates check constraint "inspections_status_check"
```
→ ステータス値が不正です

**解決方法:**
1. `fix-inspection-statuses.sql` を実行
2. データベースの整合性を確認

---

## 🐛 よくある問題と解決方法

### Q1. 「提出する」ボタンをクリックしてもエラーも表示されない

**原因**: JavaScriptエラーが発生している可能性

**確認方法:**
```javascript
// ブラウザのコンソールで実行
console.log('Check if JavaScript is working')
```

**解決方法:**
1. ブラウザのキャッシュをクリア
2. ページをリロード
3. 開発サーバーを再起動

### Q2. RLSポリシーを修正してもエラーが消えない

**原因**: Supabaseのキャッシュが残っている

**解決方法:**
```sql
-- Supabase SQL Editor で実行
NOTIFY pgrst, 'reload config';
```

または、Supabaseダッシュボードで「Restart」を実行

### Q3. submitted_at が NULL のまま

**原因**: UPDATEクエリが実行されていない

**確認方法:**
```sql
-- 最近更新されたレコードを確認
SELECT id, status, submitted_at, updated_at
FROM inspections
WHERE inspector_id = auth.uid()
ORDER BY updated_at DESC
LIMIT 5;
```

**解決方法:**
1. 提出APIのログを確認
2. RLSポリシーを再確認
3. データベース接続を確認

### Q4. approver_id が NULL になる

**原因**: organization_settings に default_approver_id が設定されていない

**確認方法:**
```sql
SELECT
  o.name as organization_name,
  os.default_approver_id,
  u.name as approver_name
FROM organization_settings os
JOIN organizations o ON o.id = os.organization_id
LEFT JOIN users u ON u.id = os.default_approver_id
WHERE os.organization_id = (
  SELECT organization_id FROM users WHERE id = auth.uid()
);
```

**解決方法:**
```sql
-- 承認者を設定
UPDATE organization_settings
SET default_approver_id = (
  SELECT id FROM users
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND role IN ('approver', 'admin')
  LIMIT 1
)
WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid());
```

---

## 📊 システム確認チェックリスト

実行前にすべて確認してください:

### データベース
- [ ] `add-approval-workflow.sql` を実行済み
- [ ] `fix-inspection-statuses.sql` を実行済み
- [ ] `fix-inspections-rls.sql` を実行済み
- [ ] approval_logs テーブルが存在する
- [ ] organization_settings テーブルが存在する

### アプリケーション
- [ ] 開発サーバーが起動している
- [ ] ブラウザのキャッシュをクリアした
- [ ] コンソールにエラーが表示されていない

### データ
- [ ] ユーザーに role カラムが存在する
- [ ] inspections に submitted_at, approver_id カラムが存在する
- [ ] 組織に default_approver_id が設定されている（任意）

---

## 🎯 成功の確認方法

### 1. ステータス変更の確認
```sql
SELECT
  id,
  status,
  submitted_at,
  approver_id,
  created_at,
  updated_at
FROM inspections
WHERE id = 'あなたのID';
```

**期待される結果:**
- status = `'pending_approval'`
- submitted_at = `[現在の日時]`
- updated_at = `[現在の日時]`

### 2. 承認履歴の確認
```sql
SELECT
  al.*,
  u.name as actor_name
FROM approval_logs al
JOIN users u ON u.id = al.actor_id
WHERE al.inspection_id = 'あなたのID';
```

**期待される結果:**
- action = `'submit'`
- actor_id = `[あなたのID]`

### 3. UI の確認
- [ ] ステータスバッジが「承認待ち」と表示される
- [ ] 確認記録一覧の「承認待ち」フィルターで表示される
- [ ] 編集ボタンが表示されない（編集不可）
- [ ] 承認者の場合、「承認アクション」が表示される

---

## 📞 それでも解決しない場合

以下の情報を収集してください:

1. **ブラウザのコンソールログ**
   - エラーメッセージ全文
   - Network タブの `/api/inspections/[id]/submit` レスポンス

2. **データベースのログ**
   ```sql
   -- 最新のinspectionレコード
   SELECT * FROM inspections
   WHERE inspector_id = auth.uid()
   ORDER BY created_at DESC
   LIMIT 1;

   -- RLSポリシー
   SELECT * FROM pg_policies WHERE tablename = 'inspections';
   ```

3. **環境情報**
   - Node.js バージョン: `node -v`
   - npm バージョン: `npm -v`
   - Next.js バージョン: `package.json` を確認

---

## ✅ 解決したら

以下を確認してください:

- [ ] 提出で「承認待ち」に変更される
- [ ] 承認履歴が記録される
- [ ] 承認待ち一覧に表示される
- [ ] 承認者が承認アクションを実行できる
- [ ] 差し戻しで「下書き」に戻る
