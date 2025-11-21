# セキュリティ対策ドキュメント

## 実装済みのセキュリティ対策

### 1. APIキー保護

#### 問題（Before）
- OpenAI APIキーが`REACT_APP_OPENAI_API_KEY`としてフロントエンドに露出
- ブラウザのDevToolsで誰でもAPIキーを取得可能
- 不正利用によるAPI料金の大量発生リスク

#### 対策（After）
- **Firebase Cloud Functionsへの移行**
  - APIキーはサーバーサイド（Cloud Functions）でのみ管理
  - フロントエンドからは`httpsCallable`でCloud Functionsを呼び出し
  - APIキーはブラウザに公開されない

```javascript
// Before: フロントエンドでOpenAI直接呼び出し（危険）
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY, // ← ブラウザから見える！
  dangerouslyAllowBrowser: true
});

// After: Cloud Functions経由（安全）
const generateFunc = httpsCallable(functions, 'generateSubsidyApplication');
const result = await generateFunc({ answers });
```

---

### 2. 認証とアクセス制御

#### Firebase Authentication
- **全てのCloud Functionsで認証必須**
```javascript
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
}
```

#### Firestore Security Rules
- ユーザーは自分のデータのみ読み書き可能
```javascript
match /applications/{applicationId} {
  allow read, write: if isAuthenticated() && resource.data.userId == request.auth.uid;
}
```

---

### 3. レート制限

#### 様式2生成（generateSubsidyApplication）
- **10回/日/ユーザー**
- 超過時エラーメッセージ: 「本日の利用上限（10回）に達しました」

```javascript
const today = new Date().toISOString().split('T')[0];
const rateLimitKey = `apiCalls_${today}`;
const todayCalls = userData[rateLimitKey] || 0;

if (todayCalls >= 10) {
  throw new functions.https.HttpsError('resource-exhausted', '本日の利用上限（10回）に達しました');
}
```

#### AI Draft生成（generateAnswerDraft）
- **50回/日/ユーザー**

---

### 4. ポイントシステム

#### コスト設定
- **様式2生成**: 100ポイント/回
- **AI Draft生成**: 10ポイント/回

#### 残高チェック
```javascript
const generationCost = 100;
if ((userData.pointBalance || 0) < generationCost) {
  throw new functions.https.HttpsError('failed-precondition', 'ポイント残高が不足しています');
}
```

#### 使用履歴の記録
- `point_transactions`コレクションに全ての使用履歴を保存
- タイムスタンプ、ユーザーID、使用量、説明を記録

---

### 5. データ保護

#### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);
    }

    match /applications/{applicationId} {
      allow read, write: if isAuthenticated()
        && resource.data.userId == request.auth.uid;
    }

    // その他は全て拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## セキュリティリスクレベル（実装後）

| 項目 | リスクレベル（Before） | リスクレベル（After） | 対策内容 |
|-----|---------------------|---------------------|---------|
| OpenAI APIキー | 🔴 高 | 🟢 低 | Cloud Functions移行 |
| Google Maps APIキー | 🟡 中 | 🟡 中 | HTTPリファラー制限推奨 |
| Firebase Auth | 🟢 低 | 🟢 低 | 適切に実装済み |
| Firestore Rules | 🟢 低 | 🟢 低 | 適切に実装済み |
| レート制限 | 🔴 高 | 🟢 低 | 実装完了 |
| コスト管理 | 🟡 中 | 🟢 低 | ポイント制＋レート制限 |

---

## 残存リスクと推奨対策

### Google Maps APIキーの保護

**現状:**
- フロントエンドに`REACT_APP_GOOGLE_MAPS_API_KEY`が露出
- APIキー制限は設定済みだが、HTTPリファラー制限は未設定

**推奨対策:**

#### Google Cloud Consoleでの設定
1. https://console.cloud.google.com/ にアクセス
2. APIs & Services → Credentials
3. Google Maps APIキーを選択
4. 「Application restrictions」で「HTTP referrers」を選択
5. 許可するリファラーを追加:
   ```
   https://aidant-app.web.app/*
   https://aidant-app.firebaseapp.com/*
   http://localhost:3000/*  (開発環境用)
   ```

#### API制限の設定
「API restrictions」で以下のみ許可:
- Maps JavaScript API
- Places API
- Geocoding API

---

## 使用量監視とアラート設定

### OpenAI API

**使用量の確認:**
https://platform.openai.com/usage

**推奨設定:**
1. Monthly budget alert: $50
2. Email notification: ON
3. Hard limit: $100（アカウント停止）

**見積もりコスト:**
- 月間1,000回の様式2生成: 約$92.50/月
- 月間5,000回のAI Draft生成: 約$5.00/月
- **合計: 約$97.50/月**

### Firebase Cloud Functions

**使用量の確認:**
Firebase Console → Usage and billing

**推奨設定:**
- Budget alert: $20/月
- Email notification: ON

**無料枠:**
- 125,000回/月の呼び出し
- 40,000 GB秒/月のコンピューティング時間

**見積もり:**
- 月間1,000回の様式2生成 + 5,000回のAI Draft = 6,000回/月
- **無料枠内で運用可能**

### Firestore

**使用量の確認:**
Firebase Console → Firestore Database → Usage

**無料枠:**
- 読み取り: 50,000回/日
- 書き込み: 20,000回/日
- 削除: 20,000回/日
- ストレージ: 1GB

---

## インシデント対応手順

### 1. APIキーの不正利用を検知した場合

**即座の対応:**
```bash
# 1. Cloud FunctionsのAPIキーを無効化
firebase functions:config:unset openai.key

# 2. OpenAI Dashboardで新しいAPIキーを生成
# https://platform.openai.com/api-keys

# 3. 新しいAPIキーを設定
firebase functions:config:set openai.key="sk-proj-NEW_KEY"

# 4. Cloud Functionsを再デプロイ
firebase deploy --only functions
```

**調査:**
- Cloud Functions Logsで不審なアクセスを確認
- OpenAI Usage Dashboardで異常な使用量をチェック
- Firestore `point_transactions`で不正なポイント使用を確認

### 2. 大量のAPI呼び出しを検知した場合

**即座の対応:**
```bash
# 1. Cloud Functionsを一時停止
firebase functions:delete generateSubsidyApplication
firebase functions:delete generateAnswerDraft

# 2. 原因調査
firebase functions:log --only generateSubsidyApplication

# 3. 必要に応じてレート制限を強化
# functions/index.jsでレート制限を変更（例: 10回/日 → 5回/日）
# 再デプロイ
```

### 3. 不正アクセスを検知した場合

**Firestore Security Rulesの強化:**
```javascript
match /applications/{applicationId} {
  // IPアドレス制限（Firebase Authのカスタムクレーム使用）
  allow read, write: if isAuthenticated()
    && resource.data.userId == request.auth.uid
    && !request.auth.token.banned;
}
```

**ユーザーのBAN:**
```bash
# Firebase Admin SDKでユーザーを無効化
firebase auth:update-user <uid> --disabled
```

---

## セキュリティチェックリスト（デプロイ前）

### 必須項目

- [ ] `.env`ファイルが`.gitignore`に含まれている
- [ ] `REACT_APP_OPENAI_API_KEY`がフロントエンドから削除されている
- [ ] Cloud FunctionsにOpenAI APIキーが設定されている
- [ ] Firestore Security Rulesがデプロイされている
- [ ] Firebase Authenticationが有効化されている
- [ ] レート制限が実装されている
- [ ] ポイントシステムが動作している

### 推奨項目

- [ ] Google Maps APIキーにHTTPリファラー制限が設定されている
- [ ] OpenAI API使用量アラートが設定されている
- [ ] Firebase料金アラートが設定されている
- [ ] Cloud Functions Logsの監視設定が完了している
- [ ] 定期的なセキュリティ監査スケジュールが決定している

---

## 定期セキュリティ監査

### 月次チェック項目

1. **API使用量の確認**
   - OpenAI Dashboard: 異常な使用量がないか
   - Firebase Console: 想定内の呼び出し回数か

2. **セキュリティログの確認**
   - Cloud Functions Logs: エラーや不審なアクセスがないか
   - Firebase Authentication: 不正なログイン試行がないか

3. **依存関係の更新**
   ```bash
   cd functions
   npm audit
   npm update
   ```

4. **コストの確認**
   - 予算内で運用できているか
   - アラート設定が適切か

---

## 参考リンク

- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions Security](https://firebase.google.com/docs/functions/auth)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)
- [Google Cloud API Security](https://cloud.google.com/apis/docs/api-security-best-practices)

---

**最終更新日**: 2025-10-23
**セキュリティレビュー責任者**: Development Team
