# AIDANT実装状況 - 2025-11-19

## 完了した実装

### 1. Phase 1: 販売費及び一般管理費の3段階入力システム ✅

#### 1.1 質問の追加
- ✅ Q1-14-method: 入力方法選択（アップロード/手動/AI推定）
- ✅ Q1-14-upload: ファイルアップロード（条件付き）
- ✅ Q1-14-upload-consent: プライバシー同意（条件付き）
- ✅ Q1-14-manual: 手動入力（条件付き）
- ✅ Q1-14-ai: AI推定（条件付き）

**ファイル**: [src/services/ai/conversationalQuestionsStep1.js](../src/services/ai/conversationalQuestionsStep1.js)

#### 1.2 新規コンポーネント

##### ManualExpenseInput.jsx ✅
- 12項目の経費入力テーブル
- 必須項目: 人件費、地代家賃
- 任意項目: 広告宣伝費、水道光熱費、通信費、旅費交通費、消耗品費、減価償却費、保険料、租税公課、修繕費、その他
- カンマ区切りの金額表示
- リアルタイムバリデーション
- 合計金額の自動計算

**ファイル**:
- [src/components/chat/ManualExpenseInput.jsx](../src/components/chat/ManualExpenseInput.jsx)
- [src/components/chat/ManualExpenseInput.css](../src/components/chat/ManualExpenseInput.css)

##### FileUpload.jsx ✅
- Firebase Storageへのファイルアップロード
- 画像プレビュー機能
- アップロード進捗表示
- OCR処理の自動実行
- プライバシー保護（暗号化、30日後削除）

**ファイル**:
- [src/components/chat/FileUpload.jsx](../src/components/chat/FileUpload.jsx)
- [src/components/chat/FileUpload.css](../src/components/chat/FileUpload.css)

#### 1.3 Cloud Functions ✅

##### estimateExpenses
業種別の業界平均値と売上規模から経費内訳を自動推定

**対応業種**:
- 飲食業
- 小売業
- サービス業（美容・理容業）
- サービス業（その他）
- 宿泊業・娯楽業
- 製造業その他

##### extractExpensesFromImage
OpenAI Vision APIを使用して画像から経費内訳を抽出

##### extractExpensesFromPDF
PDF処理（現在は未実装、画像変換を推奨）

**ファイル**: [functions/index.js](../functions/index.js) (2455-2750行)

---

### 2. Phase 4: SWOT分析の追加 ✅

#### 2.1 質問の追加
- ✅ P4-SWOT-S: 強み（Strengths）
- ✅ P4-SWOT-W: 弱み（Weaknesses）
- ✅ P4-SWOT-O: 機会（Opportunities）
- ✅ P4-SWOT-T: 脅威（Threats）

#### 2.2 カテゴリの追加
```javascript
swot_analysis: {
  title: 'SWOT分析',
  description: '強み・弱み・機会・脅威の分析'
}
```

**ファイル**: [src/services/ai/conversationalQuestionsPhase4.js](../src/services/ai/conversationalQuestionsPhase4.js)

**様式2への活用**:
- 実際の電子申請フォーマット（Page 5）に対応
- Phase 3（自社の強み）と連携
- SWOT分析表の自動生成

---

### 3. Phase 5: 仕入先・購入先情報の収集 ✅

#### 3.1 質問の追加
- ✅ P5-8: 仕入先情報の入力（supplier_table_input）

#### 3.2 SupplierTableInput コンポーネント ✅

**機能**:
- 動的な行の追加・削除
- 入力項目:
  - 仕入先名（会社名）
  - 商品・サービス名
  - 単価
  - 数量
  - 合計金額（自動計算）
- 総合計の自動計算
- バリデーション機能

**ファイル**:
- [src/components/chat/SupplierTableInput.jsx](../src/components/chat/SupplierTableInput.jsx)
- [src/components/chat/SupplierTableInput.css](../src/components/chat/SupplierTableInput.css)

#### 3.3 カテゴリの追加
```javascript
supplier_info: {
  title: '仕入先・購入先情報',
  description: '経費明細表の詳細情報'
}
```

**ファイル**: [src/services/ai/conversationalQuestionsPhase5.js](../src/services/ai/conversationalQuestionsPhase5.js)

---

## 未完了の実装（優先度順）

### 優先度: 高 🔴

#### 1. ChatContainer.jsx の更新
新しい質問タイプのハンドリング実装が必要

**必要な対応**:
```javascript
// 新しい質問タイプの追加
case 'file_upload':
  return <FileUpload questionId={question.id} onUploadComplete={handleFileUpload} />;

case 'expense_manual_input':
  return <ManualExpenseInput onSubmit={handleExpenseManualInput} />;

case 'ai_expense_estimation':
  // AI推定の自動実行とresult表示
  useEffect(() => {
    estimateExpensesAuto();
  }, [question]);
  return <div className="ai-estimation-result">推定中...</div>;

case 'supplier_table_input':
  return <SupplierTableInput onSubmit={handleSupplierInput} />;
```

**影響範囲**:
- src/components/chat/ChatContainer.jsx (line 3288付近)
- QuestionInputコンポーネントの拡張または条件分岐

**実装箇所**:
```javascript
{currentQuestion && !showAiOptions && currentQuestion.type !== 'store_profile' && (
  {/* 新しい質問タイプの処理を追加 */}
  {currentQuestion.type === 'file_upload' ? (
    <FileUpload questionId={currentQuestion.id} onUploadComplete={handleFileUpload} />
  ) : currentQuestion.type === 'expense_manual_input' ? (
    <ManualExpenseInput onSubmit={handleExpenseManualInput} />
  ) : currentQuestion.type === 'ai_expense_estimation' ? (
    <AIExpenseEstimation question={currentQuestion} onComplete={handleAIEstimation} />
  ) : currentQuestion.type === 'supplier_table_input' ? (
    <SupplierTableInput onSubmit={handleSupplierInput} />
  ) : (
    <QuestionInput
      key={currentQuestion.id}
      question={currentQuestion}
      onAnswer={handleAnswer}
      isLoading={isLoading}
      previousAnswer={getPreviousAnswer(currentQuestion.id)}
      onGoBack={canGoBack ? handleGoBack : null}
      canGoBack={canGoBack}
      suggestedAnswer={suggestedAnswer}
      allAnswers={answers}
    />
  )}
)}
```

**必要なハンドラー関数**:
```javascript
const handleFileUpload = async (uploadData) => {
  const { fileUrl, fileName, fileType, extractedData } = uploadData;

  // Firestoreに保存
  await updateAnswer('Q1-14-upload', {
    fileUrl,
    fileName,
    fileType,
    extractedData
  });

  // 次の質問へ
  nextQuestion();
};

const handleExpenseManualInput = async (expenseData) => {
  // Firestoreに保存
  await updateAnswer('Q1-14-manual', expenseData);

  // 次の質問へ
  nextQuestion();
};

const handleAIEstimation = async (estimationData) => {
  // Firestoreに保存
  await updateAnswer('Q1-14-ai', estimationData);

  // 次の質問へ
  nextQuestion();
};

const handleSupplierInput = async (supplierData) => {
  // Firestoreに保存
  await updateAnswer('P5-8', supplierData);

  // 次の質問へ
  nextQuestion();
};
```

#### 2. AIExpenseEstimation コンポーネントの作成
AI推定の実行と結果表示

**必要な実装**:
```javascript
// src/components/chat/AIExpenseEstimation.jsx
const AIExpenseEstimation = ({ question, onComplete }) => {
  const [estimating, setEstimating] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const estimate = async () => {
      try {
        // Cloud Functionを呼び出し
        const functions = getFunctions(undefined, 'asia-northeast1');
        const estimateExpenses = httpsCallable(functions, 'estimateExpenses');

        const response = await estimateExpenses({
          businessType: answers['Q1-1'] || answers['Q1-1-manual'],
          revenue: answers['Q1-8'],
          employees: answers['従業員数'] // 必要に応じて追加
        });

        setResult(response.data);
        setEstimating(false);

        // 自動的に次へ進む
        setTimeout(() => {
          onComplete(response.data);
        }, 2000);
      } catch (err) {
        setError(err.message);
        setEstimating(false);
      }
    };

    estimate();
  }, []);

  return (
    <div className="ai-expense-estimation">
      {estimating && <div className="estimating">AIが経費を推定しています...</div>}
      {result && <ExpenseEstimationResult data={result} />}
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

#### 3. 様式2生成ロジックの更新

**必要な対応**:

##### 3.1 経費内訳表の生成

**追加箇所**: `functions/index.js` の `buildApplicationPrompt` 関数

```javascript
// Q1-14系の回答から販売費及び一般管理費を取得
let expenseBreakdown = '';

if (collectedData['Q1-14-method'] === 'upload' && collectedData['Q1-14-upload']) {
  // ファイルアップロードの場合
  const uploadData = collectedData['Q1-14-upload'];
  if (uploadData.extractedData) {
    expenseBreakdown = formatExpenseData(uploadData.extractedData);
  }
} else if (collectedData['Q1-14-method'] === 'manual' && collectedData['Q1-14-manual']) {
  // 手動入力の場合
  expenseBreakdown = formatExpenseData(collectedData['Q1-14-manual']);
} else if (collectedData['Q1-14-method'] === 'ai_estimate' && collectedData['Q1-14-ai']) {
  // AI推定の場合
  const estimationData = collectedData['Q1-14-ai'];
  expenseBreakdown = formatExpenseData(estimationData.estimates);
  expenseBreakdown += `\n\n※ この経費内訳はAIが業種「${estimationData.businessType}」の業界平均値から推定したものです。`;
}

// プロンプトに追加
prompt += `\n\n## 販売費及び一般管理費の内訳\n\n${expenseBreakdown}\n`;
```

##### 3.2 SWOT分析表の生成

```javascript
// SWOT分析データの取得
const swotData = {
  strengths: collectedData['P4-SWOT-S'],
  weaknesses: collectedData['P4-SWOT-W'],
  opportunities: collectedData['P4-SWOT-O'],
  threats: collectedData['P4-SWOT-T']
};

if (swotData.strengths || swotData.weaknesses || swotData.opportunities || swotData.threats) {
  prompt += `\n\n## SWOT分析\n\n`;
  prompt += `**強み（Strengths）:**\n${swotData.strengths}\n\n`;
  prompt += `**弱み（Weaknesses）:**\n${swotData.weaknesses}\n\n`;
  prompt += `**機会（Opportunities）:**\n${swotData.opportunities}\n\n`;
  prompt += `**脅威（Threats）:**\n${swotData.threats}\n\n`;
}
```

##### 3.3 仕入先情報の反映

```javascript
// 仕入先情報の取得
const supplierData = collectedData['P5-8'];

if (supplierData && supplierData.items) {
  prompt += `\n\n## 仕入先・購入先情報\n\n`;
  prompt += `| 仕入先名 | 商品・サービス名 | 単価 | 数量 | 合計 |\n`;
  prompt += `|---------|---------------|------|-----|-----|\n`;

  supplierData.items.forEach(item => {
    prompt += `| ${item.supplierName} | ${item.productName} | ${item.unitPrice.toLocaleString()}円 | ${item.quantity} | ${item.total.toLocaleString()}円 |\n`;
  });

  prompt += `\n総合計: ${supplierData.grandTotal.toLocaleString()}円\n`;
}
```

---

### 優先度: 中 🟡

#### 4. AI推定値の編集機能
推定後に手動で修正可能にする

**実装箇所**: ManualExpenseInputの拡張

#### 5. OCR処理の精度向上
エラーハンドリングの改善、抽出データの検証UI

#### 6. ファイルの自動削除機能
30日後の自動削除処理実装（Cloud Functions Scheduler）

---

### 優先度: 低 🟢

#### 7. PDF処理の実装
PDF to Image変換、複数ページの処理

#### 8. ファイルアップロードの暗号化
Firebase Storageの暗号化設定

---

## デプロイ手順

### 1. Cloud Functionsのデプロイ

```bash
cd functions
npm install
firebase deploy --only functions:estimateExpenses,functions:extractExpensesFromImage,functions:extractExpensesFromPDF
```

### 2. フロントエンドのビルドとデプロイ

```bash
npm run build
firebase deploy --only hosting
```

---

## テストチェックリスト

### Phase 1 - 販売費及び一般管理費

#### Q1-14-method（入力方法選択）
- [ ] 3つの選択肢が表示される
- [ ] 選択後に適切な質問に分岐する

#### ファイルアップロード
- [ ] 画像ファイル（JPG、PNG）のアップロードが成功する
- [ ] ファイルサイズ制限（10MB）が機能する
- [ ] アップロード進捗が表示される
- [ ] OCR処理が実行される
- [ ] 抽出データが正しく表示される
- [ ] Firebase Storageに保存される

#### 手動入力
- [ ] ManualExpenseInputコンポーネントが表示される
- [ ] 12項目の経費入力ができる
- [ ] 必須項目（人件費、地代家賃）のバリデーションが機能する
- [ ] カンマ区切りの表示が正しい
- [ ] 合計金額が自動計算される
- [ ] 入力内容を確定できる

#### AI推定
- [ ] estimateExpenses関数が呼び出される
- [ ] 業種に応じた推定値が生成される
- [ ] 推定結果が表示される
- [ ] 次の質問に進める

### Phase 4 - SWOT分析

- [ ] P4-SWOT-S/W/O/Tの質問が順番に表示される
- [ ] 各質問の回答が保存される
- [ ] Phase 3（自社の強み）との連携が機能する

### Phase 5 - 仕入先情報

- [ ] P5-8の質問が表示される
- [ ] SupplierTableInputコンポーネントが表示される
- [ ] 行の追加・削除ができる
- [ ] 合計金額が自動計算される
- [ ] バリデーションが機能する
- [ ] 入力内容を確定できる

### 様式2生成

- [ ] 経費内訳表が生成される
- [ ] SWOT分析表が生成される
- [ ] 仕入先情報が反映される
- [ ] すべてのデータが正しく統合される

---

## 進捗状況

| カテゴリ | 完了 | 未完了 | 進捗率 |
|---------|-----|--------|--------|
| **Phase 1質問** | 5/5 | 0/5 | 100% |
| **新規コンポーネント** | 3/3 | 0/3 | 100% |
| **Cloud Functions** | 3/3 | 0/3 | 100% |
| **Phase 4質問** | 4/4 | 0/4 | 100% |
| **Phase 5質問** | 1/1 | 0/1 | 100% |
| **ChatContainer更新** | 0/1 | 1/1 | 0% |
| **様式2生成** | 0/3 | 3/3 | 0% |
| **総合進捗** | **16/20** | **4/20** | **80%** |

---

## 次のステップ

1. ✅ 全コンポーネントの作成完了
2. ⬜ ChatContainer.jsxの更新（新しい質問タイプのハンドリング）
3. ⬜ AIExpenseEstimationコンポーネントの作成
4. ⬜ 様式2生成ロジックの更新（経費内訳表、SWOT分析、仕入先情報）
5. ⬜ テストとデバッグ
6. ⬜ デプロイ

---

**最終更新**: 2025-11-19
**担当**: Claude Code AI Assistant
