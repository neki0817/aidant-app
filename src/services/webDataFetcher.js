/**
 * 外部WebサイトからデータをClaudeを使って取得するサービス
 */

import Anthropic from '@anthropic-ai/sdk';

// Anthropic APIキー（環境変数から取得）
const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY;

/**
 * 食べログURLから情報を取得
 * @param {string} url - 食べログのURL
 * @returns {Promise<Object>} 取得した情報
 */
export const fetchTabelogData = async (url) => {
  if (!url || !url.includes('tabelog.com')) {
    throw new Error('有効な食べログURLではありません');
  }

  try {
    console.log('[fetchTabelogData] Fetching:', url);

    const client = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true // フロントエンドで使用する場合
    });

    const prompt = `以下の食べログページから、以下の情報をJSON形式で抽出してください：

1. rating (評価点数、例: 3.5)
2. reviewCount (口コミ件数、数値のみ)
3. budget (予算、例: "¥3,000～¥3,999")
4. popularDishes (人気メニュー、配列)
5. keywords (よく使われているキーワード、配列、例: ["美味しい", "雰囲気が良い"])

JSONのみを返してください（説明文は不要）。

URL: ${url}`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = message.content[0].text;
    console.log('[fetchTabelogData] Response:', responseText);

    // JSONを抽出（```json ``` で囲まれている場合も対応）
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON形式の応答を取得できませんでした');
    }

    const data = JSON.parse(jsonMatch[0]);
    console.log('[fetchTabelogData] Parsed data:', data);

    return {
      rating: data.rating || null,
      reviewCount: data.reviewCount || null,
      budget: data.budget || null,
      popularDishes: data.popularDishes || [],
      keywords: data.keywords || [],
      sourceUrl: url,
      fetchedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[fetchTabelogData] Error:', error);
    throw error;
  }
};

/**
 * ホットペッパービューティーURLから情報を取得
 * @param {string} url - ホットペッパービューティーのURL
 * @returns {Promise<Object>} 取得した情報
 */
export const fetchHotpepperBeautyData = async (url) => {
  if (!url || !url.includes('hotpepper.jp')) {
    throw new Error('有効なホットペッパーURLではありません');
  }

  try {
    console.log('[fetchHotpepperBeautyData] Fetching:', url);

    const client = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true
    });

    const prompt = `以下のホットペッパービューティーページから、以下の情報をJSON形式で抽出してください：

1. rating (評価点数、例: 4.5)
2. reviewCount (口コミ件数、数値のみ)
3. popularMenus (人気メニュー、配列)
4. priceRange (価格帯、例: "¥5,000～¥10,000")
5. keywords (よく使われているキーワード、配列、例: ["技術力が高い", "丁寧"])

JSONのみを返してください（説明文は不要）。

URL: ${url}`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = message.content[0].text;
    console.log('[fetchHotpepperBeautyData] Response:', responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON形式の応答を取得できませんでした');
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
      rating: data.rating || null,
      reviewCount: data.reviewCount || null,
      popularMenus: data.popularMenus || [],
      priceRange: data.priceRange || null,
      keywords: data.keywords || [],
      sourceUrl: url,
      fetchedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[fetchHotpepperBeautyData] Error:', error);
    throw error;
  }
};

/**
 * URLの種類を判定
 * @param {string} url - 判定するURL
 * @returns {string} 'tabelog' | 'hotpepper' | 'unknown'
 */
export const detectUrlType = (url) => {
  if (!url) return 'unknown';

  if (url.includes('tabelog.com')) return 'tabelog';
  if (url.includes('hotpepper.jp')) return 'hotpepper';

  return 'unknown';
};

/**
 * URLから自動で適切なデータ取得関数を呼び出す
 * @param {string} url - データ取得元のURL
 * @returns {Promise<Object>} 取得した情報
 */
export const fetchWebData = async (url) => {
  const urlType = detectUrlType(url);

  switch (urlType) {
    case 'tabelog':
      return await fetchTabelogData(url);
    case 'hotpepper':
      return await fetchHotpepperBeautyData(url);
    default:
      throw new Error('サポートされていないURLです');
  }
};
