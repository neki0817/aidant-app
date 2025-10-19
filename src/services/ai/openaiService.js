/**
 * OpenAI API サービス
 * AI補完質問生成などのOpenAI API連携機能を提供
 */

/**
 * 補完質問を生成
 * @param {Object} data - Step 2の回答データ
 * @returns {Promise<Array>} - 追加質問のリスト
 */
export const generateFollowupQuestions = async (data) => {
  const { products, business, strengths, challenges, plans } = data;

  // TODO: 実際のOpenAI API呼び出しを実装
  // 現時点ではダミーのロジックで質問を生成
  const questions = [];

  // 売上構成比の合計チェック
  const totalRatio = products.reduce((sum, p) => sum + (p.ratio || 0), 0);
  if (totalRatio < 70) {
    questions.push(`売上構成比の合計が${totalRatio}%ですが、残りの${100 - totalRatio}%はどのような製品・サービスですか?`);
  }

  // 主要販売先の詳細チェック
  const hasVagueCustomers = products.some(p =>
    p.customers && (p.customers.length < 10 || p.customers === '個人客' || p.customers === '法人客')
  );
  if (hasVagueCustomers) {
    questions.push('主要販売先について、もう少し具体的に教えてください。例えば、「個人客」の場合は年齢層や性別、「法人客」の場合は業種や企業規模などを教えてください。');
  }

  // 強みと経営課題の整合性チェック
  if (strengths.manualStrengths) {
    const hasWebChallenge = challenges.selectedChallenges.includes('Web活用');
    const hasWebStrength = strengths.manualStrengths.includes('Web') || strengths.manualStrengths.includes('SNS');

    if (hasWebChallenge && hasWebStrength) {
      questions.push('強みとして「Web・SNS活用」を挙げながら、経営課題でも「Web・SNS活用」を選んでいます。現状のWeb活用状況と、今後どう改善したいのかを具体的に教えてください。');
    }
  }

  // 今後の取り組みと製品・サービスの関連性チェック
  const hasNewProductPlan = plans.selectedPlans.includes('新商品開発');
  if (hasNewProductPlan && products.length < 3) {
    questions.push('新商品・サービスの開発を計画されていますが、既存製品が少ない状況です。既存製品の充実よりも新商品開発を優先する理由を教えてください。');
  }

  // 売上向上施策と経営課題の一貫性チェック
  const hasRecognitionChallenge = challenges.selectedChallenges.includes('認知度向上');
  const hasSNSPlan = plans.selectedPlans.includes('SNS活用');
  const hasAdvertisingPlan = plans.selectedPlans.includes('チラシ・広告');

  if (hasRecognitionChallenge && !hasSNSPlan && !hasAdvertisingPlan) {
    questions.push('認知度向上が課題とのことですが、SNSやチラシ・広告などの取り組みが計画に含まれていません。認知度向上のためにどのような施策を考えていますか?');
  }

  // 競合との差別化の明確性チェック
  if (strengths.competitors && strengths.competitors.length > 0) {
    const hasCompetitorInfo = strengths.competitors.some(c => c.rating > 4.0);
    if (hasCompetitorInfo && strengths.manualStrengths && strengths.manualStrengths.length < 50) {
      questions.push('周辺に評価の高い競合店舗があります。競合と比較した際の、御社ならではの強みや差別化ポイントをもう少し詳しく教えてください。');
    }
  }

  // 最低1つは質問を返す（データが不足している場合）
  if (questions.length === 0) {
    questions.push('申請書をより魅力的にするために、御社の事業について補足したい情報があれば自由に教えてください。');
  }

  // 最大5つまでに制限
  return questions.slice(0, 5);
};

/**
 * OpenAI APIを使った質問生成（将来実装）
 * @param {Object} data - 回答データ
 * @returns {Promise<Array>} - 生成された質問
 */
const generateQuestionsWithOpenAI = async (data) => {
  // TODO: 環境変数からAPIキーを取得
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('[OpenAI] API key not found, using fallback logic');
    return [];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '小規模事業者持続化補助金の申請書作成を支援するAIアシスタントです。ユーザーの回答内容を分析して、申請書をより良くするための追加質問を生成してください。'
          },
          {
            role: 'user',
            content: `以下の回答内容を分析して、3〜5個の追加質問を生成してください:\n\n${JSON.stringify(data, null, 2)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const result = await response.json();
    const content = result.choices[0].message.content;

    // 質問を配列に変換
    const questions = content.split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());

    return questions;
  } catch (error) {
    console.error('[OpenAI] Error:', error);
    return [];
  }
};
