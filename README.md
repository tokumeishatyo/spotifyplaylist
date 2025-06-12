# Spotify Playlist Manager

Spotifyのプレイリストと楽曲を管理するためのローカルWebアプリケーション。

## セットアップ手順

### 1. 依存関係のインストール
```bash
npm install
```

### 2. Spotify App の作成
1. [Spotify for Developers](https://developer.spotify.com/dashboard) にアクセス
2. 新しいアプリを作成
3. ~~Redirect URI に `https://localhost:8089/callback` を追加~~
   Redirect URI に `http://localhost:5173/callback` を追加
4. Client ID と Client Secret をメモ

### 3. 環境変数の設定
```bash
cp .env.example .env
```
`.env` ファイルを編集して、Spotify の Client ID と Client Secret を設定

### 4. ~~自己署名証明書の生成~~
~~```bash~~
~~npm run generate-cert~~
~~```~~
（HTTPSは使用しないため、この手順は不要です）

### 5. サーバーの起動
```bash
npm start
```

### 6. アプリケーションへのアクセス
~~ブラウザで https://localhost:8089 にアクセス~~
ブラウザで http://localhost:5173 にアクセス

~~**注意**: 自己署名証明書を使用しているため、ブラウザで警告が表示されます。「詳細設定」→「localhost にアクセスする（安全ではありません）」をクリックして進んでください。~~
（HTTPを使用するため、証明書の警告は表示されません）

## 機能
- Spotifyアカウントでのログイン
- プレイリスト一覧表示
- 楽曲一覧表示
- プレイリスト/楽曲の選択・削除
- ライト/ダークモード切替