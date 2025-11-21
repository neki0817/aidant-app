# デプロイ手順書

## セキュリティ対策実装完了

OpenAI APIキーをCloud Functionsに移行し、フロントエンドから削除しました。

---

## 1. Firebase Cloud Functionsのデプロイ

### 1.1 Firebase CLI ログイン

```bash
firebase login
```

### 1.2 プロジェクトの選択

```bash
cd C:\Github\claude\aidant-app
firebase use aidant-app
```

### 1.3 OpenAI APIキーの設定

**重要: この環境変数はCloud Functionsサーバー側でのみ使用され、フロントエンドには公開されません。**

```bash
firebase functions:config:set openai.key="<YOUR_OPENAI_API_KEY>"
```

設定確認:
```bash
firebase functions:config:get
```

### 1.4 Cloud Functionsのデプロイ

```bash
firebase deploy --only functions
```

デプロイ完了後、以下のエンドポイントが作成されます:
- `generateSubsidyApplication` - 様式2生成
- `generateAnswerDraft` - AI Draft生成

---

## 2. Firestore Security Rulesのデプロイ

```bash
firebase deploy --only firestore:rules
```

---

## 3. フロントエンドのデプロイ

### 3.1 ビルド

```bash
npm run build
```

### 3.2 Firebase Hostingにデプロイ

```bash
firebase deploy --only hosting
```

---

## 4. 動作確認

### 4.1 ローカルテスト（Emulator）

```bash
# Cloud Functions Emulatorを起動
cd functions
npm run serve

# 別のターミナルでフロントエンドを起動
cd ..
npm start
```

### 4.2 本番環境テスト

1. https://aidant-app.web.app にアクセス
2. ログイン
3. Phase 1-6の質問に回答
4. 様式2生成ボタンをクリック
5. ポイント消費とレート制限が正しく機能することを確認

---

## 5. セキュリティチェックリスト

### ✅ 完了した対策

- [x] OpenAI APIキーをCloud Functionsに移行
- [x] フロントエンドから`REACT_APP_OPENAI_API_KEY`を削除
- [x] Firebase Authentication必須化
- [x] レート制限実装（様式2生成: 10回/日、AI Draft: 50回/日）
- [x] ポイント残高チェック
- [x] Firestore Security Rules設定済み
- [x] `.env`ファイルは`.gitignore`に含まれている

### ⚠️ 推奨される追加対策

- [ ] Google Maps APIキーにHTTPリファラー制限を設定
  - Google Cloud Console → APIs & Services → Credentials
  - 許可するリファラー: `https://aidant-app.web.app/*`

- [ ] OpenAI API使用量アラート設定
  - OpenAI Dashboard → Usage → Set monthly budget alert
  - 推奨: 月$50でアラート

- [ ] Firebase料金アラート設定
  - Firebase Console → Usage and billing → Set budget alert

---

## 6. レート制限の詳細

### 様式2生成 (`generateSubsidyApplication`)
- **コスト**: 100ポイント/回
- **レート制限**: 10回/日（ユーザーごと）
- **モデル**: GPT-4o
- **最大トークン数**: 8,000

### AI Draft生成 (`generateAnswerDraft`)
- **コスト**: 10ポイント/回
- **レート制限**: 50回/日（ユーザーごと）
- **モデル**: GPT-4o-mini
- **最大トークン数**: 500

---

## 7. トラブルシューティング

### Cloud Functionsのログ確認

```bash
firebase functions:log
```

### 特定の関数のログのみ表示

```bash
firebase functions:log --only generateSubsidyApplication
```

### エミュレーターでのデバッグ

```bash
cd functions
npm run serve
```

---

## 8. コスト見積もり

### Firebase Cloud Functions（東京リージョン: asia-northeast1）

**無料枠:**
- 125,000回/月の呼び出し
- 40,000 GB秒/月のコンピューティング時間

**課金超過時:**
- $0.40 / 100万回呼び出し
- $0.0000025 / GB秒

**見積もり:**
- 月間100ユーザー × 10回生成 = 1,000回/月
- 無料枠内で運用可能

### OpenAI API

**GPT-4o:**
- Input: $2.50 / 1M tokens
- Output: $10.00 / 1M tokens

**GPT-4o-mini:**
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

**見積もり（月間1,000回の様式2生成）:**
- 入力トークン: 約5,000 tokens/回 × 1,000回 = 5M tokens
- 出力トークン: 約8,000 tokens/回 × 1,000回 = 8M tokens
- コスト: (5M × $2.50 + 8M × $10.00) / 1M = **約$92.50/月**

---

## 9. バックアップと復旧

### Firestore データのエクスポート

```bash
gcloud firestore export gs://aidant-app.appspot.com/backups/$(date +%Y%m%d)
```

### インポート

```bash
gcloud firestore import gs://aidant-app.appspot.com/backups/20250123
```

---

## 10. セキュリティアップデート

定期的に以下を実施:

```bash
# Cloud Functions依存関係の更新
cd functions
npm audit
npm update

# フロントエンド依存関係の更新
cd ..
npm audit
npm update
```

---

## 連絡先

問題が発生した場合は、以下を確認してください:

1. Firebase Console: https://console.firebase.google.com/project/aidant-app
2. OpenAI Dashboard: https://platform.openai.com/usage
3. Cloud Functions ログ: `firebase functions:log`

---

**最終更新日**: 2025-10-23
