# Firebase Hosting で Health Park を公開する

このプロジェクトは **Next.js の静的エクスポート**（`output: "export"`）で `out/` を生成し、**Firebase Hosting** からそのフォルダを配信します。データの保存先は引き続きブラウザの IndexedDB が主で、バックアップ画面から任意で Firestore / Storage に同期します。

## 前提

- Node.js 20 以上
- [Firebase CLI](https://firebase.google.com/docs/cli)（`npm install -g firebase-tools`）
- Firebase プロジェクト（Blaze 課金は必須ではありませんが、Storage 利用に応じて枠を確認してください）

## Firebase コンソール側の設定

1. **Authentication** → Sign-in method → **メール／パスワード**を有効化する。
2. **Firestore Database** を作成する（本番モードで開始し、後述のルールをデプロイする）。
3. **Storage** を有効化する。
4. プロジェクト設定から **ウェブアプリ**を登録し、SDK 用の設定値（API Key など）を控える。

## ローカルの環境変数

プロジェクト直下に `.env.local` を作成し、`.env.local.example` の `NEXT_PUBLIC_FIREBASE_*` を埋める。ビルド時にクライアントに埋め込まれるため、**公開して問題ないキー**のみを使う。

## セキュリティルールのデプロイ

リポジトリには次が含まれます。

- `firestore.rules` … `users/{userId}/**` は `request.auth.uid == userId` のみ読み書き可
- `storage.rules` … `users/{userId}/**` 同様

初回またはルール変更後:

```bash
firebase login
firebase use <あなたのプロジェクトID>
firebase deploy --only firestore:rules,storage
```

## ビルドと Hosting へのデプロイ

```bash
npm ci
npm run build
```

成功すると `out/` に静的ファイルが出力されます。

```bash
firebase deploy --only hosting
```

`firebase.json` の `hosting.public` は `out` を指しています。

## よくある注意点

- **別のブラウザ／端末**で同じバックアップを使うには、**同じメールアドレスでログイン**してください。
- カスタムドメインやリライト規則は [Firebase Hosting のドキュメント](https://firebase.google.com/docs/hosting)に従って `firebase.json` を拡張してください。
