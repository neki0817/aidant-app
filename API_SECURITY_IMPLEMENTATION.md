# API保護実装完了レポート

## 📋 実装サマリー

**実施日**: 2025-10-23
**対策内容**: OpenAI APIキーをCloud Functionsに移行し、フロントエンドから完全に削除

---

## ✅ 完了した作業

### 1. Firebase Cloud Functionsのセットアップ

**作成ファイル:**
- `functions/index.js` - Cloud Functions本体
- `functions/package.json` - 依存関係定義
- `functions/.eslintrc.js` - ESLint設定
- `functions/.gitignore` - Git除外設定
- `firebase.json` - Firebase設定

**実装した関数:**
1. **`generateSubsidyApplication`** - 様式2生成
   - モデル: GPT-4o
   - コスト: 100ポイント/回
   - レート制限: 10回/日/ユーザー
   - リージョン: asia-northeast1（東京）

2. **`generateAnswerDraft`** - AI Draft生成
   - モデル: GPT-4o-mini
   - コスト: 10ポイント/回
   - レート制限: 50回/日/ユーザー
   - リージョン: asia-northeast1（東京）

### 2. セキュリティ機能の実装

#### 認証チェック
```javascript
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
}
```

#### ポイント残高チェック
```javascript
if ((userData.pointBalance || 0) < generationCost) {
  throw new functions.https.HttpsError('failed-precondition', 'ポイント残高が不足しています');
}
```

#### レート制限
```javascript
const today = new Date().toISOString().split('T')[0];
const rateLimitKey = `apiCalls_${today}`;
const todayCalls = userData[rateLimitKey] || 0;

if (todayCalls >= 10) {
  throw new functions.https.HttpsError('resource-exhausted', '本日の利用上限（10回）に達しました');
}
```

### 3. フロントエンドの修正

**変更ファイル:**
- `src/services/openai/openai.js` - Cloud Functions呼び出しに変更
- `.env` - OpenAI APIキーをコメントアウト

**Before:**
```javascript
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,  // 危険！
  dangerouslyAllowBrowser: true
});
```

**After:**
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const generateFunc = httpsCallable(functions, 'generateSubsidyApplication');
const result = await generateFunc({ answers });
```

### 4. ドキュメント作成

- **DEPLOYMENT.md** - デプロイ手順書
- **SECURITY.md** - セキュリティ対策詳細
- **API_SECURITY_IMPLEMENTATION.md** - 本レポート

---

## 🔐 セキュリティ改善

### Before（実装前）

| 項目 | 状態 | リスク |
|-----|------|-------|
| OpenAI APIキー | フロントエンド露出 | 🔴 高 |
| レート制限 | なし | 🔴 高 |
| コスト管理 | 手動のみ | 🟡 中 |
| 認証 | あり | 🟢 低 |

### After（実装後）

| 項目 | 状態 | リスク |
|-----|------|-------|
| OpenAI APIキー | サーバーサイド管理 | 🟢 低 |
| レート制限 | 実装済み | 🟢 低 |
| コスト管理 | ポイント制＋レート制限 | 🟢 低 |
| 認証 | Cloud Functions必須 | 🟢 低 |

---

## 📦 デプロイ手順

### 必須作業

1. **Firebase CLIログイン**
   ```bash
   firebase login
   ```

2. **OpenAI APIキーの設定**
   ```bash
   firebase functions:config:set openai.key="<YOUR_OPENAI_API_KEY>"
   ```

3. **Cloud Functionsのデプロイ**
   ```bash
   firebase deploy --only functions
   ```

4. **フロントエンドのビルドとデプロイ**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### 推奨作業

5. **Google Maps APIキーの制限設定**
   - Google Cloud Console → APIs & Services → Credentials
   - HTTPリファラー制限: `https://aidant-app.web.app/*`

6. **OpenAI API使用量アラート設定**
   - https://platform.openai.com/usage
   - Monthly budget: $50

7. **Firebase料金アラート設定**
   - Firebase Console → Usage and billing
   - Budget alert: $20/月

---

## 💰 コスト見積もり

### OpenAI API

**月間1,000回の様式2生成を想定:**

| 項目 | 単価 | 使用量 | コスト |
|-----|------|-------|-------|
| GPT-4o Input | $2.50/1M tokens | 5M tokens | $12.50 |
| GPT-4o Output | $10.00/1M tokens | 8M tokens | $80.00 |
| GPT-4o-mini（AI Draft） | - | 5,000回 | $5.00 |
| **合計** | | | **$97.50/月** |

### Firebase Cloud Functions

**月間6,000回の関数呼び出し:**
- 無料枠: 125,000回/月
- **コスト: $0（無料枠内）**

### Firestore

**月間10,000回の読み書き:**
- 無料枠: 50,000読み取り/日、20,000書き込み/日
- **コスト: $0（無料枠内）**

**合計見積もり: 約$100/月**

---

## 🧪 テスト方法

### ローカルテスト（Emulator）

```bash
# Cloud Functions Emulatorを起動
cd functions
npm run serve

# 別のターミナルでフロントエンドを起動
cd ..
npm start
```

### 本番環境テスト

1. https://aidant-app.web.app にアクセス
2. ログイン
3. Phase 1-6の質問に回答
4. 様式2生成ボタンをクリック
5. 以下を確認:
   - ✅ ポイントが100ポイント消費される
   - ✅ 様式2が正常に生成される
   - ✅ レート制限カウンターが増加する
   - ✅ 11回目の呼び出しでエラーが表示される

---

## 📊 監視とログ

### Cloud Functions Logs

```bash
# 全てのログ
firebase functions:log

# 特定の関数のみ
firebase functions:log --only generateSubsidyApplication

# リアルタイム監視
firebase functions:log --follow
```

### OpenAI Usage Dashboard

https://platform.openai.com/usage

**確認項目:**
- 日次使用量（Tokens）
- コスト推移
- エラー率

### Firebase Console

https://console.firebase.google.com/project/aidant-app

**確認項目:**
- Cloud Functions 呼び出し回数
- Firestore 読み書き回数
- Authentication アクティブユーザー数

---

## ⚠️ 残存リスク

### Google Maps APIキー

**現状:**
- フロントエンドに`REACT_APP_GOOGLE_MAPS_API_KEY`が露出
- API制限は設定済みだが、HTTPリファラー制限は未設定

**リスク:**
- 🟡 中程度（Maps APIキーは用途が限定的なため、OpenAIほど深刻ではない）

**推奨対策:**
1. Google Cloud ConsoleでHTTPリファラー制限を設定
2. API使用量アラートを設定（月10,000リクエスト）

---

## 📝 次のステップ

### 即座に実施（デプロイ前）

- [ ] OpenAI APIキーをCloud Functionsに設定
- [ ] Cloud Functionsをデプロイ
- [ ] フロントエンドをビルド＆デプロイ
- [ ] 動作確認テスト

### 短期（1週間以内）

- [ ] Google Maps APIキーの制限設定
- [ ] OpenAI API使用量アラート設定
- [ ] Firebase料金アラート設定
- [ ] ローカルEmulatorでの動作確認

### 中期（1ヶ月以内）

- [ ] 本番環境での負荷テスト
- [ ] セキュリティ監査
- [ ] 使用量データの分析
- [ ] コスト最適化の検討

---

## 🎯 成果

### セキュリティ向上

- ✅ OpenAI APIキーがフロントエンドから完全に削除
- ✅ 認証必須化によるアクセス制御
- ✅ レート制限によるDoS攻撃対策
- ✅ ポイントシステムによるコスト管理

### コスト管理

- ✅ ユーザーごとの使用量制限（10回/日）
- ✅ ポイント消費による利用制御
- ✅ 使用履歴の完全な記録

### 運用改善

- ✅ Cloud Functions Logsによる監視
- ✅ エラーハンドリングの充実
- ✅ ドキュメントの整備

---

## 📞 サポート情報

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
   - DEPLOYMENT.md - デプロイ手順
   - SECURITY.md - セキュリティ詳細

---

**実装担当**: Development Team
**レビュー**: Pending
**承認**: Pending
**デプロイ予定日**: 2025-10-23

---

## ✅ チェックリスト

### 実装完了

- [x] Cloud Functions セットアップ
- [x] generateSubsidyApplication 実装
- [x] generateAnswerDraft 実装
- [x] レート制限実装
- [x] ポイントシステム実装
- [x] フロントエンド変更
- [x] .env ファイル修正
- [x] ドキュメント作成
- [x] ビルドテスト成功

### デプロイ前確認

- [ ] Firebase CLIインストール済み
- [ ] Firebase ログイン済み
- [ ] OpenAI APIキー準備済み
- [ ] バックアップ取得済み
- [ ] ロールバック手順確認済み

### デプロイ後確認

- [ ] Cloud Functions デプロイ成功
- [ ] フロントエンド デプロイ成功
- [ ] 様式2生成の動作確認
- [ ] AI Draft生成の動作確認
- [ ] レート制限の動作確認
- [ ] ポイント消費の動作確認
- [ ] エラーハンドリングの確認

---

**実装完了日**: 2025-10-23
**ステータス**: ✅ 実装完了、デプロイ準備完了
