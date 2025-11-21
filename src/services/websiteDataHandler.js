/**
 * WebサイトURLから情報を取得する処理
 * - 食べログ・ホットペッパー：構造化データ抽出
 * - 公式サイト：要約生成
 */

import { fetchWebsiteData, detectUrlType } from './fetchWebsiteData';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Q1-0-websiteの回答時に呼び出される処理
 * 食べログ・ホットペッパーのURLから情報を取得し、Firestoreに保存
 *
 * @param {string} url - ユーザーが入力したURL
 * @param {Function} updateAnswer - Firestore更新関数
 * @param {Function} addAIMessage - AIメッセージ追加関数
 * @returns {Promise<Object|null>} 取得したデータまたはnull
 */
export const handleWebsiteUrl = async (url, updateAnswer, addAIMessage) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const urlType = detectUrlType(url);

  if (urlType !== 'tabelog' && urlType !== 'hotpepper') {
    // サポートされていないURLの場合は何もしない
    return null;
  }

  console.log(`[${urlType}] Fetching data from:`, url);
  addAIMessage(`${urlType === 'tabelog' ? '食べログ' : 'ホットペッパー'}から情報を取得しています...`);

  try {
    const result = await fetchWebsiteData(url);
    console.log(`[${urlType}] Data fetched:`, result);

    if (result.success && result.data) {
      // 取得した情報をFirestoreに保存
      const dataKey = urlType === 'tabelog' ? 'Q1-0-tabelog' : 'Q1-0-hotpepper';
      await updateAnswer(dataKey, result.data);

      // 取得結果を表示
      let resultMessage = `✅ ${urlType === 'tabelog' ? '食べログ' : 'ホットペッパー'}から情報を取得しました！\n\n`;

      if (urlType === 'tabelog') {
        if (result.data.rating) resultMessage += `⭐ 評価: ${result.data.rating}\n`;
        if (result.data.reviewCount) resultMessage += `📝 口コミ件数: ${result.data.reviewCount}件\n`;
        if (result.data.budget) resultMessage += `💰 予算: ${result.data.budget}\n`;
        if (result.data.popularDishes && result.data.popularDishes.length > 0) {
          resultMessage += `🍴 人気メニュー: ${result.data.popularDishes.slice(0, 3).join('、')}\n`;
        }
        if (result.data.keywords && result.data.keywords.length > 0) {
          resultMessage += `💬 キーワード: ${result.data.keywords.slice(0, 3).join('、')}`;
        }
      } else {
        // ホットペッパー
        if (result.data.rating) resultMessage += `⭐ 評価: ${result.data.rating}\n`;
        if (result.data.reviewCount) resultMessage += `📝 口コミ件数: ${result.data.reviewCount}件\n`;
        if (result.data.priceRange) resultMessage += `💰 価格帯: ${result.data.priceRange}\n`;
        if (result.data.popularMenus && result.data.popularMenus.length > 0) {
          resultMessage += `💇 人気メニュー: ${result.data.popularMenus.slice(0, 3).join('、')}\n`;
        }
        if (result.data.keywords && result.data.keywords.length > 0) {
          resultMessage += `💬 キーワード: ${result.data.keywords.slice(0, 3).join('、')}`;
        }
      }

      addAIMessage(resultMessage);

      return result.data;
    }

    return null;
  } catch (error) {
    console.error(`[${urlType}] Error fetching data:`, error);
    addAIMessage(`⚠️ ${urlType === 'tabelog' ? '食べログ' : 'ホットペッパー'}からの情報取得に失敗しました。URLのみ保存して続けます。`);
    return null;
  }
};

/**
 * 公式サイトURLから要約を取得
 *
 * @param {string} url - 公式サイトのURL
 * @returns {Promise<string|null>} 要約テキストまたはnull
 */
export const fetchOfficialWebsiteSummary = async (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    console.log('[Official Website] Fetching summary from:', url);

    const functions = getFunctions(undefined, 'asia-northeast1');
    const summarizeCallable = httpsCallable(functions, 'summarizeWebsite');

    const result = await summarizeCallable({ url });

    if (result.data && result.data.summary) {
      const summaryPreview = result.data.summary.substring(0, 100);
      console.log('[Official Website] Summary received:', summaryPreview + '...');
      return result.data.summary;
    }

    return null;
  } catch (error) {
    console.error('[Official Website] Error fetching summary:', error);
    return null;
  }
};

/**
 * Q1-0（Google Maps検索）のwebsiteフィールドを処理
 *
 * @param {string} websiteUrl - Google Mapsから取得したwebsite URL
 * @param {Function} updateAnswer - Firestore更新関数
 * @param {Function} addAIMessage - AIメッセージ追加関数
 * @returns {Promise<void>}
 */
export const handleGoogleMapsWebsite = async (websiteUrl, updateAnswer, addAIMessage) => {
  if (!websiteUrl || typeof websiteUrl !== 'string') {
    return;
  }

  const urlType = detectUrlType(websiteUrl);

  // 食べログ・ホットペッパーの場合
  if (urlType === 'tabelog' || urlType === 'hotpepper') {
    await handleWebsiteUrl(websiteUrl, updateAnswer, addAIMessage);
    return;
  }

  // 公式サイトの場合
  console.log('[Google Maps Website] Processing official website:', websiteUrl);
  addAIMessage('公式サイトから情報を取得しています...');

  try {
    const summary = await fetchOfficialWebsiteSummary(websiteUrl);

    if (summary) {
      // 要約をFirestoreに保存
      await updateAnswer('Q1-0-website-summary', {
        url: websiteUrl,
        summary: summary,
        fetchedAt: new Date().toISOString(),
      });

      const summaryPreview = summary.length > 150 ? summary.substring(0, 150) + '...' : summary;
      addAIMessage(`✅ 公式サイトの情報を取得しました！\n\n${summaryPreview}`);
    } else {
      addAIMessage('⚠️ 公式サイトからの情報取得に失敗しました。URLのみ保存します。');
    }
  } catch (error) {
    console.error('[Google Maps Website] Error:', error);
    addAIMessage('⚠️ 公式サイトからの情報取得に失敗しました。URLのみ保存します。');
  }
};
