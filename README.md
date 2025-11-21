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
- ✅ 施設種別に応じた確認項目の自動表示
- ✅ モバイル対応の確認作業
- ✅ 柔軟な承認ワークフロー
- ✅ テンプレート複製機能

---

## 🚀 クイックスタート

### 前提条件

- Node.js 18以上
- npm
- Supabaseアカウント

### セットアップ

詳細は **[SETUP.md](./SETUP.md)** を参照してください。

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd genchi-kakunin-kun

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env.local
# .env.local を編集してSupabase認証情報を設定

# 4. データベースマイグレーション実行
# database/README.md の手順に従ってSupabaseでSQLを実行

# 5. 開発サーバーを起動
npm run dev
```

http://localhost:3000 でアクセス可能

---

## 📚 ドキュメント

| ドキュメント | 説明 |
|------------|------|
| **[SETUP.md](./SETUP.md)** | 環境構築・データベースセットアップの完全ガイド |
| **[FEATURES.md](./FEATURES.md)** | 実装済み機能の詳細説明 |
| **[DEVELOPMENT-ROADMAP.md](./DEVELOPMENT-ROADMAP.md)** | 今後の開発予定 |
| **[LAYOUT-GUIDE.md](./LAYOUT-GUIDE.md)** | レイアウト使用ガイド（DashboardLayout） |
| **[docs/CODEBASE-CLEANUP.md](./docs/CODEBASE-CLEANUP.md)** | コードベース整理ステップ（安全な進め方） |
| **[docs/INVITE-INSTRUCTIONS.md](./docs/INVITE-INSTRUCTIONS.md)** | 招待・初期設定のかんたん手順 |
| **[docs/INVITE-WORKFLOW.md](./docs/INVITE-WORKFLOW.md)** | 招待ワークフローの詳細 |
| **[database/README.md](./database/README.md)** | データベースマイグレーション手順 |
| **[docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** | トラブルシューティング |
| **[docs/archive/](./docs/archive/)** | 過去のドキュメント・SQLファイル（参考用） |

---

## 🏗️ プロジェクト構成

```
genchi-kakunin-kun/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── sites/        # 現地確認先管理
│   │   ├── templates/    # テンプレート管理
│   │   └── inspections/  # 確認記録管理
│   └── lib/              # ユーティリティ・ライブラリ
│       └── supabase/     # Supabaseクライアント
├── database/
│   ├── migrations/       # データベースマイグレーション（番号順）
│   └── seeds/            # 初期データ
├── docs/
│   ├── TROUBLESHOOTING.md
│   └── archive/          # 過去のドキュメント
├── SETUP.md              # セットアップガイド
├── FEATURES.md           # 機能一覧
└── DEVELOPMENT-ROADMAP.md
```

---

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4**
- **React Hook Form + Zod** (フォーム・バリデーション)

### バックエンド
- **Next.js API Routes**
- **Supabase** (認証・PostgreSQL・ストレージ)

### インフラ
- **Cloudflare** (ホスティング)
- **PostgreSQL** (Supabase)

---

## ✨ 主な機能

### 1. 現地確認先管理
- 施設情報の登録・編集・削除
- **複数の施設種別を設定可能** (運搬/積替保管/中間処理/最終処分)

### 2. テンプレート管理
- チェックシートテンプレートの作成・編集
- **システムテンプレート**: すべての組織で利用可能な標準テンプレート
- **テンプレート複製**: ワンクリックでテンプレートをコピー
- **条件付き項目表示**: 施設種別に応じて必要な項目のみ表示

### 3. 確認記録管理
- チェックリスト入力（施設種別による自動フィルタリング）
- 概要情報（時刻、立会者）の管理
- サマリーページでの結果確認
- **削除機能**: 下書きの確認記録を作成者のみ削除可能
- **改善されたフィルターUI**: カード式レイアウト、視覚的フィードバック

### 4. 承認ワークフロー
- 申請・承認・却下・取り下げ
- **サマリーページから承認申請**: 必須項目の自動バリデーション付き
- 組織ごとの承認設定
- ステータス管理（draft / submitted / approved / rejected）

### 5. 統一レイアウト
- **DashboardLayout**: 全ページで統一されたヘッダーとナビゲーション
- アカウントメニュー（プロフィール設定、組織設定、ログアウト）
- レイアウト使用ガイドの提供

詳細は **[FEATURES.md](./FEATURES.md)** を参照してください。

---

## 🗄️ データベース

### 主要テーブル

| テーブル | 説明 |
|---------|------|
| `organizations` | 企業・テナント |
| `users` | ユーザー |
| `sites` | 現地確認先（facility_types: TEXT[]） |
| `templates` | チェックシートテンプレート（is_system_template） |
| `template_items` | テンプレート項目（display_facility_types） |
| `inspections` | 確認実施記録（overview_metadata） |
| `inspection_responses` | チェック項目の回答 |
| `approval_settings` | 承認設定 |
| `approval_requests` | 承認リクエスト |
| `approval_actions` | 承認アクション |

### セキュリティ

- **Row Level Security (RLS)** によるマルチテナント分離
- 組織単位でのデータ分離
- システムテンプレートの読み取り専用保護

マイグレーション手順は **[database/README.md](./database/README.md)** を参照してください。

---

## 💻 開発

### よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# Lint実行
npm run lint

# 型チェック
npm run type-check

# フェーズ完了チェック（Lintのみ）
npm run phase:check

# Storage/RLSセットアップ
# （Supabase SQL Editorで実行）
# database/storage/setup_inspection_photos.sql
```

### トラブルシューティング

問題が発生した場合は **[docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** を参照してください。

---

## 📈 開発ロードマップ

詳細は **[DEVELOPMENT-ROADMAP.md](./DEVELOPMENT-ROADMAP.md)** を参照してください。

### 実装済み

- ✅ データベース設計
- ✅ 認証・認可（Supabase Auth）
- ✅ 現地確認先管理（複数施設種別対応）
- ✅ テンプレート管理（システムテンプレート・複製機能）
- ✅ 確認記録管理（概要情報・チェックリスト入力）
- ✅ 確認記録の削除機能（下書き・作成者のみ）
- ✅ 承認ワークフロー（申請・承認・却下・取り下げ）
- ✅ サマリーページからの承認申請（必須項目バリデーション）
- ✅ 条件付き項目表示（施設種別フィルタリング）
- ✅ レポート機能（統計ダッシュボード、評価分布チャート）
- ✅ PDF/CSVエクスポート機能
- ✅ 統一レイアウト（DashboardLayout）
- ✅ 改善されたフィルターUI（カード式レイアウト）

### 今後の予定

- [ ] 確認記録のページネーション・検索強化
- [ ] 多段承認とユーザー権限管理
- [ ] 組織・ユーザー管理機能
- [ ] 通知機能

---

## 🤝 コントリビューション

コントリビューションは大歓迎です！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

---

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

## 🙏 謝辞

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Cloudflare](https://www.cloudflare.com/)

---

## 📞 サポート

質問や問題がある場合は、[Issues](https://github.com/your-repo/genchi-kakunin-kun/issues) を開いてください。

---

**Built with ❤️ by the Genchi Kakunin Team**
