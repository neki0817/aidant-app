/**
 * 外部WebサイトURL（食べログ・ホットペッパー等）から構造化データを取得
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');

// OpenAI クライアント（index.jsから共有される想定、もしくはここで初期化）
const openai = new OpenAI({
  apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY,
});

/**
 * fetchWebsiteData Cloud Function
 *
 * @param {string} url - 食べログ、ホットペッパー等のURL
 * @returns {Object} 取得した構造化データ
 */
exports.fetchWebsiteData = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const { url } = data;

    if (!url) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'URLが指定されていません'
      );
    }

    console.log('[fetchWebsiteData] Fetching:', url);

    try {
      // URLからHTMLを取得
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AidantBot/1.0; +https://aidant-app.web.app)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const html = await response.text();
      const htmlSnippet = html.substring(0, 30000); // 最初の30,000文字のみ

      // URLの種類を判定してプロンプトを構築
      let prompt = '';
      if (url.includes('tabelog.com')) {
        prompt = `以下の食べログページのHTMLから、以下の情報をJSON形式で抽出してください：

1. rating (評価点数、数値、例: 3.5)
2. reviewCount (口コミ件数、数値のみ)
3. budget (予算、文字列、例: "¥3,000～¥3,999")
4. popularDishes (人気メニュー、文字列配列、最大3つ)
5. keywords (よく使われているキーワード、文字列配列、最大5つ、例: ["美味しい", "雰囲気が良い"])

情報が見つからない場合はnullを返してください。
JSONのみを返してください（説明文は不要）。

HTML（最初の30,000文字）:
${htmlSnippet}`;
      } else if (url.includes('hotpepper.jp')) {
        prompt = `以下のホットペッパービューティーページのHTMLから、以下の情報をJSON形式で抽出してください：

1. rating (評価点数、数値、例: 4.5)
2. reviewCount (口コミ件数、数値のみ)
3. popularMenus (人気メニュー、文字列配列、最大3つ)
4. priceRange (価格帯、文字列、例: "¥5,000～¥10,000")
5. keywords (よく使われているキーワード、文字列配列、最大5つ、例: ["技術力が高い", "丁寧"])

情報が見つからない場合はnullを返してください。
JSONのみを返してください（説明文は不要）。

HTML（最初の30,000文字）:
${htmlSnippet}`;
      } else {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'サポートされていないURLです（食べログ、ホットペッパーのみ対応）'
        );
      }

      // OpenAI APIで情報抽出
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたはWebページから構造化されたデータを抽出する専門家です。JSON形式で必ず回答してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const resultText = completion.choices[0].message.content.trim();
      const extractedData = JSON.parse(resultText);

      console.log('[fetchWebsiteData] Extracted data:', extractedData);

      return {
        success: true,
        data: {
          ...extractedData,
          sourceUrl: url,
          fetchedAt: admin.firestore.Timestamp.now(),
        },
      };

    } catch (error) {
      console.error('[fetchWebsiteData] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `データ取得エラー: ${error.message}`
        );
      }

      throw new functions.https.HttpsError(
        'internal',
        `エラーが発生しました: ${error.message}`
      );
    }
  });
