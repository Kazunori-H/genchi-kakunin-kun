# アーキテクチャ設計書

## 現地確認くん - システムアーキテクチャ

最終更新: 2025-01-17

---

## 1. システム概要

現地確認くんは、産業廃棄物処理施設などの現地確認業務を効率化するマルチテナントSaaSアプリケーションです。

### 主要機能
- 現地確認先の管理
- カスタマイズ可能なチェックシートテンプレート
- モバイル対応の確認作業（写真撮影・編集）
- 柔軟な承認ワークフロー（最大5段階）
- PDFレポート出力

---

## 2. 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript 5.x
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand
- **フォーム**: React Hook Form + Zod
- **画像編集**: react-konva
- **PWA**: next-pwa (オフライン対応)

### バックエンド
- **API**: Next.js API Routes (Server Actions)
- **ORM**: Prisma
- **認証**: Supabase Auth
- **ストレージ**: Supabase Storage (画像保存)

### データベース
- **RDBMS**: PostgreSQL (Supabase)
- **接続プーリング**: PgBouncer (Transaction Mode)
- **セキュリティ**: Row Level Security (RLS)

### インフラ
- **ホスティング**: Vercel
- **データベース**: Supabase
- **CDN**: Vercel Edge Network
- **監視**: Vercel Analytics, Sentry (予定)

---

## 3. システムアーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    ユーザー                                  │
│  (PC / タブレット / スマートフォン)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Vercel Edge Network                         │
│                    (CDN / SSL)                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Next.js Application                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  App Router (React Server Components)               │   │
│  │  - ページコンポーネント                              │   │
│  │  - Server Actions                                    │   │
│  │  - API Routes                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Client Components                                   │   │
│  │  - UI コンポーネント                                 │   │
│  │  - Zustand ストア                                    │   │
│  │  - react-konva (画像編集)                           │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────┬──────────────────────┬──────────────────────────┘
            │                      │
            │                      │
            ▼                      ▼
┌───────────────────────┐  ┌──────────────────────────┐
│   Supabase Auth       │  │  Supabase Storage        │
│                       │  │                          │
│  - ユーザー認証       │  │  - 画像ファイル保存      │
│  - セッション管理     │  │  - CDN配信               │
│  - JWT発行            │  │                          │
└───────────┬───────────┘  └──────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Prisma ORM                                          │   │
│  │  - Type-safe クエリ                                  │   │
│  │  - マイグレーション管理                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  データベーステーブル                                │   │
│  │  - organizations, users, sites, templates, etc.      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Row Level Security (RLS)                            │   │
│  │  - マルチテナント分離                                │   │
│  │  - ロールベースアクセス制御                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. ディレクトリ構成

```
genchi-kakunin-kun/
├── .env                          # 環境変数 (Prisma用)
├── .env.local                    # 環境変数 (Next.js用)
├── next.config.js                # Next.js設定
├── tailwind.config.js            # Tailwind CSS設定
├── tsconfig.json                 # TypeScript設定
├── package.json
├── pnpm-lock.yaml
│
├── prisma/
│   ├── schema.prisma             # Prismaスキーマ定義
│   └── migrations/               # マイグレーションファイル
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # ルートレイアウト
│   │   ├── page.tsx              # トップページ
│   │   ├── (auth)/               # 認証関連ページ
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/          # ダッシュボード
│   │   │   ├── layout.tsx
│   │   │   ├── sites/            # 現地確認先管理
│   │   │   ├── templates/        # テンプレート管理
│   │   │   ├── inspections/      # 確認記録管理
│   │   │   └── settings/         # 設定
│   │   └── api/                  # API Routes
│   │       ├── inspections/
│   │       ├── photos/
│   │       └── export/
│   │
│   ├── components/               # Reactコンポーネント
│   │   ├── ui/                   # 基本UIコンポーネント
│   │   ├── forms/                # フォームコンポーネント
│   │   ├── layouts/              # レイアウトコンポーネント
│   │   ├── inspection/           # 確認作業関連
│   │   └── photo-editor/         # 画像編集コンポーネント
│   │
│   ├── lib/                      # ユーティリティ・ライブラリ
│   │   ├── prisma.ts             # Prisma Client インスタンス
│   │   ├── supabase/             # Supabase クライアント
│   │   │   ├── client.ts         # クライアントサイド
│   │   │   └── server.ts         # サーバーサイド
│   │   ├── auth/                 # 認証ヘルパー
│   │   ├── validation/           # Zodスキーマ
│   │   └── utils/                # 汎用ユーティリティ
│   │
│   ├── store/                    # Zustand ストア
│   │   ├── auth.ts               # 認証状態
│   │   ├── inspection.ts         # 確認作業状態
│   │   └── ui.ts                 # UI状態
│   │
│   ├── types/                    # TypeScript型定義
│   │   ├── database.ts           # DB型定義
│   │   ├── api.ts                # API型定義
│   │   └── models.ts             # ドメインモデル
│   │
│   └── styles/                   # グローバルスタイル
│       └── globals.css
│
├── public/                       # 静的ファイル
│   ├── manifest.json             # PWA manifest
│   ├── icons/                    # アイコン
│   └── images/                   # 画像
│
└── docs/                         # ドキュメント
    ├── database-design.md        # データベース設計書
    ├── architecture.md           # アーキテクチャ設計書 (このファイル)
    ├── development-guide.md      # 開発者ガイド
    └── api-specification.md      # API仕様書
```

---

## 5. 主要コンポーネント

### 5.1 認証・認可

```typescript
// クライアントサイド認証チェック
src/lib/supabase/client.ts
src/components/layouts/AuthGuard.tsx

// サーバーサイド認証チェック
src/lib/supabase/server.ts
src/app/(dashboard)/layout.tsx (middleware)
```

**認証フロー:**
1. ユーザーがログインフォームから資格情報を送信
2. Supabase Authで認証
3. JWTトークンをCookieに保存
4. 以降のリクエストでトークンを自動送信
5. RLSポリシーでデータアクセスを制御

### 5.2 データアクセス層

```typescript
// Prisma Client シングルトン
src/lib/prisma.ts

// 使用例
import { prisma } from '@/lib/prisma'

const sites = await prisma.site.findMany({
  where: { organizationId: user.organizationId }
})
```

**RLS適用:**
- PrismaからのクエリもSupabase RLSが適用される
- organization_id による自動フィルタリング
- ユーザーロールによる操作制限

### 5.3 状態管理 (Zustand)

```typescript
// 確認作業の状態管理
src/store/inspection.ts

interface InspectionStore {
  currentInspection: Inspection | null
  items: InspectionItem[]
  photos: Photo[]
  isDraft: boolean

  setInspection: (inspection: Inspection) => void
  addPhoto: (photo: Photo) => void
  updateItem: (itemId: string, value: any) => void
  submit: () => Promise<void>
}
```

### 5.4 画像編集 (react-konva)

```typescript
src/components/photo-editor/PhotoEditor.tsx

機能:
- 矢印・円・テキストの追加
- トリミング
- 回転
- 編集内容をJSONとして保存 (photos.edited_data)
```

---

## 6. データフロー

### 6.1 現地確認作業フロー

```
1. ユーザーがダッシュボードから「新規確認」をクリック
   ↓
2. 現地確認先とテンプレートを選択
   ↓
3. 確認作業画面を表示 (draft status)
   ↓
4. チェック項目に回答
   ↓
5. 写真を撮影・編集
   ↓
6. 下書き保存 (自動保存 or 手動)
   ↓
7. 送信ボタンで status = 'submitted' に変更
   ↓
8. 承認者が確認・承認
   ↓
9. すべての承認完了で status = 'approved'
```

### 6.2 承認ワークフローフロー

```
Inspection.status の遷移:
draft → submitted → in_review → approved / rejected

Inspection.current_approval_level:
0 → 1 → 2 → ... → (Organization.approval_levels)

各承認で approval_logs にレコード追加:
- approver_id
- approval_level
- action (approved / rejected / returned)
- comment
```

---

## 7. セキュリティ

### 7.1 認証
- Supabase Auth による JWT認証
- HTTPSのみ（Vercelが自動適用）
- セッションタイムアウト: 7日間

### 7.2 認可
- Row Level Security (RLS) によるマルチテナント分離
- ロールベースアクセス制御 (admin / user / viewer)
- 承認レベルによる操作制限

### 7.3 データ保護
- 環境変数による秘密情報管理
- Supabase Service Role Keyはサーバーサイドのみ使用
- 画像ファイルのアクセス制御 (Supabase Storage RLS)

### 7.4 入力検証
- クライアント: React Hook Form + Zod
- サーバー: Zodスキーマによる再検証
- SQLインジェクション対策: Prismaの自動エスケープ

---

## 8. パフォーマンス最適化

### 8.1 フロントエンド
- **React Server Components**: 初期ロード高速化
- **動的インポート**: Code Splitting
- **画像最適化**: Next.js Image コンポーネント
- **キャッシング**: SWR / React Query (導入予定)

### 8.2 データベース
- **インデックス**: 頻繁に検索されるカラムにインデックス
- **Connection Pooling**: PgBouncer
- **N+1問題対策**: Prismaの`include`で関連データを一括取得

### 8.3 API
- **Server Actions**: クライアント-サーバー間の通信最適化
- **レスポンスキャッシング**: Vercel Edge Caching
- **画像配信**: Supabase Storage CDN

---

## 9. オフライン対応 (PWA)

### 9.1 基本方針
- **現地作業のみオフライン対応**（管理画面は対象外）
- Service WorkerによるキャッシュStrategy

### 9.2 キャッシュ対象
- アプリケーションシェル (HTML, CSS, JS)
- 確認作業画面の静的リソース
- テンプレートデータ (localStorage)

### 9.3 同期処理
- オンライン復帰時に未送信データを自動送信
- 競合解決: サーバー側タイムスタンプで判定

---

## 10. デプロイメント

### 10.1 環境

| 環境 | 用途 | URL |
|------|------|-----|
| Development | ローカル開発 | http://localhost:3000 |
| Staging | テスト環境 | https://staging.genchi-kakunin.app (予定) |
| Production | 本番環境 | https://genchi-kakunin.app (予定) |

### 10.2 CI/CD パイプライン

```
GitHub Push
  ↓
Vercel自動デプロイ
  ↓
ビルド (Next.js)
  ↓
型チェック (TypeScript)
  ↓
Lint (ESLint)
  ↓
テスト (Jest) ← 導入予定
  ↓
デプロイ (Vercel Edge)
```

### 10.3 データベースマイグレーション

```bash
# 開発環境
npx prisma migrate dev

# 本番環境
npx prisma migrate deploy
```

---

## 11. 監視・ロギング

### 11.1 アプリケーション監視
- **Vercel Analytics**: ページビュー、パフォーマンス
- **Sentry** (導入予定): エラートラッキング
- **LogRocket** (検討中): セッションリプレイ

### 11.2 データベース監視
- Supabase Dashboard: クエリパフォーマンス、接続数
- Slow Query Log: 遅いクエリの特定

### 11.3 アラート
- エラー発生時: Sentry → Slack通知
- ダウンタイム検知: UptimeRobot (検討中)

---

## 12. スケーラビリティ

### 12.1 水平スケーリング
- **Vercel**: 自動スケーリング (Hobby: 100GB/月, Pro: 1TB/月)
- **Supabase**: 接続数に応じてプラン変更

### 12.2 垂直スケーリング
- データベース: Supabase Free (500MB) → Pro (8GB+)

### 12.3 キャパシティプランニング

| ユーザー数 | 月間確認件数 | DB容量 | Vercel帯域 | コスト/月 |
|-----------|-------------|--------|-----------|----------|
| 5-10社 (Beta) | ~500件 | 500MB | 100GB | $1 |
| 50社 | ~5,000件 | 2GB | 500GB | $85 |
| 200社 | ~20,000件 | 8GB | 1TB | $230 |

---

## 13. 今後の拡張

### Phase 2 (3-6ヶ月後)
- モバイルアプリ (React Native / Expo)
- 高度な写真編集機能
- AIによる異常検知
- ダッシュボード・分析機能

### Phase 3 (6-12ヶ月後)
- 外部システム連携 (API公開)
- マルチ言語対応
- ホワイトラベル対応
- エンタープライズプラン

---

## 付録

### A. 主要ライブラリバージョン

```json
{
  "next": "14.x",
  "react": "18.x",
  "typescript": "5.x",
  "prisma": "6.x",
  "@supabase/supabase-js": "2.x",
  "zustand": "4.x",
  "react-hook-form": "7.x",
  "zod": "3.x",
  "tailwindcss": "3.x",
  "react-konva": "18.x"
}
```

### B. 参考資料

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-17
**Author**: Claude Code
