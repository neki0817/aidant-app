/**
 * Q0-2回答のAI判定機能
 *
 * 1. ウェブ関連費のみの申請かチェック
 * 2. 補助対象外の経費が含まれていないかチェック
 * 3. 回答が不十分な場合は深掘り質問を生成
 */

const { OpenAI } = require('openai');

/**
 * Q0-2の回答をAIで判定
 * @param {string} answer - ユーザーの回答
 * @param {Object} previousAnswers - Q0-0, Q0-1の回答
 * @returns {Promise<Object>} 判定結果
 */
async function validateQ0_2Answer(answer, previousAnswers) {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.warn('[validateQ0-2] OpenAI API key not found. Skipping validation.');
    return {
      isValid: true,
      issues: [],
      followUpQuestions: []
    };
  }

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const purpose = previousAnswers['Q0-1'] || [];
    const purposeText = Array.isArray(purpose) ? purpose.join('、') : purpose;

    const prompt = `
あなたは小規模事業者持続化補助金の審査員です。以下のユーザー回答を分析してください。

【ユーザーの取組目的】
${purposeText}

【ユーザーの回答（購入・実施予定のもの）】
${answer}

【判定基準】
1. **ウェブ関連費のみの申請**
   - ホームページ、ECサイト、SNS広告、Web予約システムなどの「ウェブ関連費のみ」は申請不可
   - 他の経費（チラシ、看板、機械設備など）と組み合わせる必要がある

2. **補助対象外の経費**
   以下は補助対象外：
   - 建物の建築・購入（店舗の建て替え、新築、土地購入など）
   - 車両購入（軽トラック、営業車、配達用バイクなども全て不可）
   - 人件費（従業員給与、アルバイト代、社長報酬など）
   - 家賃・光熱費（事務所家賃、電気代、水道代など）
   - 既存設備の修理・メンテナンス（エアコン修理、看板の塗り直しなど）
   - 消耗品（文房具、日用品、使い捨て容器など）
   - 内装・外装工事（壁紙張替え、床の張替え、外壁塗装など）

3. **回答の具体性**
   - 「何を」「どれくらい」が明確か
   - 曖昧な表現（「いろいろ」「少し」など）がないか

【出力形式（JSON）】
{
  "isValid": true/false,
  "issues": [
    {
      "type": "web_only" | "ineligible" | "vague",
      "severity": "error" | "warning",
      "message": "具体的な問題点",
      "items": ["該当する項目"]
    }
  ],
  "followUpQuestions": [
    {
      "id": "Q0-2-followup-1",
      "text": "深掘り質問文",
      "type": "text" | "textarea",
      "reason": "なぜこの質問をするのか"
    }
  ],
  "analysis": {
    "webRelatedOnly": true/false,
    "hasIneligibleItems": true/false,
    "isVague": true/false,
    "summary": "総合評価（1-2文）"
  }
}

【判定ルール】
- ウェブ関連費のみ → isValid: false, severity: "error"
- 補助対象外が含まれる → isValid: false, severity: "error"
- 回答が曖昧 → isValid: true, severity: "warning", followUpQuestions生成
- 問題なし → isValid: true, issues: []

必ずJSON形式で回答してください。
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'あなたは小規模事業者持続化補助金の審査支援AIです。JSON形式で回答してください。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log('[validateQ0-2] Validation result:', result);

    return result;

  } catch (error) {
    console.error('[validateQ0-2] Error during validation:', error);

    // エラー時はvalidation通過扱い（ユーザー体験を損なわないため）
    return {
      isValid: true,
      issues: [],
      followUpQuestions: [],
      error: error.message
    };
  }
}

module.exports = {
  validateQ0_2Answer
};
