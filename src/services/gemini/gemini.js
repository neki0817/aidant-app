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
  // 店舗情報
  const storeInfo = answers['Q2-0'] || {};
  const representative = answers['Q2-2'] || '';
  const openingDate = answers['Q2-3'] || '';
  const fiscalMonth = answers['Q2-4'] || '';
  const philosophy = answers['Q2-5'] || '';
  const employees = answers['Q2-6'] || '';

  // 売上情報
  const sales1 = answers['Q2-7-1'] || '';
  const sales2 = answers['Q2-7-2'] || '';
  const sales3 = answers['Q2-7-3'] || '';

  // 経営状況
  const profitStatus = answers['Q2-8'] || '';
  const financialTrend = answers['Q2-9'] || '';

  // 事業目的・取組
  const businessGoals = answers['Q1-2'] || [];
  const initiatives = answers['Q1-3'] || [];

  const prompt = `
あなたは小規模事業者持続化補助金の申請書作成の専門家です。
以下の情報を元に、審査に通りやすい高品質な申請書を作成してください。

# 事業者情報
- 店舗名：${storeInfo.name || ''}
- 住所：${storeInfo.address || ''}
- 代表者：${representative}
- 開業年月：${openingDate}
- 決算月：${fiscalMonth}
- 常時雇用従業員数：${employees}

# 事業理念・想い
${philosophy}

# 売上推移
- 第1期：${sales1}万円
- 第2期：${sales2}万円
- 第3期：${sales3}万円

# 経営状況
- 経常利益：${profitStatus}
- 財務推移：${financialTrend}

# 事業目的
${businessGoals.join('、')}

# 予定している取組
${initiatives.join('、')}

---

以下の構成で申請書を作成してください：

## 1. 企業概要（300-500文字）
- 事業の内容、特徴、強み
- 創業の経緯や想い
- 地域での役割

## 2. 顧客ニーズと市場の動向（400-600文字）
- ターゲット顧客層の明確化
- 市場環境の分析
- 顧客ニーズの変化

## 3. 自社や自社の提供する商品・サービスの強み（400-600文字）
- 独自性・差別化ポイント
- 品質へのこだわり
- 顧客満足度向上への取組

## 4. 経営方針・目標と今後のプラン（400-600文字）
- 中長期的な経営ビジョン
- 売上・利益目標
- 具体的な行動計画

## 5. 補助事業で行う事業名（30文字以内）
簡潔で分かりやすい事業名を提案してください。

## 6. 販路開拓等（生産性向上）の取組内容（1000-1500文字）
- 取組の具体的内容
- 実施スケジュール
- 期待される効果
- 地域経済への波及効果

## 7. 業務効率化（生産性向上）の取組内容（該当する場合）
設備導入等がある場合は記載。

## 8. 補助事業の効果（600-800文字）
- 売上増加の根拠
- 新規顧客獲得の見込み
- 地域への貢献

---

【重要な注意事項】
1. 審査員が評価するポイント：
   - 事業の独自性・革新性
   - 実現可能性の高さ
   - 地域経済への貢献
   - 明確な数値目標

2. 文章のトーン：
   - 簡潔で分かりやすい表現
   - 具体的なエピソードや数値を含める
   - 熱意と誠実さが伝わる文章

3. 避けるべき表現：
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
