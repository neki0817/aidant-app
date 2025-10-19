/**
 * 自動分析ハンドラー
 * auto_analyze_competitors と auto_analyze_reviews を処理
 */

import {
  searchNearbyCompetitors,
  getPlaceDetails,
  extractKeywordsFromReviews,
  generateStrengthsFromKeywords
} from '../googleMaps/mapsService';

/**
 * 自動分析を実行
 * @param {string} questionId - 質問ID
 * @param {string} questionType - 質問タイプ
 * @param {Object} answers - すべての回答
 * @returns {Promise<Object>} - 分析結果
 */
export const executeAutoAnalysis = async (questionId, questionType, answers) => {
  console.log('[Auto Analysis] Executing:', questionType, 'for question:', questionId);

  if (questionType === 'auto_analyze_competitors') {
    return await analyzeCompetitors(answers);
  } else if (questionType === 'auto_analyze_reviews') {
    return await analyzeReviews(answers);
  }

  return null;
};

/**
 * 競合店舗の分析
 */
const analyzeCompetitors = async (answers) => {
  try {
    // Q1-0 からplace情報を取得
    const placeInfo = answers['Q1-0'];
    if (!placeInfo || !placeInfo.geometry || !placeInfo.geometry.location) {
      console.error('[Competitors Analysis] No place info found');
      return {
        competitors: [],
        error: '店舗情報が見つかりません'
      };
    }

    // Q1-1 から業種を取得
    const businessType = answers['Q1-1'];

    const location = {
      lat: placeInfo.geometry.location.lat,
      lng: placeInfo.geometry.location.lng
    };

    console.log('[Competitors Analysis] Searching near:', location, 'Type:', businessType);

    // Nearby Searchで競合を検索
    const competitors = await searchNearbyCompetitors(location, businessType, 2000);

    console.log('[Competitors Analysis] Found', competitors.length, 'competitors');

    return {
      competitors,
      location,
      businessType
    };
  } catch (error) {
    console.error('[Competitors Analysis] Error:', error);
    return {
      competitors: [],
      error: error.message
    };
  }
};

/**
 * 口コミの分析
 */
const analyzeReviews = async (answers) => {
  try {
    // Q1-0 からplace情報を取得
    const placeInfo = answers['Q1-0'];
    if (!placeInfo || !placeInfo.place_id) {
      console.error('[Reviews Analysis] No place info found');
      return {
        keywords: [],
        strengthsText: '',
        error: '店舗情報が見つかりません'
      };
    }

    console.log('[Reviews Analysis] Fetching details for:', placeInfo.place_id);

    // Place Detailsで口コミを取得
    const details = await getPlaceDetails(placeInfo.place_id);

    if (!details.reviews || details.reviews.length === 0) {
      console.log('[Reviews Analysis] No reviews found');
      return {
        keywords: [],
        strengthsText: '口コミがまだ投稿されていません。',
        reviews: []
      };
    }

    console.log('[Reviews Analysis] Found', details.reviews.length, 'reviews');

    // キーワード抽出
    const keywords = extractKeywordsFromReviews(details.reviews);

    // 強み文章を生成
    const strengthsText = generateStrengthsFromKeywords(keywords, placeInfo.name);

    return {
      keywords,
      strengthsText,
      reviews: details.reviews,
      totalReviews: details.user_ratings_total
    };
  } catch (error) {
    console.error('[Reviews Analysis] Error:', error);
    return {
      keywords: [],
      strengthsText: '',
      error: error.message
    };
  }
};
