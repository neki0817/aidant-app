import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

/**
 * Gemini 2.0 Flashモデルを取得
 */
const getModel = () => {
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash', // 2025年最新安定版
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });
};

/**
 * 補助金申請書を生成
 * @param {Object} answers - 全質問の回答
 * @returns {Promise<string>} 生成された申請書
 */
export const generateSubsidyApplication = async (answers) => {
  try {
    const model = getModel();

    // プロンプトの構築
    const prompt = buildApplicationPrompt(answers);

    console.log('Generating application with Gemini 2.0 Flash...');

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('Application generated successfully');

    return text;
  } catch (error) {
    console.error('Error generating application:', error);
    throw new Error('申請書の生成に失敗しました。もう一度お試しください。');
  }
};

/**
 * 申請書生成用のプロンプトを構築
 * @param {Object} answers - 全質問の回答
 * @returns {string} プロンプト
 */
const buildApplicationPrompt = (answers) => {
  // ===== Phase 1: 基本情報 =====
  const placeInfo = answers['Q1-0'] || {};
  const businessType = answers['Q1-1'] || '';
  const representative = answers['Q1-2'] || '';
  const mainServices = answers['Q1-3'] || '';
  const additionalServices = answers['Q1-3-multi'] || '';
  const employees = answers['Q1-4'] || '';
  const openingDate = answers['Q1-5'] || '';
  const businessForm = answers['Q1-6'] || '';
  const operatingDays = answers['Q1-7'] || '';
  const operatingDaysPerWeek = answers['Q1-8'] || '';
  const subsidyPurpose = answers['Q1-9'] || '';
  const isOperating = answers['Q1-10'] || '';
  const pastSubsidyHistory = answers['Q1-11'] || '';
  const fiscalStatus = answers['Q1-12'] || '';
  const fiscalMonth = answers['Q1-13'] || '';

  // 財務データ（新規追加 Q1-14〜Q1-21）
  const latestSales = answers['Q1-14'] || '';
  const latestProfit = answers['Q1-15'] || '';
  const previousSales = answers['Q1-16'] || '';
  const previousProfit = answers['Q1-17'] || '';
  const threeYearsAgoSales = answers['Q1-18'] || '';
  const threeYearsAgoProfit = answers['Q1-19'] || '';
  const grossProfitRate = answers['Q1-20'] || '';
  const customerUnitPrice = answers['Q1-21'] || '';

  // ===== Phase 2: 顧客ニーズと市場の動向 =====
  const targetCustomer = answers['P2-1'] || '';
  const whyChosen = answers['P2-2'] || '';
  const customerNeeds = answers['P2-3'] || '';
  const needsChange = answers['P2-4'] || '';
  const marketTrends = answers['P2-5'] || '';
  const competitorComparison = answers['P2-6'] || '';

  // ===== Phase 3: 自社の強み =====
  const uniqueness = answers['P3-1'] || '';
  const customerValue = answers['P3-2'] || '';
  const expertise = answers['P3-3'] || '';
  const equipment = answers['P3-4'] || '';
  const achievements = answers['P3-5'] || '';
  const weaknesses = answers['P3-6'] || '';
  const location = answers['P3-7'] || '';

  // ===== Phase 4: 経営方針・目標 =====
  const futureGoals = answers['P4-1'] || '';
  const goalPlan = answers['P4-2'] || '';
  const salesTarget = answers['P4-3'] || '';
  const keyInitiatives = answers['P4-4'] || '';
  const targetTimeline = answers['P4-5'] || '';
  const longTermVision = answers['P4-6'] || '';
  const managementChallenges = answers['P4-7'] || '';
  const strengthToLeverage = answers['P4-8'] || '';

  // ===== Phase 5: 補助事業の内容 =====
  const subsidyUsage = answers['P5-1'] || '';
  const plannedEquipment = answers['P5-2'] || '';
  const implementationSchedule = answers['P5-3'] || '';
  const expectedEffect = answers['P5-4'] || '';
  const specificMeasures = answers['P5-5'] || '';
  const targetCustomers = answers['P5-6'] || '';
  const expenseBreakdown = answers['P5-7'] || '';
  const webRelatedExpenses = answers['P5-8'] || '';
  const advertisingPlan = answers['P5-9'] || '';
  const salesIncreaseRationale = answers['P5-10'] || '';
  const regionalContribution = answers['P5-11'] || '';
  const innovationPoints = answers['P5-12'] || '';

  const prompt = `
あなたは小規模事業者持続化補助金の申請書作成の専門家です。
以下の情報を元に、審査に通りやすい高品質な「様式2（経営計画書兼補助事業計画書）」を作成してください。

# 【Phase 1】 基本情報

## 事業者情報
- 店舗名：${placeInfo.name || ''}
- 住所：${placeInfo.address || ''}
- 業種：${businessType}
- 代表者：${representative}
- 事業形態：${businessForm}
- 開業年月：${openingDate}
- 決算月：${fiscalMonth}

## 提供商品・サービス
- 主要サービス：${mainServices}
- 追加事業：${additionalServices}

## 経営状況
- 常時雇用従業員数：${employees}
- 営業日：${operatingDays}（${operatingDaysPerWeek}）
- 決算状況：${fiscalStatus}

## 財務データ（過去3期分）
- 直近期の年間売上：${latestSales}万円
- 直近期の経常利益：${latestProfit}万円
- 前々期の年間売上：${previousSales}万円
- 前々期の経常利益：${previousProfit}万円
- 3期前の年間売上：${threeYearsAgoSales}万円
- 3期前の経常利益：${threeYearsAgoProfit}万円
- 売上総利益率（粗利率）：${grossProfitRate}%
- 客単価：${customerUnitPrice}円

## Google Maps情報
- 評価：${placeInfo.rating || 'N/A'}（${placeInfo.userRatingsTotal || 0}件のレビュー）
- 営業時間：${placeInfo.openingHours?.weekdayText?.join('、') || '情報なし'}

# 【Phase 2】 顧客ニーズと市場の動向

## ターゲット顧客
${targetCustomer}

## 選ばれる理由
${whyChosen}

## 顧客ニーズ
${customerNeeds}

## ニーズの変化
${needsChange}

## 市場トレンド
${marketTrends}

## 競合比較
${competitorComparison}

# 【Phase 3】 自社の強み

## 独自性・差別化
${uniqueness}

## 顧客への価値
${customerValue}

## 専門性・資格
${expertise}

## 設備・技術
${equipment}

## 実績・評価
${achievements}

## 課題・弱み
${weaknesses}

## 立地・商圏
${location}

# 【Phase 4】 経営方針・目標

## 今後の目標
${futureGoals}

## 目標達成の計画
${goalPlan}

## 売上目標
${salesTarget}

## 重点施策
${keyInitiatives}

## 実施時期
${targetTimeline}

## 長期ビジョン
${longTermVision}

## 経営課題
${managementChallenges}

## 活用する強み
${strengthToLeverage}

# 【Phase 5】 補助事業の内容

## 補助金の使い道
${subsidyUsage}

## 購入予定の設備・システム
${plannedEquipment}

## 実施スケジュール
${implementationSchedule}

## 期待される効果
${expectedEffect}

## 具体的な施策
${specificMeasures}

## ターゲット顧客
${targetCustomers}

## 経費内訳
${expenseBreakdown}

## Web関連経費
${webRelatedExpenses}

## 広告計画
${advertisingPlan}

## 売上増加の根拠
${salesIncreaseRationale}

## 地域貢献
${regionalContribution}

## 創意工夫のポイント
${innovationPoints}

---

# 【出力フォーマット】

以下の構成で、CLAUDE.mdの様式2要件に準拠した申請書を作成してください：

## 【経営計画】

### 1. 企業概要（800-1200文字）

**記載内容:**
- 事業の概要（創業年、主要サービス、顧客層）
- 過去3期分の売上高・経常利益の推移（表形式）
- 立地場所の特性
- 主な商品・サービス（単価、営業利益率）
- 業務状況（従業員数、業務内容、課題）

**文体:** である調（常体）

### 2. 顧客ニーズと市場の動向（800-1200文字）

**記載内容:**
- 市場全体の動向（業界トレンド）
- ターゲット顧客層の明確化
- 顧客ニーズの分析
- 市場環境の変化
- 地域別の開拓余地

**文体:** である調（常体）

### 3. 自社や自社の提供する商品・サービスの強み（800-1200文字）

**記載内容:**
- 競合他社と比較して優れている点（箇条書き●マーク）
- 顧客に評価されている点
- Google Maps口コミ等の具体的評価
- 品質、技術、サービス、ノウハウ等の強み
- 課題・弱み（対比として）

**文体:** である調（常体）

### 4. 経営方針・目標と今後のプラン（800-1200文字）

**記載内容:**
- 現状の課題認識
- 今後の経営方針・目標（具体的な数値目標）
- 目標達成のための具体的プラン（時期と行動）
- 長期的プラン

**文体:** である調（常体）

## 【補助事業計画】

### 1. 補助事業で行う事業名（30文字以内）
簡潔で分かりやすい事業名を提案してください。

### 2. 販路開拓等（生産性向上）の取組内容（1200-1800文字）

**記載内容:**
- 前ページ「4. 経営方針・目標と今後のプラン」を踏まえた取組内容
- 実施する施策ごとの詳細（目的、対象顧客、実施時期、実施方法）
- これまでの自社・他社の取組と異なる点
- 創意工夫した点、特徴

**文体:** である調（常体）

### 3. 補助事業の効果（800-1200文字）

**記載内容:**
- 売上・取引にどのような効果があるか
- 効果が出る理由
- 具体的な数値見込み（顧客数増加、客単価向上、リピート率）
- 短期効果と長期効果の区別

**文体:** である調（常体）

---

# 【重要な注意事項】

1. **文体を統一すること**
   - 必ず「である調（常体）」を使用
   - 「〜である」「〜だ」「〜する」等の語尾
   - 「です・ます調」は絶対に使用しない

2. **審査員が評価するポイント**
   - 事業の独自性・革新性
   - 実現可能性の高さ
   - 地域経済への貢献
   - 明確な数値目標

3. **必ず含めるべき要素**
   - 過去3期分の売上・利益の推移（表形式）
   - 具体的な数値データ（客単価、粗利率、顧客数等）
   - Google Maps評価や口コミの引用
   - 課題と解決策のセット
   - 補助事業の効果の具体的な計算根拠

4. **避けるべき表現**
   - 抽象的・曖昧な表現
   - 誇張や根拠のない主張
   - 専門用語の多用

各セクションを見出し付きで、マークダウン形式で出力してください。
`;

  return prompt;
};

/**
 * 自由記述テキストの改善提案
 * @param {string} text - 元のテキスト
 * @param {string} context - 質問の文脈
 * @returns {Promise<string>} 改善されたテキスト
 */
export const improveText = async (text, context = '') => {
  try {
    const model = getModel();

    const prompt = `
以下のテキストを、補助金申請書に適した表現に改善してください。

【元のテキスト】
${text}

【文脈】
${context}

【改善のポイント】
- より具体的で説得力のある表現にする
- 簡潔で分かりやすい文章にする
- 熱意が伝わる表現を加える
- 誤字脱字があれば修正する

改善されたテキストのみを出力してください。説明は不要です。
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error improving text:', error);
    throw new Error('テキストの改善に失敗しました。');
  }
};

/**
 * 市場分析の生成
 * @param {Object} storeInfo - 店舗情報
 * @param {Array} nearbyStores - 周辺店舗情報
 * @returns {Promise<string>} 市場分析レポート
 */
export const generateMarketAnalysis = async (storeInfo, nearbyStores = []) => {
  try {
    const model = getModel();

    const prompt = `
以下の情報を元に、市場分析レポートを作成してください。

【自店舗情報】
- 店舗名：${storeInfo.name || ''}
- 住所：${storeInfo.address || ''}
- 業種：飲食店

【周辺の競合店舗】
${nearbyStores.map((store, index) => `
${index + 1}. ${store.name}
   - 住所：${store.address}
   - 評価：${store.rating || 'N/A'}
   - レビュー数：${store.user_ratings_total || 'N/A'}
`).join('\n')}

以下の内容を含めた市場分析を作成してください：

1. 商圏の特性
2. 競合店舗の分析
3. 差別化のポイント
4. ターゲット顧客層の提案
5. 市場機会の特定

400-600文字程度で、補助金申請書に記載できる形式で出力してください。
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating market analysis:', error);
    throw new Error('市場分析の生成に失敗しました。');
  }
};

/**
 * ユーザーの短い回答を補完・拡張
 * @param {string} questionId - 質問ID
 * @param {string} questionText - 質問文
 * @param {any} userAnswer - ユーザーの回答
 * @param {Object} context - 他の回答情報（コンテキスト）
 * @returns {Promise<string>} 補完された回答
 */
export const enhanceAnswer = async (questionId, questionText, userAnswer, context = {}) => {
  try {
    console.log('[enhanceAnswer] Called with:', {
      questionId,
      answerType: typeof userAnswer,
      answerLength: typeof userAnswer === 'string' ? userAnswer.length : 'N/A',
      answer: typeof userAnswer === 'string' ? userAnswer.substring(0, 50) : JSON.stringify(userAnswer)
    });

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // 2025年最新安定版
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 500, // 短めに設定
      }
    });

    // 配列や選択肢の場合は補完不要
    if (Array.isArray(userAnswer)) {
      console.log('[enhanceAnswer] Skipped - array answer');
      return null;
    }

    // 短い回答（5文字未満）は補完せずそのまま使う
    if (typeof userAnswer === 'string' && userAnswer.length < 5) {
      console.log('[enhanceAnswer] Skipped - too short');
      return null;
    }

    // 店舗情報など具体的な固有名詞は補完不要
    const noEnhanceQuestions = ['Q2-0', 'Q2-1', 'Q2-2', 'Q2-3', 'Q2-4', 'Q2-6'];
    if (noEnhanceQuestions.includes(questionId)) {
      console.log('[enhanceAnswer] Skipped - noEnhance question');
      return null;
    }

    console.log('[enhanceAnswer] Generating enhancement...');

    const prompt = `
あなたは小規模事業者持続化補助金申請のサポートAIです。
ユーザーは申請書作成の経験がなく、短い回答しかできません。
ユーザーの簡潔な回答を、申請書に適した詳細で説得力のある文章に補完してください。

【質問】
${questionText}

【ユーザーの回答】
${userAnswer}

【店舗情報（参考）】
${context.storeName ? `店舗名: ${context.storeName}` : ''}
${context.storeAddress ? `住所: ${context.storeAddress}` : ''}
${context.philosophy ? `経営理念: ${context.philosophy}` : ''}

【補完のポイント】
1. ユーザーの意図を正確に汲み取る
2. 具体的で説得力のある表現にする
3. 100-200文字程度に拡張する
4. 申請書として自然な文章にする
5. 誇張せず、実現可能な内容にする
6. ユーザーが書いていない新しい情報は追加しない

補完された文章のみを出力してください。説明や前置きは不要です。
`;

    console.log(`Enhancing answer for ${questionId}...`);

    const result = await model.generateContent(prompt);
    const response = result.response;

    console.log('[enhanceAnswer] Full response object:', {
      candidates: response.candidates,
      promptFeedback: response.promptFeedback
    });

    // 候補の詳細を確認
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      console.log('[enhanceAnswer] First candidate details:', {
        finishReason: candidate.finishReason,
        safetyRatings: candidate.safetyRatings,
        hasContent: !!candidate.content,
        partsLength: candidate.content?.parts?.length,
        firstPartText: candidate.content?.parts?.[0]?.text
      });
    }

    const enhancedText = response.text().trim();

    console.log(`Answer enhanced: ${userAnswer} -> ${enhancedText}`);
    console.log(`[enhanceAnswer] Response length: ${enhancedText.length}, isEmpty: ${enhancedText.length === 0}`);

    // 空文字列の場合はnullを返す
    if (!enhancedText || enhancedText.length === 0) {
      console.log('[enhanceAnswer] Empty response from Gemini API - checking blockReason');
      if (response.promptFeedback?.blockReason) {
        console.error(`[enhanceAnswer] Prompt was blocked! Reason: ${response.promptFeedback.blockReason}`);
      }
      return null;
    }

    return enhancedText;
  } catch (error) {
    console.error('Error enhancing answer:', error);
    // エラーの場合は元の回答を返す
    return null;
  }
};

/**
 * 質問に対する回答をAIが自動生成（Google Maps情報ベース）
 * @param {string} questionId - 質問ID
 * @param {Object} question - 質問オブジェクト
 * @param {Object} context - コンテキスト情報（店舗情報、既存回答など）
 * @returns {Promise<any>} 生成された回答
 */
export const generateAnswerDraft = async (questionId, question, context = {}) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // 2025年最新安定版
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 400,
      }
    });

    const { placeInfo, marketData, answers = {} } = context;

    // Google Maps情報の整理
    const storeContext = placeInfo ? `
【店舗情報（Google Mapsより）】
- 店舗名: ${placeInfo.name || ''}
- 住所: ${placeInfo.address || ''}
- 評価: ${placeInfo.rating || 'N/A'} (${placeInfo.user_ratings_total || 0}件のレビュー)
- 価格帯: ${placeInfo.price_level ? '$'.repeat(placeInfo.price_level) : '不明'}
- 営業時間: ${placeInfo.opening_hours?.weekday_text?.join(', ') || '情報なし'}
${placeInfo.reviews && placeInfo.reviews.length > 0 ? `
- お客様の声:
${placeInfo.reviews.slice(0, 3).map(r => `  「${r.text?.substring(0, 100) || ''}」`).join('\n')}
` : ''}
` : '';

    const marketContext = marketData ? `
【周辺市場情報】
- 周辺競合店舗数: ${marketData.nearbyStores?.length || 0}店
${marketData.nearbyStores?.slice(0, 3).map(s => `  - ${s.name} (評価: ${s.rating || 'N/A'})`).join('\n') || ''}
` : '';

    const existingAnswers = Object.keys(answers).length > 0 ? `
【これまでの回答】
${Object.entries(answers).slice(-5).map(([qId, ans]) => {
  if (typeof ans === 'string' && ans.length < 100) {
    return `${qId}: ${ans}`;
  }
  return null;
}).filter(Boolean).join('\n')}
` : '';

    let prompt = '';

    // 質問タイプに応じたプロンプト
    if (question.type === 'textarea' || question.type === 'text') {
      prompt = `
あなたは小規模事業者持続化補助金申請のサポートAIです。
以下の情報をもとに、質問に対する適切な回答を生成してください。

${storeContext}
${marketContext}
${existingAnswers}

【質問】
${question.text}

【回答生成のポイント】
1. Google Mapsの情報を最大限活用する
2. レビューから店舗の強みを抽出する
3. 具体的で説得力のある内容にする
4. ${question.maxLength ? `${question.maxLength}文字以内` : '100-200文字程度'}にまとめる
5. 申請書として自然な文章にする
6. 不確実な情報は推測しない

回答文のみを出力してください。説明や前置きは不要です。
`;
    } else if (question.type === 'single_select') {
      prompt = `
あなたは小規模事業者持続化補助金申請のサポートAIです。
以下の情報をもとに、最も適切な選択肢を1つ選んでください。

${storeContext}
${marketContext}
${existingAnswers}

【質問】
${question.text}

【選択肢】
${question.options?.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

【選択のポイント】
1. Google Mapsの情報から推測する
2. 一般的な飲食店の傾向を考慮する
3. 最も妥当な選択肢を選ぶ

選択した選択肢のテキストのみを出力してください（番号不要）。説明は不要です。
`;
    } else if (question.type === 'multi_select') {
      prompt = `
あなたは小規模事業者持続化補助金申請のサポートAIです。
以下の情報をもとに、適切な選択肢を複数選んでください。

${storeContext}
${marketContext}
${existingAnswers}

【質問】
${question.text}

【選択肢】
${question.options?.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

【選択のポイント】
1. Google Mapsのレビューや情報から推測する
2. 一般的な飲食店の傾向を考慮する
3. 2-4個程度の選択肢を選ぶ
4. 補助金申請に効果的な選択肢を優先する

選択した選択肢を改行区切りで出力してください（番号不要）。説明は不要です。
`;
    }

    console.log(`Generating answer draft for ${questionId}...`);

    const result = await model.generateContent(prompt);
    const response = result.response;
    let generatedText = response.text().trim();

    // multi_selectの場合は配列に変換
    if (question.type === 'multi_select') {
      const items = generatedText.split('\n').map(line => line.trim()).filter(Boolean);
      return items;
    }

    console.log(`Answer draft generated for ${questionId}: ${generatedText}`);

    return generatedText;
  } catch (error) {
    console.error('Error generating answer draft:', error);
    return null;
  }
};
