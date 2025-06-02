# 開発環境セットアップガイド

## 必要要件

### システム要件
- Windows 10以上 または macOS 10.15以上
- Node.js v16.0.0以上
- npm v8.0.0以上
- Git

### 推奨IDE/ツール
- Visual Studio Code
  - 推奨拡張機能:
    - ESLint
    - Prettier
    - TypeScript Vue Plugin (Volar)
    - Mermaid Preview
    - GitLens

## 初期セットアップ

### 1. リポジトリのクローン
```bash
# リポジトリをクローン
git clone https://github.com/sho-uver/task_management.git

# プロジェクトディレクトリに移動
cd task_management
```

### 2. 依存パッケージのインストール
```bash
# 依存パッケージをインストール
npm install
```

### 3. 環境変数の設定
1. `.env.example`ファイルを`.env`にコピー
```bash
cp .env.example .env
```

2. `.env`ファイルを編集し、必要な環境変数を設定
```env
# Notion API設定
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_database_id

# アプリケーション設定
APP_NAME=TaskManagement
ELECTRON_WINDOW_WIDTH=400
ELECTRON_WINDOW_HEIGHT=400
```

## 開発用コマンド

### アプリケーションの起動
```bash
# 開発モードでの起動（ホットリロード対応）
npm run dev        # Webpackの開発サーバー起動
npm run electron-dev  # 別ターミナルでElectronを起動
```

### ビルドとパッケージング
```bash
# プロダクションビルド
npm run build

# 開発用パッケージング
npm run pack

# 配布用パッケージの作成
npm run dist
```

### コード品質管理
```bash
# リンター実行
npm run lint

# リンター自動修正
npm run lint:fix

# コードフォーマット
npm run format

# TypeScriptの型チェック
npm run type-check
```

## プロジェクト構造

```
task_management/
├── src/
│   ├── main/           # Electronのメインプロセス
│   │   ├── main.ts     # エントリーポイント
│   │   └── store.ts    # データストア
│   ├── renderer/       # レンダラープロセス（React）
│   │   ├── components/ # Reactコンポーネント
│   │   ├── hooks/     # カスタムフック
│   │   ├── store/     # 状態管理
│   │   ├── types/     # 型定義
│   │   ├── utils/     # ユーティリティ関数
│   │   ├── index.html # HTMLテンプレート
│   │   └── index.tsx  # Reactエントリーポイント
│   └── shared/        # 共有モジュール
│       ├── constants/ # 定数
│       └── types/     # 共有型定義
├── dist/              # ビルド出力
├── docs/              # ドキュメント
├── tests/             # テストファイル
├── .eslintrc.js      # ESLint設定
├── .prettierrc       # Prettier設定
├── tsconfig.json     # TypeScript設定
├── webpack.config.js # Webpack設定
└── package.json      # プロジェクト設定
```

## 開発フロー

### 1. ブランチ戦略
- `main`: プロダクションブランチ
- `develop`: 開発ブランチ
- `feature/*`: 機能開発ブランチ
- `fix/*`: バグ修正ブランチ

### 2. コミットメッセージ規約
```
feat: 新機能
fix: バグ修正
docs: ドキュメントのみの変更
style: コードの意味に影響を与えない変更（空白、フォーマット、セミコロンなど）
refactor: バグ修正や機能追加のないコード変更
test: テストの追加・修正
chore: ビルドプロセスやドキュメント生成などの補助ツールやライブラリの変更
```

### 3. プルリクエストプロセス
1. 機能ブランチを作成
2. コードを実装
3. テストを追加/更新
4. lint/format/type-checkを実行
5. プルリクエストを作成
6. コードレビュー
7. マージ

## トラブルシューティング

### よくある問題と解決方法

1. **npm installが失敗する場合**
```bash
# node_modulesを削除して再インストール
rm -rf node_modules
npm cache clean --force
npm install
```

2. **Electronの起動に失敗する場合**
```bash
# distディレクトリを削除して再ビルド
rm -rf dist
npm run build
npm run electron-dev
```

3. **型エラーが発生する場合**
```bash
# 型定義ファイルを再生成
npm run type-check
```

### デバッグ方法

1. **メインプロセスのデバッグ**
- VSCodeのデバッグ設定を使用
- `.vscode/launch.json`の設定を使用

2. **レンダラープロセスのデバッグ**
- Chrome DevToolsを使用
- React Developer Toolsを使用

## CI/CD環境

### GitHub Actions
- プルリクエスト時の自動テスト
- mainブランチへのマージ時の自動デプロイ
- リリースタグ作成時のパッケージビルド

### 環境変数の設定
GitHub Secretsに以下の値を設定:
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `GH_TOKEN`（GitHubトークン） 