/**
 * ディープリサーチ機能（Gemini版）
 *
 * Google Gemini APIのGrounding with Google Search機能を使用して
 * 市場調査を実施し、様式2「顧客ニーズと市場の動向」セクションに必要なデータを収集
 */

const { OpenAI } = require('openai');

/**
 * Gemini APIで市場調査を実行（Grounding with Google Search使用）
 */
async function performGeminiResearch(businessType, location, answers) {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    console.warn('[deepResearch] Gemini API key not found. Skipping research.');
    return null;
  }

  try {
    const prompt = `
あなたは市場調査の専門家です。以下の事業について、小規模事業者持続化補助金の申請書「様式2」の「顧客ニーズと市場の動向」セクションを作成するために必要な情報を調査してください。

【事業情報】
- 業種: ${businessType}
- 所在地: ${location}
- 補助金の目的: ${answers['Q1-7'] || '販路開拓'}

【調査内容】
1. **業界全体の市場規模・成長率**: 統計データ、出典を必ず明記
2. **地域別の市場動向**: ${location}エリアの特性、人口統計、観光客数等
3. **業種別のトレンド**: 最新の業界動向、顧客ニーズの変化
4. **競合状況**: 同業種の店舗数、市場シェア等

【出力形式】
- である調（常体）で記述
- 出典を必ず明記（例：「観光庁の統計によると...」）
- 具体的な数値を含める
- 400-600文字程度

最新の情報を検索して、客観的なデータに基づいた分析を行ってください。
`;

    // Gemini API呼び出し（Grounding with Google Search使用）
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          tools: [
            {
              google_search: {} // Google検索機能を有効化
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[deepResearch] Gemini API error:', errorData);
      return null;
    }

    const data = await response.json();

    // レスポンスからテキストを抽出
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Grounding metadataから引用元を抽出
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    const sources = [];

    if (groundingMetadata?.webSearchQueries) {
      console.log('[deepResearch] Web search queries:', groundingMetadata.webSearchQueries);
    }

    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || 'No title',
            url: chunk.web.uri
          });
        }
      });
    }

    return {
      summary: textContent,
      sources: sources,
      queries: groundingMetadata?.webSearchQueries || []
    };

  } catch (error) {
    console.error('[deepResearch] Gemini API error:', error);
    return null;
  }
}

/**
 * OpenAIで追加分析（補完用）
 */
async function enhanceWithOpenAI(geminiResult, businessType, location) {
  try {
    // OpenAI APIキーがない場合はスキップ
    if (!process.env.OPENAI_API_KEY) {
      console.log('[deepResearch] OpenAI API key not found. Skipping enhancement.');
      return null;
    }

    // OpenAIクライアントを遅延初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `
以下の市場調査結果を補完し、様式2「顧客ニーズと市場の動向」セクションに必要な情報を追加してください。

【既存の調査結果】
${geminiResult.summary}

【事業情報】
- 業種: ${businessType}
- 所在地: ${location}

【補完内容】
1. 地域別の具体的な顧客分布（可能であれば）
2. 業種特有のトレンド・変化
3. 競合状況の詳細分析

JSON形式で以下を返してください：
{
  "marketOverview": "市場全体の動向（200-300文字）",
  "regionalTrends": "地域別の動向（100-150文字）",
  "customerNeeds": "顧客ニーズの変化（100-150文字）",
  "keyData": {
    "marketSize": "市場規模データ",
    "growthRate": "成長率データ",
    "competitorCount": "競合数データ"
  }
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'あなたは市場調査の専門家です。JSON形式で回答してください。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('[deepResearch] OpenAI enhancement error:', error);
    return null;
  }
}

/**
 * ディープリサーチのメイン処理（Gemini版）
 */
async function performDeepResearch(answers, placeData) {
  try {
    console.log('[deepResearch] Starting deep market research (Gemini)...');

    // 1. 基本情報の抽出
    const businessType = answers['Q1-1'] || 'その他';
    const location = placeData?.vicinity || placeData?.formatted_address || '東京都';

    console.log(`[deepResearch] Business: ${businessType}, Location: ${location}`);

    // 2. Gemini APIで市場調査実行
    const geminiResult = await performGeminiResearch(businessType, location, answers);

    if (!geminiResult) {
      console.warn('[deepResearch] Gemini research failed, using fallback');
      return {
        timestamp: new Date().toISOString(),
        businessType,
        location,
        error: 'Gemini API unavailable',
        summary: '現在、市場調査データを取得できませんでした。Phase 2では手動で市場動向を入力してください。',
        sources: []
      };
    }

    // 3. OpenAIで補完分析（オプション）
    const enhancement = await enhanceWithOpenAI(geminiResult, businessType, location);

    // 4. 最終レポート生成
    const report = {
      timestamp: new Date().toISOString(),
      businessType,
      location,
      queries: geminiResult.queries,
      sources: geminiResult.sources,
      summary: geminiResult.summary,
      analysis: enhancement || {
        marketOverview: geminiResult.summary.substring(0, 300),
        regionalTrends: '',
        customerNeeds: '',
        keyData: {}
      }
    };

    console.log('[deepResearch] Deep research completed successfully (Gemini)');
    console.log(`[deepResearch] Found ${geminiResult.sources.length} sources`);

    return report;

  } catch (error) {
    console.error('[deepResearch] Error during deep research:', error);

    // エラー時もダミーデータを返す
    return {
      timestamp: new Date().toISOString(),
      businessType: answers['Q1-1'] || 'その他',
      location: placeData?.vicinity || '不明',
      error: error.message,
      summary: `現在、市場調査データを取得できませんでした。手動で市場動向を入力してください。`,
      sources: []
    };
  }
}

module.exports = {
  performDeepResearch
};
