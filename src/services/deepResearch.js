/**
 * ディープリサーチサービス
 * Cloud Functionsのperform MarketResearch関数を呼び出す
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * 市場調査（ディープリサーチ）を実行
 *
 * @param {Object} answers - Phase 1の回答データ
 * @param {Object} placeData - Google Mapsから取得した店舗データ
 * @returns {Promise<Object>} 市場調査レポート
 */
export const performMarketResearch = async (answers, placeData) => {
  try {
    console.log('[deepResearch] Starting market research...');
    console.log('[deepResearch] Business type:', answers['Q1-1']);
    console.log('[deepResearch] Location:', placeData?.vicinity);

    const functions = getFunctions(undefined, 'asia-northeast1');
    const performMarketResearchFunction = httpsCallable(functions, 'performMarketResearch');

    const result = await performMarketResearchFunction({
      answers,
      placeData
    });

    console.log('[deepResearch] Market research completed');
    console.log('[deepResearch] Report summary:', result.data.report.summary?.substring(0, 100) + '...');

    return result.data.report;
  } catch (error) {
    console.error('[deepResearch] Error during market research:', error);

    // エラー時もダミーレポートを返す
    return {
      timestamp: new Date().toISOString(),
      businessType: answers['Q1-1'] || 'その他',
      location: placeData?.vicinity || '不明',
      error: error.message,
      summary: '現在、市場調査データを取得できませんでした。Phase 2では手動で市場動向を入力してください。',
      sources: []
    };
  }
};
