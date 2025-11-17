# 開発者向けガイド

## 現地確認くん - Development Guide

最終更新: 2025-01-17

---

## 目次

1. [開発環境セットアップ](#1-開発環境セットアップ)
2. [開発ワークフロー](#2-開発ワークフロー)
3. [コーディング規約](#3-コーディング規約)
4. [よくある開発タスク](#4-よくある開発タスク)
5. [トラブルシューティング](#5-トラブルシューティング)
6. [テスト](#6-テスト)
7. [デバッグ](#7-デバッグ)

---

## 1. 開発環境セットアップ

### 1.1 必要なツール

```bash
# Node.js (v18以上推奨)
node --version  # v18.0.0 以上

# pnpm (推奨パッケージマネージャー)
npm install -g pnpm

# Git
git --version
```

### 1.2 プロジェクトのクローン

```bash
git clone <repository-url>
cd genchi-kakunin-kun
```

### 1.3 依存関係のインストール

```bash
pnpm install
```

### 1.4 環境変数の設定

`.env.local` ファイルを作成:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (for Prisma)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**注意**: `.env`ファイルも必要（Prisma用）:

```bash
cp .env.local .env
```

### 1.5 データベースのセットアップ

```bash
# Prisma Clientの生成
npx prisma generate

# データベースの状態確認
npx prisma db pull  # Supabaseから現在のスキーマを取得
```

### 1.6 開発サーバーの起動

```bash
pnpm dev
```

http://localhost:3000 でアクセス可能

---

## 2. 開発ワークフロー

### 2.1 ブランチ戦略

```
main                    # 本番環境
  ├── develop           # 開発環境
  │     ├── feature/*   # 新機能開発
  │     ├── bugfix/*    # バグ修正
  │     └── hotfix/*    # 緊急修正
```

### 2.2 機能開発の流れ

```bash
# 1. developブランチから新しいブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/add-photo-editor

# 2. コードを書く
# ...

# 3. コミット
git add .
git commit -m "feat: 写真編集機能を追加"

# 4. プッシュ
git push origin feature/add-photo-editor

# 5. プルリクエストを作成 (GitHub)
```

### 2.3 コミットメッセージ規約

**Conventional Commits** を使用:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コードスタイル変更（機能変更なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・ツール設定変更

**例:**

```bash
feat(inspection): 確認作業の自動保存機能を追加

- 30秒ごとに自動保存
- オフライン時はlocalStorageに保存
- オンライン復帰時にサーバーと同期

Closes #123
```

---

## 3. コーディング規約

### 3.1 TypeScript

```typescript
// ✅ Good: 明示的な型定義
interface InspectionFormData {
  siteId: string
  templateId: string
  inspectionDate: Date
}

function createInspection(data: InspectionFormData): Promise<Inspection> {
  // ...
}

// ❌ Bad: any型の使用
function createInspection(data: any): any {
  // ...
}
```

### 3.2 React コンポーネント

```typescript
// ✅ Good: 関数コンポーネント + TypeScript
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

// ❌ Bad: PropTypes使用
export function Button({ label, onClick, variant }) {
  // ...
}
```

### 3.3 ファイル・ディレクトリ命名規則

```
components/         # PascalCase
  ├── Button.tsx
  ├── PhotoEditor.tsx
  └── forms/
      └── InspectionForm.tsx

lib/               # camelCase
  ├── prisma.ts
  ├── supabase/
  │   ├── client.ts
  │   └── server.ts

app/               # kebab-case
  ├── sites/
  ├── inspections/
  └── photo-editor/
```

### 3.4 CSS (Tailwind)

```tsx
// ✅ Good: Tailwind utilities
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <span className="text-sm font-medium">Label</span>
</div>

// ✅ Good: 複雑なスタイルはカスタムクラス化
// globals.css
.card {
  @apply bg-white rounded-lg shadow-md p-6;
}

// ❌ Bad: インラインstyle
<div style={{ display: 'flex', padding: '16px' }}>
```

### 3.5 Prismaクエリ

```typescript
// ✅ Good: 型安全なクエリ + include で N+1 回避
const inspection = await prisma.inspection.findUnique({
  where: { id: inspectionId },
  include: {
    site: true,
    template: {
      include: {
        templateItems: true,
      },
    },
    inspectionItems: true,
    photos: true,
  },
})

// ❌ Bad: N+1 クエリ問題
const inspection = await prisma.inspection.findUnique({
  where: { id: inspectionId },
})
const site = await prisma.site.findUnique({
  where: { id: inspection.siteId },
})
// ... 繰り返し
```

---

## 4. よくある開発タスク

### 4.1 新しいページを追加

```bash
# 1. ページファイルを作成
mkdir -p src/app/my-new-page
touch src/app/my-new-page/page.tsx

# 2. コンポーネントを実装
# src/app/my-new-page/page.tsx
export default function MyNewPage() {
  return <div>My New Page</div>
}
```

### 4.2 新しいAPIルートを追加

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.myModel.findMany()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await prisma.myModel.create({ data: body })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
```

### 4.3 データベーススキーマの変更

```bash
# 1. schema.prisma を編集
# prisma/schema.prisma に新しいフィールドを追加

# 2. マイグレーションSQLを生成
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration-new-field.sql

# 3. Supabase SQL Editorで実行

# 4. Prisma Clientを再生成
npx prisma generate
```

### 4.4 新しいZustandストアを追加

```typescript
// src/store/myStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MyState {
  count: number
  increment: () => void
  decrement: () => void
}

export const useMyStore = create<MyState>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
    }),
    {
      name: 'my-store', // localStorage key
    }
  )
)
```

### 4.5 フォームバリデーション追加

```typescript
// src/lib/validation/inspectionSchema.ts
import { z } from 'zod'

export const inspectionSchema = z.object({
  siteId: z.string().uuid('有効なサイトIDを選択してください'),
  templateId: z.string().uuid('有効なテンプレートを選択してください'),
  inspectionDate: z.date({
    required_error: '確認日を選択してください',
  }),
  summary: z.string().min(10, '概要は10文字以上入力してください').optional(),
})

export type InspectionFormData = z.infer<typeof inspectionSchema>

// 使用例
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<InspectionFormData>({
  resolver: zodResolver(inspectionSchema),
})
```

---

## 5. トラブルシューティング

### 5.1 Prisma関連

**問題**: `prisma generate` が失敗する

```bash
# 解決策1: node_modulesを削除して再インストール
rm -rf node_modules
pnpm install

# 解決策2: Prisma Clientを明示的に削除
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
npx prisma generate
```

**問題**: Database connection timeout

```bash
# .env の DATABASE_URL を確認
# Connection Pooling用のURLになっているか？
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### 5.2 Next.js関連

**問題**: Server Components と Client Components の混在エラー

```typescript
// ❌ Error: 'useState' cannot be used in Server Component
export default function MyPage() {
  const [state, setState] = useState(0)
  // ...
}

// ✅ Fix: 'use client' ディレクティブを追加
'use client'

export default function MyPage() {
  const [state, setState] = useState(0)
  // ...
}
```

**問題**: Environment variables が undefined

```bash
# クライアントサイドで使う環境変数は NEXT_PUBLIC_ プレフィックスが必要
NEXT_PUBLIC_SUPABASE_URL=...

# サーバーサイドのみで使う場合はプレフィックス不要
SUPABASE_SERVICE_ROLE_KEY=...
```

### 5.3 Supabase関連

**問題**: RLS policy で "permission denied"

```sql
-- RLSが有効になっているか確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- ポリシーが正しく設定されているか確認
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

**問題**: Auth session が取得できない

```typescript
// ✅ Server Component
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabase = createServerComponentClient({ cookies })
const { data: { session } } = await supabase.auth.getSession()

// ✅ Client Component
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()
const { data: { session } } = await supabase.auth.getSession()
```

---

## 6. テスト

### 6.1 テストの種類

```
tests/
  ├── unit/              # 単体テスト (Jest)
  ├── integration/       # 統合テスト (Jest)
  └── e2e/               # E2Eテスト (Playwright) ← 導入予定
```

### 6.2 単体テスト (Jest)

```typescript
// src/lib/utils/formatDate.test.ts
import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2025-01-17')
    expect(formatDate(date)).toBe('2025年1月17日')
  })

  it('should handle invalid date', () => {
    expect(formatDate(null)).toBe('-')
  })
})
```

```bash
# テスト実行
pnpm test

# カバレッジ確認
pnpm test:coverage
```

### 6.3 E2Eテスト (Playwright) ※導入予定

```typescript
// tests/e2e/inspection.spec.ts
import { test, expect } from '@playwright/test'

test('ユーザーは確認記録を作成できる', async ({ page }) => {
  await page.goto('http://localhost:3000/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')

  await page.goto('http://localhost:3000/inspections/new')
  await page.selectOption('select[name="siteId"]', 'site-id')
  await page.selectOption('select[name="templateId"]', 'template-id')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/inspections\/.*/)
})
```

---

## 7. デバッグ

### 7.1 Server Components のデバッグ

```typescript
// サーバーサイドログ (ターミナルに出力)
export default async function MyPage() {
  const data = await fetchData()
  console.log('Server log:', data) // ターミナルに出力
  return <div>{data.title}</div>
}
```

### 7.2 Client Components のデバッグ

```typescript
'use client'

export default function MyComponent() {
  const [data, setData] = useState(null)

  useEffect(() => {
    console.log('Client log:', data) // ブラウザコンソールに出力
  }, [data])

  return <div>{data}</div>
}
```

### 7.3 Prismaクエリのデバッグ

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}

// または実行時に設定
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

### 7.4 Next.js デバッグモード

```bash
# 詳細ログを有効化
NODE_OPTIONS='--inspect' pnpm dev

# Chrome DevTools で接続
chrome://inspect
```

---

## 8. パフォーマンス最適化

### 8.1 画像最適化

```tsx
import Image from 'next/image'

// ✅ Good: Next.js Image コンポーネント
<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  quality={85}
  loading="lazy"
/>

// ❌ Bad: 通常のimgタグ
<img src="/photo.jpg" alt="Photo" />
```

### 8.2 動的インポート (Code Splitting)

```typescript
import dynamic from 'next/dynamic'

// 重いコンポーネントは動的インポート
const PhotoEditor = dynamic(() => import('@/components/photo-editor/PhotoEditor'), {
  loading: () => <p>Loading...</p>,
  ssr: false, // クライアントサイドのみ
})

export default function InspectionPage() {
  return (
    <div>
      <PhotoEditor />
    </div>
  )
}
```

### 8.3 React.memo でレンダリング最適化

```typescript
import { memo } from 'react'

interface ItemProps {
  id: string
  label: string
  onClick: (id: string) => void
}

export const Item = memo(function Item({ id, label, onClick }: ItemProps) {
  return <button onClick={() => onClick(id)}>{label}</button>
})
```

---

## 9. 便利なコマンド集

```bash
# 開発サーバー起動
pnpm dev

# 本番ビルド
pnpm build

# 本番モードで起動
pnpm start

# Lint実行
pnpm lint

# Lint自動修正
pnpm lint:fix

# 型チェック
pnpm type-check

# Prisma Studio起動 (GUIでDB確認)
npx prisma studio

# 依存関係の更新確認
pnpm outdated

# 依存関係の更新
pnpm update
```

---

## 10. 参考資料

### 公式ドキュメント
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### コミュニティ
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [Prisma Discord](https://pris.ly/discord)
- [Supabase Discord](https://discord.supabase.com/)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-17
**Author**: Claude Code
