# ステータス管理の修正ガイド

## 🔧 修正内容

### 問題点
1. 確認記録を提出しても「下書き」のまま保存されていた
2. 承認待ちの記録も「下書き」として表示されていた
3. 古い `submitted` ステータスが残っていた

### 原因
- PUT API (`/api/inspections/[id]`) が古いロジックを使用
- ステータスを無条件に上書きしていた
- 新しい承認ワークフローに対応していなかった

---

## ✅ 修正した項目

### 1. **PUT API の修正** (`src/app/api/inspections/[id]/route.ts`)

**変更前:**
```typescript
// ステータスを無条件に上書き
status: body.status || 'draft',
submitted_at: body.status === 'submitted' ? new Date().toISOString() : null,
```

**変更後:**
```typescript
// 下書き以外は編集不可
if (currentInspection.status !== 'draft') {
  return NextResponse.json(
    { error: '下書き以外の確認記録は編集できません' },
    { status: 400 }
  )
}

// サマリーのみ更新（ステータスは変更しない）
const { data: inspection, error: inspectionError } = await supabase
  .from('inspections')
  .update({
    summary: body.summary,
  })
```

**修正ポイント:**
- ✅ 下書き以外は編集不可に変更
- ✅ 下書き保存時にステータスを上書きしない
- ✅ 提出は専用の submit API を使用

### 2. **確認記録一覧ページの修正** (`src/app/inspections/page.tsx`)

**変更内容:**
- ✅ `StatusBadge` コンポーネントを使用
- ✅ フィルターボタンを更新:
  - `submitted` → `pending_approval` (承認待ち)
  - `rejected` フィルターを追加
- ✅ 古い `getStatusBadge` 関数を削除

### 3. **データクリーンアップSQL作成** (`fix-inspection-statuses.sql`)

既存のデータを修正するSQLを作成しました。

---

## 🚀 実施手順

### ステップ1: データベースのクリーンアップ

Supabase SQL Editor で `fix-inspection-statuses.sql` を実行してください。

```sql
-- 以下の処理が実行されます:
-- 1. 'submitted' → 'pending_approval' に変換
-- 2. 不正なステータスを 'draft' に修正
-- 3. submitted_at がない承認待ちレコードに日時を設定
```

**実行方法:**
1. Supabase にログイン
2. SQL Editor を開く
3. `fix-inspection-statuses.sql` の内容をコピー&ペースト
4. Run をクリック

**確認:**
```sql
-- ステータスの分布を確認
SELECT status, COUNT(*) as count
FROM inspections
GROUP BY status
ORDER BY status;
```

期待される結果:
```
status            | count
------------------+------
draft             | XX
pending_approval  | XX
approved          | XX
rejected          | XX
```

### ステップ2: 開発サーバーの再起動

```bash
npm run dev
```

### ステップ3: 動作確認

#### 3-1. 確認記録一覧の表示確認
1. 「確認記録」ページを開く
2. フィルターボタンが正しく表示されているか確認:
   - すべて
   - 下書き
   - **承認待ち** (新)
   - 承認済み
   - **却下** (新)
3. 各ステータスのバッジが正しく表示されているか確認

#### 3-2. 下書き保存のテスト
1. 下書きの確認記録を開く
2. チェック項目を入力
3. 「下書き保存」ボタンをクリック
4. **ステータスが「下書き」のまま**であることを確認 ✅
5. 入力内容が保存されていることを確認

#### 3-3. 提出のテスト
1. 下書きの確認記録を開く
2. すべての必須項目を入力
3. 「提出する」ボタンをクリック
4. **ステータスが「承認待ち」に変更**されることを確認 ✅
5. 確認記録一覧で「承認待ち」フィルターで表示されることを確認

#### 3-4. 編集不可のテスト
1. 承認待ち、承認済み、または却下の確認記録を開く
2. 編集ボタンが表示されないことを確認
3. 直接URLでアクセスして編集を試みた場合、エラーが表示されることを確認

---

## 📊 ステータス遷移フロー（修正後）

```
draft (下書き)
  │
  ├─ 下書き保存 → draft (変更なし) ✅
  │
  └─ 提出 → pending_approval (承認待ち) ✅
              │
              ├─ 承認 → approved (承認済み)
              │
              ├─ 差し戻し → draft (下書き)
              │
              └─ 却下 → rejected (却下)
```

### 各ステータスの編集可否

| ステータス | 編集 | 提出 | 承認アクション |
|------------|------|------|----------------|
| draft | ✅ 可 | ✅ 可 | - |
| pending_approval | ❌ 不可 | - | ✅ 可 (承認者のみ) |
| approved | ❌ 不可 | - | - |
| rejected | ❌ 不可 | - | - |

---

## 🐛 トラブルシューティング

### Q1. 「下書き以外の確認記録は編集できません」エラーが出る

**原因**: 承認待ち・承認済み・却下のレコードを編集しようとしている

**解決方法**:
- 承認待ちの場合: 承認者に差し戻しを依頼
- 承認済み・却下の場合: 新しい確認記録を作成

### Q2. 提出しても「下書き」のままになる

**原因**:
1. フロントエンドのコードが更新されていない
2. ブラウザキャッシュが残っている

**解決方法**:
```bash
# 1. 開発サーバーを再起動
npm run dev

# 2. ブラウザのキャッシュをクリア (Ctrl+Shift+R または Cmd+Shift+R)
```

### Q3. 古いレコードのステータスがおかしい

**原因**: データベースのクリーンアップが実行されていない

**解決方法**:
```sql
-- fix-inspection-statuses.sql を実行
```

---

## 📁 修正されたファイル

1. `src/app/api/inspections/[id]/route.ts` - PUT エンドポイントの修正
2. `src/app/inspections/page.tsx` - 一覧ページのステータス表示修正
3. `fix-inspection-statuses.sql` - データクリーンアップSQL (新規)
4. `STATUS-FIX-GUIDE.md` - このガイド (新規)

---

## ✅ 確認チェックリスト

- [ ] `fix-inspection-statuses.sql` を実行
- [ ] ステータスの分布を確認 (submitted が 0 件)
- [ ] 開発サーバーを再起動
- [ ] 確認記録一覧でフィルターが正しく動作
- [ ] 下書き保存でステータスが維持される
- [ ] 提出で「承認待ち」に変更される
- [ ] 承認待ち・承認済み・却下のレコードは編集不可
- [ ] ステータスバッジが正しく表示される

---

## 🎉 完了

ステータス管理の修正が完了しました！

これで:
- ✅ 下書き保存でステータスが維持される
- ✅ 提出で正しく「承認待ち」に変更される
- ✅ 承認ワークフローが正常に動作する

ご不明な点があれば、お気軽にお問い合わせください。
