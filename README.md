# 現地確認くん

産業廃棄物処理施設などの現地確認業務を効率化するマルチテナントSaaSアプリケーション

![Status](https://img.shields.io/badge/status-beta-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 📋 概要

現地確認くんは、産業廃棄物処理施設などの現地確認業務における課題を解決するWebアプリケーションです。

### 解決する課題

- ❌ 何を確認すべきか不明確
- ❌ 報告書作成に時間がかかる
- ❌ 写真管理が煩雑
- ❌ 承認フローが複雑

### 提供する価値

- ✅ カスタマイズ可能なチェックシート
- ✅ モバイル対応の確認作業
- ✅ 写真の撮影・編集・注釈追加
- ✅ 柔軟な承認ワークフロー
- ✅ PDFレポート自動生成

---

## 🚀 クイックスタート

### 前提条件

- Node.js 18以上
- pnpm (推奨)
- Supabaseアカウント

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd genchi-kakunin-kun

# 依存関係をインストール
pnpm install

# 環境変数を設定
cp .env.example .env.local
# .env.local を編集してSupabase認証情報を設定

# Prisma Clientを生成
npx prisma generate

# 開発サーバーを起動
pnpm dev
```

http://localhost:3000 でアクセス可能

---

## 🏗️ プロジェクト構成

```
genchi-kakunin-kun/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # Reactコンポーネント
│   ├── lib/              # ユーティリティ・ライブラリ
│   ├── store/            # Zustand状態管理
│   └── types/            # TypeScript型定義
├── prisma/
│   └── schema.prisma     # データベーススキーマ
├── docs/                 # ドキュメント
│   ├── database-design.md
│   ├── architecture.md
│   └── development-guide.md
└── public/               # 静的ファイル
```

---

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (状態管理)
- **React Hook Form + Zod** (フォーム・バリデーション)
- **react-konva** (画像編集)

### バックエンド
- **Next.js API Routes**
- **Prisma** (ORM)
- **Supabase** (認証・データベース・ストレージ)

### インフラ
- **Vercel** (ホスティング)
- **PostgreSQL** (Supabase)

---

## 📚 ドキュメント

| ドキュメント | 説明 |
|------------|------|
| [要件定義書](../projectplan.md) | プロジェクト全体の要件定義 |
| [データベース設計書](./docs/database-design.md) | ER図・テーブル定義・RLSポリシー |
| [アーキテクチャ設計書](./docs/architecture.md) | システムアーキテクチャ・技術選定 |
| [開発者向けガイド](./docs/development-guide.md) | セットアップ・コーディング規約・トラブルシューティング |

---

## 🗄️ データベース

### テーブル一覧

| テーブル | 説明 |
|---------|------|
| `organizations` | 企業・テナント |
| `users` | ユーザー |
| `sites` | 現地確認先 |
| `templates` | チェックシートテンプレート |
| `template_items` | テンプレート項目 |
| `inspections` | 確認実施記録 |
| `inspection_items` | チェック項目の回答 |
| `photos` | 写真 |
| `approval_logs` | 承認ログ |

### セキュリティ

- Row Level Security (RLS) によるマルチテナント分離
- 組織単位でのデータ分離
- ロールベースアクセス制御 (admin / user / viewer)

---

## 💻 開発

### よく使うコマンド

```bash
# 開発サーバー起動
pnpm dev

# 本番ビルド
pnpm build

# Lint実行
pnpm lint

# 型チェック
pnpm type-check

# Prisma Studio起動 (GUIでDB確認)
npx prisma studio
```

### データベースマイグレーション

```bash
# スキーマからSQLを生成
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration.sql

# Supabase SQL Editorで実行

# Prisma Clientを再生成
npx prisma generate
```

---

## 🧪 テスト

```bash
# 単体テスト
pnpm test

# カバレッジ確認
pnpm test:coverage

# E2Eテスト (導入予定)
pnpm test:e2e
```

---

## 🚢 デプロイ

### Vercelへのデプロイ

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

### 環境変数

以下の環境変数をVercelダッシュボードで設定:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

---

## 📈 ロードマップ

### MVP (Phase 1) - 完了予定: 2025年3月

- [x] データベース設計
- [x] 認証・認可
- [ ] 現地確認先管理
- [ ] テンプレート管理
- [ ] 確認作業画面
- [ ] 写真編集機能
- [ ] 承認ワークフロー
- [ ] PDFレポート出力

### Phase 2 (3-6ヶ月後)

- [ ] モバイルアプリ (React Native)
- [ ] オフライン対応強化
- [ ] ダッシュボード・分析機能
- [ ] 通知機能

### Phase 3 (6-12ヶ月後)

- [ ] 外部システム連携API
- [ ] AIによる異常検知
- [ ] マルチ言語対応
- [ ] エンタープライズプラン

---

## 🤝 コントリビューション

コントリビューションは大歓迎です！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

詳細は [開発者向けガイド](./docs/development-guide.md) を参照してください。

---

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](./LICENSE) を参照してください。

---

## 🙏 謝辞

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Supabase](https://supabase.com/)
- [Vercel](https://vercel.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📞 サポート

質問や問題がある場合は、[Issues](https://github.com/your-repo/genchi-kakunin-kun/issues) を開いてください。

---

**Built with ❤️ by the Genchi Kakunin Team**
