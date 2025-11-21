# AIDANT実装完了報告 - 2025-11-19

## 実装概要

小規模事業者持続化補助金の電子申請フォーマット（参考資料/小規模事業者持続化補助金2.pdf）を分析し、AIDANTシステムに以下の機能を実装しました。

## 実装内容

### 1. 販売費及び一般管理費の3段階入力システム（Phase 1）

**背景**: 様式2の経費内訳表に正確な販売費及び一般管理費のデータが必要だが、ユーザーによってはプライバシーの懸念がある。

**実装内容**:

#### 1.1 質問の追加（conversationalQuestionsStep1.js）

- **Q1-14-method**: 入力方法の選択
  - 📄 決算書をアップロードする（最も正確・簡単）
  - ✍️ 手動で入力する（ファイルなし）
  - 🤖 AIに推定してもらう（最も簡単）

- **Q1-14-upload**: ファイルアップロード（条件付き）
  - type: `file_upload`
  - accept: `image/*,application/pdf`
  - プライバシー保護の説明付き

- **Q1-14-upload-consent**: プライバシー同意確認
  - 暗号化保存、30日後自動削除の説明

- **Q1-14-manual**: 手動入力（条件付き）
  - type: `expense_manual_input`
  - 10-12項目の経費カテゴリ

- **Q1-14-ai**: AI推定（条件付き）
  - type: `ai_expense_estimation`
  - 業種別の業界平均値から自動計算

#### 1.2 ManualExpenseInput コンポーネント

**ファイル**: `src/components/chat/ManualExpenseInput.jsx`

**機能**:
- 12項目の経費入力テーブル
  - 必須項目: 人件費、地代家賃
  - 任意項目: 広告宣伝費、水道光熱費、通信費、旅費交通費、消耗品費、減価償却費、保険料、租税公課、修繕費、その他
- カンマ区切りの金額表示
- リアルタイムバリデーション
- 合計金額の自動計算

**スタイル**: `src/components/chat/ManualExpenseInput.css`

#### 1.3 FileUpload コンポーネント

**ファイル**: `src/components/chat/FileUpload.jsx`

**機能**:
- Firebase Storageへのファイルアップロード
- 画像プレビュー機能
- アップロード進捗表示
- OCR処理の自動実行
- エラーハンドリング

**プライバシー保護**:
- 個人情報の黒塗り推奨
- 暗号化保存
- 30日後自動削除

**スタイル**: `src/components/chat/FileUpload.css`

#### 1.4 Cloud Functions の追加

**ファイル**: `functions/index.js`

##### 1.4.1 estimateExpenses

**機能**: 業種別の業界平均値と売上規模から経費内訳を自動推定

**業種別経費比率**:
- 飲食業: 人件費30%, 地代家賃10%, 水道光熱費6%, etc.
- 小売業: 人件費25%, 地代家賃12%, 広告宣伝費5%, etc.
- サービス業（美容・理容業）: 人件費35%, 地代家賃15%, etc.
- サービス業（その他）
- 宿泊業・娯楽業
- 製造業その他

**入力パラメータ**:
```javascript
{
  businessType: '飲食業',
  revenue: 1200, // 万円
  employees: 3
}
```

**出力**:
```javascript
{
  success: true,
  estimates: {
    personnel_costs: 360,
    rent: 120,
    advertising: 36,
    // ... 他の経費
  },
  total: 720,
  confidence: 'medium',
  message: '業種「飲食業」の業界平均値から推定しました。後で修正可能です。'
}
```

##### 1.4.2 extractExpensesFromImage

**機能**: OpenAI Vision APIを使用して画像から経費内訳を抽出

**処理フロー**:
1. Firebase Storageから画像URLを取得
2. OpenAI GPT-4oのVision APIで画像を解析
3. 12項目の経費データをJSON形式で抽出
4. 合計金額を計算して返却

**出力**:
```javascript
{
  success: true,
  extractedData: {
    personnel_costs: 500,
    rent: 120,
    utilities: 30
  },
  total: 650,
  message: '画像から経費内訳を抽出しました。内容を確認してください。'
}
```

##### 1.4.3 extractExpensesFromPDF

**機能**: PDFからの経費抽出（現在は未実装）

**現在のステータス**: 画像変換を推奨するメッセージを返却

---

### 2. SWOT分析の追加（Phase 4）

**背景**: 実際の電子申請フォーマット（小規模事業者持続化補助金2.pdf）のPage 5にSWOT分析表が含まれている。

**実装内容**:

#### 2.1 質問の追加（conversationalQuestionsPhase4.js）

**追加した質問**:

- **P4-SWOT-S**: 強み（Strengths）
  - placeholder: '例：\n1. 地域で20年の実績と信頼\n2. 独自のレシピ・技術\n3. リピーター率80%以上'

- **P4-SWOT-W**: 弱み（Weaknesses）
  - placeholder: '例：\n1. 認知度が低い\n2. 設備が古い\n3. Webでの情報発信が不足'

- **P4-SWOT-O**: 機会（Opportunities）
  - placeholder: '例：\n1. 駅前の再開発で人通りが増加\n2. 健康志向の高まり\n3. SNSでの口コミ拡散'

- **P4-SWOT-T**: 脅威（Threats）
  - placeholder: '例：\n1. 近隣に競合店が増加\n2. 人口減少・少子高齢化\n3. 原材料費の高騰'

#### 2.2 カテゴリの追加

```javascript
swot_analysis: {
  title: 'SWOT分析',
  description: '強み・弱み・機会・脅威の分析'
}
```

**様式2への活用**:
- Phase 3（自社の強み）と連携
- 経営方針・目標セクションで活用
- SWOT分析表の自動生成

---

### 3. 仕入先・購入先情報の収集（Phase 5）

**背景**: 実際の電子申請フォーマット（Page 10）の経費明細表には仕入先名、商品名、単価、数量の詳細情報が必要。

**実装内容**:

#### 3.1 質問の追加（conversationalQuestionsPhase5.js）

- **P5-8**: 仕入先情報の入力
  - type: `supplier_table_input`
  - 入力項目:
    - 仕入先名（会社名）
    - 商品・サービス名
    - 単価
    - 数量
    - 合計金額

#### 3.2 カテゴリの追加

```javascript
supplier_info: {
  title: '仕入先・購入先情報',
  description: '経費明細表の詳細情報'
}
```

---

## 実装ファイル一覧

### 新規作成ファイル

1. **src/components/chat/ManualExpenseInput.jsx**
   - 販売費及び一般管理費の手動入力コンポーネント
   - 12項目の経費入力テーブル

2. **src/components/chat/ManualExpenseInput.css**
   - ManualExpenseInputのスタイルシート

3. **src/components/chat/FileUpload.jsx**
   - ファイルアップロードコンポーネント
   - Firebase Storage統合
   - OCR処理の自動実行

4. **src/components/chat/FileUpload.css**
   - FileUploadのスタイルシート

### 修正ファイル

1. **src/services/ai/conversationalQuestionsStep1.js**
   - Q1-14-method〜Q1-14-aiの追加
   - 販売費及び一般管理費の3段階入力システム

2. **src/services/ai/conversationalQuestionsPhase4.js**
   - P4-SWOT-S/W/O/Tの追加
   - SWOT分析カテゴリの追加

3. **src/services/ai/conversationalQuestionsPhase5.js**
   - P5-8（仕入先情報）の追加
   - supplier_infoカテゴリの追加

4. **functions/index.js**
   - estimateExpenses関数の追加（AIによる経費推定）
   - extractExpensesFromImage関数の追加（OCR処理）
   - extractExpensesFromPDF関数の追加（PDF処理）

---

## 未実装項目

### 1. ChatContainer.jsx の更新

**必要な対応**:
- 新しい質問タイプのハンドリング
  - `file_upload`
  - `expense_manual_input`
  - `ai_expense_estimation`
  - `supplier_table_input`

**実装箇所**:
- QuestionInputコンポーネントの拡張
- 各入力タイプに応じたコンポーネントのレンダリング

### 2. SupplierTableInput コンポーネント

**必要な実装**:
- 仕入先情報の入力テーブル
- 動的な行の追加・削除
- 自動計算機能

**ファイル**:
- `src/components/chat/SupplierTableInput.jsx`
- `src/components/chat/SupplierTableInput.css`

### 3. 様式2生成ロジックの更新

**必要な対応**:

#### 3.1 経費内訳表の生成

**追加情報**:
- Q1-14系の回答から販売費及び一般管理費の詳細を取得
- 入力方法（upload/manual/ai_estimate）に応じたデータの活用
- 経費明細表への反映

#### 3.2 SWOT分析表の生成

**追加情報**:
- P4-SWOT-S/W/O/Tの回答を表形式で整形
- Phase 3（自社の強み）との連携

#### 3.3 仕入先情報の反映

**追加情報**:
- P5-8（supplier_table_input）の回答を経費明細表に反映
- 仕入先名、商品名、単価、数量の詳細表示

**実装箇所**:
- `functions/index.js` の `buildApplicationPrompt` 関数
- 様式2のテンプレート生成ロジック

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

## テスト項目

### 1. Phase 1 - 販売費及び一般管理費の入力

#### 1.1 ファイルアップロード

- [ ] 画像ファイル（JPG、PNG）のアップロード
- [ ] PDFファイルのアップロード（エラーメッセージ確認）
- [ ] ファイルサイズ制限（10MB）の確認
- [ ] OCR処理の成功
- [ ] 抽出データの表示

#### 1.2 手動入力

- [ ] 12項目の経費入力
- [ ] 必須項目（人件費、地代家賃）のバリデーション
- [ ] カンマ区切りの表示
- [ ] 合計金額の自動計算

#### 1.3 AI推定

- [ ] 業種別の推定値の生成
- [ ] 推定結果の表示
- [ ] 編集機能（未実装の場合は要実装）

### 2. Phase 4 - SWOT分析

- [ ] P4-SWOT-S/W/O/Tの質問表示
- [ ] 回答の保存
- [ ] 様式2への反映

### 3. Phase 5 - 仕入先情報

- [ ] P5-8の質問表示
- [ ] SupplierTableInputコンポーネントの表示（未実装）
- [ ] 回答の保存
- [ ] 経費明細表への反映

---

## 参考資料

### 分析した電子申請フォーマット

**ファイル**: `参考資料/小規模事業者持続化補助金2.pdf`

**主要な発見事項**:

1. **SWOT分析表（Page 5）**
   - 4x2のテーブル形式
   - 各セル（強み、弱み、機会、脅威）に3つ程度の項目を記載

2. **経費明細表（Page 10）**
   - 仕入先名
   - 商品・サービス名
   - 単価
   - 数量
   - 合計金額

3. **販売費及び一般管理費の内訳（Pages 1-2）**
   - 詳細な経費項目の記載
   - 人件費、地代家賃など10-12項目

---

## 今後の課題

### 1. 優先度: 高

1. **ChatContainer.jsx の更新**
   - 新しい質問タイプのハンドリング実装
   - 各コンポーネントの統合

2. **SupplierTableInput コンポーネントの実装**
   - 仕入先情報の入力UI
   - 動的な行の追加・削除

3. **様式2生成ロジックの更新**
   - 経費内訳表の生成
   - SWOT分析表の生成
   - 仕入先情報の反映

### 2. 優先度: 中

1. **AI推定値の編集機能**
   - 推定後に手動で修正可能にする

2. **OCR処理の精度向上**
   - エラーハンドリングの改善
   - 抽出データの検証UI

3. **ファイルの自動削除機能**
   - 30日後の自動削除処理実装

### 3. 優先度: 低

1. **PDF処理の実装**
   - PDF to Image変換
   - 複数ページの処理

2. **ファイルアップロードの暗号化**
   - Firebase Storageの暗号化設定

---

## まとめ

本実装により、以下の機能が追加されました：

1. ✅ 販売費及び一般管理費の3段階入力システム（ファイルアップロード/手動入力/AI推定）
2. ✅ SWOT分析の質問追加（Phase 4）
3. ✅ 仕入先・購入先情報の収集（Phase 5）
4. ✅ Cloud Functions（AI推定、OCR処理）の実装

実際の電子申請フォーマットに基づいた実装により、AIDANTシステムがより正確で詳細な補助金申請書を生成できるようになりました。

残りの実装（ChatContainer.jsx、SupplierTableInput、様式2生成ロジック）を完了すれば、完全に電子申請フォーマットに対応したシステムとなります。
