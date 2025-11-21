/**
 * 外部WebサイトURL（食べログ・ホットペッパー等）から情報を取得するサービス
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * 食べログ・ホットペッパー等のURLから構造化データを取得
 *
 * @param {string} url - 食べログ、ホットペッパー等のURL
 * @returns {Promise<Object>} 取得したデータ
 */
export const fetchWebsiteData = async (url) => {
  if (!url) {
    throw new Error('URLが指定されていません');
  }

  try {
    console.log('[fetchWebsiteData] Calling Cloud Function with URL:', url);

    // Cloud Function呼び出し（asia-northeast1リージョン）
    const functions = getFunctions(undefined, 'asia-northeast1');
    const fetchDataCallable = httpsCallable(functions, 'fetchWebsiteData');

    const result = await fetchDataCallable({ url });

    console.log('[fetchWebsiteData] Cloud Function result:', result.data);

    return result.data;

  } catch (error) {
    console.error('[fetchWebsiteData] Error:', error);
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
