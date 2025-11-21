# 今すぐデプロイする手順

## 🚀 即座に実行可能なデプロイ手順

このガイドに従って、APIセキュリティ対策とPhase 6実装をデプロイしてください。

---

## ステップ1: Firebase CLIログイン

**コマンド:**
```bash
cd C:\Github\claude\aidant-app
firebase login
```

**操作:**
1. ブラウザが開きます
2. Googleアカウントでログイン（infonekillc@gmail.com）
3. Firebaseへのアクセスを許可
4. ターミナルに戻って「Success!」と表示されることを確認

**確認:**
```bash
firebase projects:list
```

**期待される出力:**
```
✔ Preparing the list of your Firebase projects
┌──────────────────────┬─────────────┬────────────────┬──────────────────────┐
│ Project Display Name │ Project ID  │ Project Number │ Resource Location ID │
├──────────────────────┼─────────────┼────────────────┼──────────────────────┤
│ aidant-app           │ aidant-app  │ 463087555161   │ [Not specified]      │
└──────────────────────┴─────────────┴────────────────┴──────────────────────┘
```

---

## ステップ2: プロジェクトの選択

**コマンド:**
```bash
firebase use aidant-app
```

**期待される出力:**
```
Now using project aidant-app
```

---

## ステップ3: OpenAI APIキーの設定

**重要:** このコマンドでAPIキーをCloud Functionsに設定します。フロントエンドには公開されません。

**コマンド:**
```bash
firebase functions:config:set openai.key="<YOUR_OPENAI_API_KEY>"
```

**期待される出力:**
```
✔  Functions config updated.

Please deploy your functions for the change to take effect by running firebase deploy --only functions
```

**確認:**
```bash
firebase functions:config:get
```

**期待される出力:**
```json
{
  "openai": {
    "key": "sk-proj-Jcxn1D..."
  }
}
```

---

## ステップ4: Cloud Functionsのデプロイ

**所要時間:** 約5-10分

**コマンド:**
```bash
firebase deploy --only functions
```

**期待される出力:**
```
=== Deploying to 'aidant-app'...

i  deploying functions
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (XX.XX KB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js 18 function generateSubsidyApplication(asia-northeast1)...
i  functions: creating Node.js 18 function generateAnswerDraft(asia-northeast1)...
✔  functions[generateSubsidyApplication(asia-northeast1)]: Successful create operation.
✔  functions[generateAnswerDraft(asia-northeast1)]: Successful create operation.

✔  Deploy complete!
```

**エラーが出た場合:**
- Node.js 18が必要です（現在v22を使用中）
- 以下のコマンドでNode 18をインストール:
  ```bash
  nvm install 18
  nvm use 18
  ```

---

## ステップ5: Firestore Security Rulesのデプロイ

**コマンド:**
```bash
firebase deploy --only firestore:rules
```

**期待される出力:**
```
=== Deploying to 'aidant-app'...

i  deploying firestore
i  firestore: reading indexes from firestore.indexes.json...
i  firestore: reading rules from firestore.rules...
✔  firestore: deployed indexes in firestore.indexes.json successfully
✔  firestore: deployed rules firestore.rules successfully

✔  Deploy complete!
```

---

## ステップ6: フロントエンドのビルド

**所要時間:** 約2-3分

**コマンド:**
```bash
npm run build
```

**期待される出力:**
```
Creating an optimized production build...
Compiled with warnings. (警告は無視してOK)

File sizes after gzip:

  352.39 kB  build\static\js\main.66fa87ea.js
  4.55 kB    build\static\css\main.8f31587d.css

The build folder is ready to be deployed.
```

---

## ステップ7: Firebase Hostingにデプロイ

**所要時間:** 約1-2分

**コマンド:**
```bash
firebase deploy --only hosting
```

**期待される出力:**
```
=== Deploying to 'aidant-app'...

i  deploying hosting
i  hosting[aidant-app]: beginning deploy...
i  hosting[aidant-app]: found XX files in build
✔  hosting[aidant-app]: file upload complete
i  hosting[aidant-app]: finalizing version...
✔  hosting[aidant-app]: version finalized
i  hosting[aidant-app]: releasing new version...
✔  hosting[aidant-app]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/aidant-app/overview
Hosting URL: https://aidant-app.web.app
```

---

## ステップ8: 動作確認

### 8.1 Hosting URLにアクセス

**URL:** https://aidant-app.web.app

### 8.2 ログイン

Firebase Authenticationでログイン

### 8.3 Phase 1-6の質問に回答

1. Phase 1: 申請資格確認（Q1-0 〜 Q1-21）
2. Phase 2: 顧客ニーズと市場の動向（P2-1 〜 P2-6）
3. Phase 3: 自社の強み（P3-1 〜 P3-7）
4. Phase 4: 経営方針・目標（P4-1 〜 P4-8）
5. Phase 5: 補助事業の具体的内容（P5-1 〜 P5-12）
6. **Phase 6: 文章スタイル確認（P6-1 〜 P6-3）** ← 新機能！

### 8.4 様式2生成

1. 「申請書を生成する」ボタンをクリック
2. ポイントが100ポイント消費されることを確認
3. 様式2が生成されることを確認
4. 生成された文章がPhase 6で選択したスタイルになっていることを確認

### 8.5 Cloud Functions Logsの確認

**コマンド:**
```bash
firebase functions:log
```

**期待されるログ:**
```
2025-10-23T10:15:00.123Z I generateSubsidyApplication: User: abc123, Attempt: 1/10
2025-10-23T10:15:05.456Z I generateSubsidyApplication: Success. Points deducted: 100
```

---

## トラブルシューティング

### エラー1: "Node.js 18 required"

**解決方法:**
```bash
nvm install 18
nvm use 18
firebase deploy --only functions
```

### エラー2: "Permission denied"

**解決方法:**
```bash
firebase login --reauth
```

### エラー3: "Budget exceeded"

**対策:**
- OpenAI Dashboard (https://platform.openai.com/usage) で使用量確認
- 必要に応じて予算アラート設定

### エラー4: Cloud Functions呼び出しエラー

**確認項目:**
1. Firebase Consoleで関数がデプロイされているか確認
2. Cloud Functions Logsでエラーを確認
   ```bash
   firebase functions:log --only generateSubsidyApplication
   ```

---

## デプロイ後の確認チェックリスト

### 必須確認項目

- [ ] Firebase CLIログイン成功
- [ ] OpenAI APIキー設定完了
- [ ] Cloud Functions デプロイ成功
  - [ ] generateSubsidyApplication
  - [ ] generateAnswerDraft
- [ ] Firestore Rules デプロイ成功
- [ ] Hosting デプロイ成功
- [ ] https://aidant-app.web.app にアクセス可能

### 機能確認項目

- [ ] ログイン可能
- [ ] Phase 1-5の質問に回答可能
- [ ] **Phase 6の質問が表示される** ← 新機能
- [ ] 様式2生成が成功する
- [ ] ポイントが100ポイント消費される
- [ ] レート制限が機能する（11回目でエラー）
- [ ] 生成された文章がPhase 6のスタイル設定を反映している

### セキュリティ確認項目

- [ ] ブラウザのDevToolsでOpenAI APIキーが見えないことを確認
- [ ] Network TabでCloud Functions呼び出しを確認
- [ ] 認証なしではCloud Functionsが呼び出せないことを確認

---

## コスト監視設定（推奨）

### OpenAI API使用量アラート

1. https://platform.openai.com/usage にアクセス
2. "Set monthly budget" をクリック
3. $50 に設定
4. Email notificationをONに

### Firebase料金アラート

1. Firebase Console → Usage and billing
2. "Set budget alert" をクリック
3. $20/月 に設定

---

## デプロイ完了後の次のステップ

### 即座に実施

- [ ] Google Maps APIキーの制限設定
  - Google Cloud Console → Credentials
  - HTTPリファラー制限: `https://aidant-app.web.app/*`

### 1週間以内

- [ ] 本番環境での動作確認
- [ ] ユーザーテスト（5-10名）
- [ ] OpenAI API使用量の監視
- [ ] Firebase使用量の監視

### 1ヶ月以内

- [ ] コスト分析
- [ ] セキュリティ監査
- [ ] パフォーマンス最適化

---

## サポート情報

**問題が発生した場合:**

1. **Cloud Functions Logs確認**
   ```bash
   firebase functions:log
   ```

2. **Firebase Console**
   https://console.firebase.google.com/project/aidant-app

3. **OpenAI Dashboard**
   https://platform.openai.com/usage

4. **ドキュメント参照**
   - DEPLOYMENT.md - 詳細なデプロイ手順
   - SECURITY.md - セキュリティ詳細

---

**作成日:** 2025-10-23
**想定デプロイ時間:** 約15-20分
**前提条件:** Firebase CLI、Node.js、npm インストール済み

---

## 🎯 今すぐ開始

以下のコマンドをコピー＆ペーストして実行してください：

```bash
cd C:\Github\claude\aidant-app
firebase login
firebase use aidant-app
firebase functions:config:set openai.key="<YOUR_OPENAI_API_KEY>"
firebase deploy --only functions
firebase deploy --only firestore:rules
npm run build
firebase deploy --only hosting
```

成功を祈ります！🚀
