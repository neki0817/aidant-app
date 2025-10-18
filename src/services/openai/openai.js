import OpenAI from 'openai';

// OpenAI APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // クライアントサイドで使用する場合
});

/**
 * ユーザーの簡潔な回答を補完して詳細な文章にする
 * @param {string} questionId - 質問ID
 * @param {string} questionText - 質問文
 * @param {string} userAnswer - ユーザーの回答
 * @param {Object} context - 店舗情報などのコンテキスト
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

    console.log('[enhanceAnswer] Generating enhancement with OpenAI...');

    // 質問の種類に応じて適切な文字数を設定
    let targetLength = '50-80文字程度';
    let maxTokens = 200;

    // 詳細な説明が必要な質問は長めに設定
    const longAnswerQuestions = ['Q3-1', 'Q3-2', 'Q4-1', 'Q4-2']; // 販路開拓や経営計画など
    if (longAnswerQuestions.includes(questionId)) {
      targetLength = '100-150文字程度';
      maxTokens = 300;
    }

    const prompt = `あなたは小規模事業者持続化補助金申請のサポートAIです。
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
3. ${targetLength}に拡張する（重要：この文字数を守ること）
4. 申請書として自然な文章にする
5. 誇張せず、実現可能な内容にする
6. ユーザーが書いていない新しい情報は追加しない
7. 簡潔さを保ちながら、必要な情報を盛り込む

補完された文章のみを出力してください。説明や前置きは不要です。`;

    console.log(`[OpenAI] Calling API for ${questionId}...`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // コスト効率の良いモデル
      messages: [
        {
          role: "system",
          content: "あなたは補助金申請書作成の専門家です。ユーザーの簡潔な回答を、申請書に適した詳細な文章に補完します。指定された文字数を必ず守ってください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const enhancedText = completion.choices[0].message.content.trim();

    console.log(`[OpenAI] Answer enhanced: ${userAnswer} -> ${enhancedText}`);
    console.log(`[OpenAI] Response length: ${enhancedText.length}`);

    // 空文字列の場合はnullを返す
    if (!enhancedText || enhancedText.length === 0) {
      console.log('[enhanceAnswer] Empty response from OpenAI API');
      return null;
    }

    return enhancedText;
  } catch (error) {
    console.error('Error enhancing answer with OpenAI:', error);
    // エラーの場合は元の回答を返す
    return null;
  }
};

/**
 * 質問に対する回答の下書きを生成（3つの例を提示）
 */
export const generateAnswerDraft = async (questionId, questionText, context = {}) => {
  try {
    console.log(`Generating answer draft for ${questionId}...`);

    const prompt = `以下の質問に対して、3つの回答例を提示してください。

【質問】
${questionText}

【店舗情報】
${context.storeName ? `店舗名: ${context.storeName}` : ''}
${context.storeAddress ? `住所: ${context.storeAddress}` : ''}

JSON形式で3つの例を返してください：
{
  "examples": ["例1", "例2", "例3"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは補助金申請書作成の専門家です。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log(`Draft generated for ${questionId}:`, result);

    return result.examples || [];
  } catch (error) {
    console.error('Error generating draft:', error);
    return [];
  }
};

export default { enhanceAnswer, generateAnswerDraft };
