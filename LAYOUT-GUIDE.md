# レイアウトガイド

このドキュメントは、現地確認くんアプリケーションにおけるレイアウトの使用方法を説明します。

## 共通ヘッダーレイアウト (DashboardLayout)

`src/app/dashboard/layout.tsx` に定義されている `DashboardLayout` は、**ログイン後のすべてのページで使用される共通ヘッダー**です。

### 機能

- ユーザー認証状態の自動確認
- 統一されたナビゲーションメニュー
  - ダッシュボード
  - 現地確認先
  - テンプレート
  - 確認記録
- アカウントメニュー
  - 個人情報設定
  - 組織設定（管理者のみ表示）
  - ログアウト
- ロールベースのメニュー表示制御（組織設定は管理者のみ）

### 使用方法

新しいページセクションを作成する際は、必ずこのレイアウトを使用してください：

```tsx
import DashboardLayout from '@/app/dashboard/layout'

export default function YourLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
```

### 使用例

プロジェクト内の以下のレイアウトが正しい使用例です：

- `src/app/sites/layout.tsx`
- `src/app/templates/layout.tsx`
- `src/app/inspections/layout.tsx`
- `src/app/reports/layout.tsx`
- `src/app/approvals/layout.tsx`
- `src/app/settings/layout.tsx`

## 除外ページ

以下のページでは `DashboardLayout` を使用**しないでください**：

### ログイン前のページ

- `/` - ルートページ（リダイレクトページ）
- `/login` - ログインページ
- `/signup` - サインアップページ

これらのページは独自のレイアウトまたはレイアウトなしで実装されています。

### 特殊ページ

- `/inspections/[id]/print` - 印刷専用ページ

印刷専用ページは、印刷に最適化されたレイアウトを持っているため、`DashboardLayout` を使用しません。

## ベストプラクティス

### ❌ 悪い例：独自のヘッダーを作成

```tsx
// これはやらないでください！
export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav>
        {/* 独自のヘッダー実装 */}
      </nav>
      <main>{children}</main>
    </div>
  )
}
```

### ✅ 良い例：DashboardLayoutを使用

```tsx
// これが正しい方法です
import DashboardLayout from '@/app/dashboard/layout'

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
```

## トラブルシューティング

### ナビゲーションメニューが表示されない

- `DashboardLayout` を使用しているか確認してください
- ログイン状態を確認してください（未ログインの場合は自動的にログインページへリダイレクトされます）

### アカウントメニューに「組織設定」が表示されない

- ユーザーのロールを確認してください
- 「組織設定」メニューは `admin` ロールのユーザーにのみ表示されます

## 参考

- DashboardLayoutの実装: `src/app/dashboard/layout.tsx`
- 認証処理: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
