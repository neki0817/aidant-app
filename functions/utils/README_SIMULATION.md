# AI vs AI 会話シミュレーションシステム

## 概要

このシステムは、中小企業診断士AI（質問側）と飲食店経営者AI（回答側）の会話を自動生成し、以下の目的で活用します:

1. **テストデータ生成**: Phase 2/3の質問と回答のペアを大量に生成
2. **質問パターン改善**: 業種別・店舗特性別の質問パターンを学習
3. **様式2品質向上**: 生成された会話データを分析し、様式2の記述品質を向上

## システム構成

### 1. Cloud Function
- **generateMockAnswer** (`functions/index.js`): 飲食店経営者AIとして回答を生成

### 2. 店舗プロフィール
- **mockStoreProfiles.js**: 10店舗の架空プロフィール
  - カフェ、ラーメン店、イタリアン、居酒屋、パン屋、寿司店、焼肉店、カレー店、弁当店、喫茶店

### 3. シミュレーター
- **conversationSimulator.js**: 会話シミュレーションのコアロジック
  - 質問生成 → 回答生成 → Firestore保存の自動化

### 4. CLI実行スクリプト
- **runSimulation.js**: コマンドラインからシミュレーションを実行

### 5. 分析ツール
- **analyzeSimulations.js**: 生成データの統計分析と品質評価

## 使い方

### 準備

1. **Firebase Admin初期化**
   ```bash
   # serviceAccountKey.jsonを functions/ に配置
   cp /path/to/serviceAccountKey.json functions/
   ```

2. **依存関係のインストール**
   ```bash
   cd functions
   npm install
   ```

3. **Cloud Functionのデプロイ**
   ```bash
   firebase deploy --only functions:generateMockAnswer
   ```

### シミュレーション実行

#### 1. 店舗一覧を表示
```bash
cd functions/utils
node runSimulation.js --list
```

**出力例:**
```
利用可能な店舗ID:
1. cafe_bluemountain - 珈琲館ブルーマウンテン (カフェ)
2. ramen_yokohama - 横浜家系ラーメン 壱番亭 (ラーメン店)
3. italian_bellavista - Trattoria Bellavista (イタリアンレストラン)
...
```

#### 2. 単一店舗でシミュレーション実行
```bash
# カフェでPhase 2を実行（最大5問）
node runSimulation.js --store cafe_bluemountain --phase phase2

# ラーメン店でPhase 3を実行（最大3問）
node runSimulation.js --store ramen_yokohama --phase phase3 --max 3
```

#### 3. 全店舗で一括実行
```bash
# 全10店舗 × Phase 2/3 = 20シミュレーションを一括実行
node runSimulation.js --batch

# 最大3問で一括実行
node runSimulation.js --batch --max 3
```

### データ分析

```bash
# 生成されたシミュレーションデータを分析
node analyzeSimulations.js
```

**出力内容:**
- 業種別統計（質問数、回答の長さ、頻出キーワード）
- 質問タイプ別統計（text/multi_select/single_select）
- フェーズ別統計（完了率、平均質問数）
- 様式2生成への活用可能性（品質評価、推奨事項）

## データ構造

### Firestore保存先

```
conversation_simulations/
  {simulationId}/
    - storeProfile: Object (店舗プロフィール)
    - phase: string ('phase2' or 'phase3')
    - status: string ('running', 'completed', 'error')
    - startedAt: Timestamp
    - completedAt: Timestamp
    - totalQuestions: number

    messages/
      {messageId}/
        - questionId: string
        - question: string
        - questionType: string
        - options: Array<string>
        - answer: string
        - timestamp: string
```

### 店舗プロフィールの構造

```javascript
{
  id: 'cafe_bluemountain',
  name: '珈琲館ブルーマウンテン',
  businessType: 'カフェ',
  location: '東京都渋谷区（駅徒歩5分）',
  feature: '自家焙煎コーヒーと手作りケーキ、落ち着いた雰囲気',
  customerBase: '30-40代女性、近隣オフィスワーカー、コーヒー愛好家',
  rating: 4.5,
  reviewCount: 150,
  yearsInBusiness: 3,
  monthlySales: 120,
  annualSales: 1440,
  annualProfit: 240,
  employees: 2,
  subsidy_goal: 'オンライン販売サイト構築と焙煎機の増強',
  challenges: [...],
  strengths: [...]
}
```

## 活用方法

### 1. テストデータの生成

```bash
# 全店舗でシミュレーション実行
node runSimulation.js --batch
```

生成されたデータは以下の用途で活用:
- Phase 2/3の質問生成ロジックの検証
- 回答パターンのテストケース作成
- 様式2生成の品質確認

### 2. 質問パターンの改善

```bash
# 分析ツールで業種別の回答傾向を確認
node analyzeSimulations.js
```

分析結果をもとに:
- 業種別の質問カスタマイズを改善
- 回答例（placeholder）の充実
- ヘルプテキストの最適化

### 3. 知識ベースへの蓄積

生成された高品質な会話データは、知識ベース（`参考資料/知識ベース/`）に追加可能:

```markdown
# 会話事例: カフェ（自家焙煎）

## 質問: ターゲット顧客について教えてください

**回答例:**
「当店のお客様は30-40代女性、近隣オフィスワーカー、コーヒー愛好家が中心です。
自家焙煎コーヒーと手作りケーキ、落ち着いた雰囲気という点が評価されていると感じています。」

## 質問: 強みは何ですか？

**回答例:**
「当店の強みはGoogle Maps評価4.5点と高評価です。
特に自家焙煎による豆の品質へのこだわりという点で他店と差別化できていると考えています。」
```

## 今後の拡張

### 1. Cloud Functionsとの統合

現在は簡易的な質問/回答生成ですが、実際のCloud Functionsを呼び出すように改修:

```javascript
// conversationSimulator.js の修正例
const { httpsCallable } = require('firebase/functions');
const functions = getFunctions(undefined, 'asia-northeast1');

async function generateQuestion(phase, phase1Data, previousConversation) {
  const generateQuestions = httpsCallable(functions, `generatePhase${phase}ConversationalQuestions`);
  const result = await generateQuestions({ collectedData: phase1Data });
  return result.data.questions[0]; // 最初の未回答質問を返す
}

async function generateAnswer(question, storeProfile, questionType, options) {
  const generateMockAnswer = httpsCallable(functions, 'generateMockAnswer');
  const result = await generateMockAnswer({ question, storeProfile, questionType, options });
  return result.data.answer;
}
```

### 2. 店舗プロフィールの追加

業種の多様化:
- 美容室、理容室
- 小売業（雑貨店、アパレル）
- BtoB事業（印刷業、製造業）
- オンライン専業（EC、Webサービス）

### 3. 評価指標の追加

生成された回答の品質を自動評価:
- 具体性スコア（数値が含まれているか）
- 詳細度スコア（文字数、情報量）
- 一貫性スコア（店舗プロフィールとの整合性）
- 様式2適合度スコア（様式2に使える表現か）

### 4. 自動フィードバックループ

1. シミュレーション実行
2. データ分析
3. 質問生成プロンプト改善
4. 再シミュレーション
5. 品質向上の確認

## トラブルシューティング

### シミュレーションが失敗する

**原因:**
- Firebase Admin初期化エラー
- serviceAccountKey.jsonが見つからない
- Cloud Functionがデプロイされていない

**解決策:**
```bash
# serviceAccountKey.jsonの配置確認
ls functions/serviceAccountKey.json

# Cloud Functionのデプロイ
firebase deploy --only functions:generateMockAnswer
```

### 分析ツールでデータが取得できない

**原因:**
- シミュレーションが実行されていない
- Firestoreのコレクション名が間違っている

**解決策:**
```bash
# シミュレーションを実行
node runSimulation.js --store cafe_bluemountain --phase phase2

# Firestoreで確認
# conversation_simulations コレクションが存在するか確認
```

### OpenAI APIエラー

**原因:**
- API Key未設定
- レート制限

**解決策:**
```bash
# Firebase Functionsの環境変数を確認
firebase functions:config:get

# レート制限を考慮して待機時間を追加
# conversationSimulator.js の await new Promise(resolve => setTimeout(resolve, 1000));
```

## まとめ

このシステムにより、手動でのテストデータ作成が不要になり、大量の会話データを自動生成できます。
生成されたデータを分析することで、質問パターンの改善や様式2の品質向上に繋がります。

次のステップとして、実際のCloud Functionsとの統合と、知識ベースへの自動フィードバック機能の実装を推奨します。
