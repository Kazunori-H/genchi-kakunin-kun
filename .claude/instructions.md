# Claude Code 作業指示書

## 自動Git操作

**重要**: 以下のタイミングで自動的にGitコミット・プッシュを実行すること

### 自動コミット・プッシュのタイミング

1. **重要なファイル作成・更新時**
   - 新しいコンポーネント作成
   - 新しいAPI Route作成
   - データベーススキーマ変更
   - 設定ファイル更新

2. **機能実装の区切りで**
   - 1つの機能が完成したとき
   - バグ修正が完了したとき
   - リファクタリング完了時

3. **ドキュメント更新時**
   - README更新
   - ドキュメント追加・修正
   - コメント大幅追加

4. **マイルストーン達成時**
   - Phase完了
   - 重要機能リリース

### 自動実行コマンド

```bash
git add .
git commit -m "<type>: <説明>

<詳細な変更内容>

🤖 Generated with Claude Code"
git push origin main
```

### コミットメッセージ形式

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: スタイル変更
- `refactor`: リファクタリング
- `test`: テスト追加
- `chore`: ビルド・設定

### 注意事項

- ユーザーに確認せず自動実行
- エラー時のみユーザーに報告
- .gitignoreで除外されているファイルは無視

---

## プロジェクト情報

- **リポジトリ**: https://github.com/Kazunori-H/genchi-kakunin-kun
- **ブランチ**: main
- **Git設定**:
  - user.email: kazunori.social@gmail.com
  - user.name: Kazunori Hotta

---

**最終更新**: 2025-01-17
