import OpenAI from 'openai';

// OpenAI APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Google Mapsの情報とこれまでの回答を分析してAIが質問を生成
 * @param {Object} placeData - Google Mapsから取得した店舗情報
 * @param {Object} previousAnswers - これまでの回答内容
 * @returns {Promise<Array>} 生成された質問リスト
 */
export const generateAIQuestions = async (placeData, previousAnswers) => {
  try {
    console.log('[AI Question Generator] Generating questions based on:', {
      placeName: placeData?.name,
      answersCount: Object.keys(previousAnswers).length
    });

    // Google Mapsデータの要約
    const placeInfo = {
      name: placeData?.name || '不明',
      rating: placeData?.rating || 'N/A',
      totalReviews: placeData?.user_ratings_total || 0,
      reviews: placeData?.reviews || [],
      address: placeData?.formatted_address || '不明',
    };

    // 口コミの分析（最大5件）
    const reviewSummary = placeInfo.reviews.slice(0, 5).map((review, idx) => ({
      rating: review.rating,
      text: review.text?.substring(0, 200) || '（テキストなし）'
    }));

    // これまでの回答の要約
    const answersSummary = {
      businessType: previousAnswers['Q1-1'] || '不明',
      goals: previousAnswers['Q1-2'] || [],
      initiatives: previousAnswers['Q1-3'] || [],
      philosophy: previousAnswers['Q2-5'] || '不明'
    };

    const prompt = `あなたは小規模事業者持続化補助金の申請サポートAIです。
店舗のGoogle Maps情報と事業者の回答を分析し、課題を深掘りする質問を3-5個生成してください。

【店舗情報（Google Maps）】
店舗名: ${placeInfo.name}
評価: ${placeInfo.rating}点（${placeInfo.totalReviews}件）
住所: ${placeInfo.address}

【口コミサマリー（最新5件）】
${reviewSummary.map((r, i) => `${i + 1}. [${r.rating}★] ${r.text}`).join('\n')}

【事業者の回答】
業種: ${answersSummary.businessType}
目標: ${Array.isArray(answersSummary.goals) ? answersSummary.goals.join('、') : answersSummary.goals}
検討中の取組: ${Array.isArray(answersSummary.initiatives) ? answersSummary.initiatives.join('、') : answersSummary.initiatives}
経営理念: ${answersSummary.philosophy}

【質問生成のポイント】
1. 口コミから見える強み・弱みを踏まえて質問する
2. 補助金申請に必要な「課題」を引き出す質問にする
3. 具体的で答えやすい質問にする
4. Yes/Noではなく、詳細を引き出す質問にする
5. 3-5個の質問を生成する

【出力形式】
JSON形式で以下の形式で返してください：
{
  "analysis": "口コミと回答の分析結果（2-3文で要約）",
  "questions": [
    {
      "id": "Q4-AI-1",
      "text": "質問文",
      "type": "textarea",
      "reasoning": "この質問をする理由"
    },
    ...
  ]
}`;

    console.log('[AI Question Generator] Calling OpenAI API...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは補助金申請サポートの専門家です。Google Mapsの口コミと事業者の回答を分析し、的確な質問を生成します。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log('[AI Question Generator] Questions generated:', result);

    return result;
  } catch (error) {
    console.error('[AI Question Generator] Error:', error);

    // エラー時はデフォルトの質問を返す
    return {
      analysis: "AI分析中にエラーが発生しました。標準的な質問を使用します。",
      questions: [
        {
          id: "Q4-AI-1",
          text: "現在抱えている最も大きな経営課題は何ですか？",
          type: "textarea",
          reasoning: "基本的な課題把握"
        },
        {
          id: "Q4-AI-2",
          text: "お客様からよく寄せられる要望や意見を教えてください",
          type: "textarea",
          reasoning: "顧客ニーズの把握"
        },
        {
          id: "Q4-AI-3",
          text: "今回の補助金で解決したい具体的な課題を教えてください",
          type: "textarea",
          reasoning: "補助金活用の明確化"
        }
      ]
    };
  }
};

/**
 * ユーザーの回答に基づいて追加質問を生成
 * @param {string} previousQuestion - 前の質問
 * @param {string} userAnswer - ユーザーの回答
 * @param {Object} context - コンテキスト情報
 * @returns {Promise<Object|null>} 追加質問または null
 */
export const generateFollowUpQuestion = async (previousQuestion, userAnswer, context) => {
  try {
    console.log('[AI Question Generator] Generating follow-up question...');

    const prompt = `前の質問に対するユーザーの回答を分析し、必要に応じて追加質問を生成してください。

【前の質問】
${previousQuestion}

【ユーザーの回答】
${userAnswer}

【判断基準】
- 回答が不十分または曖昧な場合のみ追加質問する
- 回答が十分詳しい場合は追加質問不要
- 補助金申請に必要な情報が足りているかを判断

【出力形式】
{
  "needFollowUp": true/false,
  "question": "追加質問文（needFollowUpがtrueの場合のみ）",
  "reasoning": "追加質問が必要/不要な理由"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは補助金申請サポートの専門家です。回答の十分性を判断し、必要な場合のみ追加質問を生成します。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log('[AI Question Generator] Follow-up result:', result);

    return result.needFollowUp ? {
      id: `Q4-AI-followup-${Date.now()}`,
      text: result.question,
      type: "textarea",
      reasoning: result.reasoning
    } : null;
  } catch (error) {
    console.error('[AI Question Generator] Error generating follow-up:', error);
    return null;
  }
};

export default { generateAIQuestions, generateFollowUpQuestion };
