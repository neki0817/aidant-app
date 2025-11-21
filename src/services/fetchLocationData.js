import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Q1-0回答後に立地データを取得
 *
 * 取得データ:
 * 1. 最寄り駅からの距離（Distance Matrix API）
 * 2. 半径1km以内の競合店舗数（Nearby Search API）
 * 3. 競合店舗の平均評価
 *
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @param {string} businessType - 業種
 * @param {string} address - 住所
 * @returns {Promise<Object>} 立地データ
 */
export async function fetchLocationData(lat, lng, businessType, address) {
  try {
    console.log('[fetchLocationData] Calling Cloud Function:', { lat, lng, businessType });

    const functions = getFunctions(undefined, 'asia-northeast1');
    const fetchLocationDataFunc = httpsCallable(functions, 'fetchLocationData');

    const result = await fetchLocationDataFunc({
      lat,
      lng,
      businessType,
      address
    });

    console.log('[fetchLocationData] Success:', result.data);

    return result.data;
  } catch (error) {
    console.error('[fetchLocationData] Error:', error);

    // エラーでもnullを返して処理を続行
    return {
      nearestStation: null,
      competitors: null,
      error: error.message
    };
  }
}
