/**
 * AI補完質問ハンドラー
 * Step 2の最後にユーザーの回答を分析して追加質問を生成
 */

import { generateFollowupQuestions } from './openaiService';

/**
 * AI補完分析を実行
 * @param {Object} answers - Step 2の全回答
 * @returns {Promise<Object>} - 分析結果と追加質問
 */
export const executeFollowupAnalysis = async (answers) => {
  try {
    console.log('[AI Followup] Analyzing Step 2 answers...');

    // Step 2の回答から主要情報を抽出
    const productsInfo = extractProductsInfo(answers);
    const businessInfo = extractBusinessInfo(answers);
    const strengthsInfo = extractStrengthsInfo(answers);
    const challengesInfo = extractChallengesInfo(answers);
    const plansInfo = extractPlansInfo(answers);

    // OpenAI APIで追加質問を生成
    const questions = await generateFollowupQuestions({
      products: productsInfo,
      business: businessInfo,
      strengths: strengthsInfo,
      challenges: challengesInfo,
      plans: plansInfo
    });

    console.log('[AI Followup] Generated', questions.length, 'follow-up questions');

    return {
      questions,
      analysisComplete: true
    };
  } catch (error) {
    console.error('[AI Followup] Error:', error);
    return {
      questions: [],
      error: error.message
    };
  }
};

/**
 * 製品・サービス情報を抽出
 */
const extractProductsInfo = (answers) => {
  const products = [];

  // 1位の製品
  if (answers['Q2-1']) {
    products.push({
      category: answers['Q2-1'],
      sales: answers['Q2-2'],
      ratio: answers['Q2-3'],
      customers: answers['Q2-4']
    });
  }

  // 2位の製品
  if (answers['Q2-5'] && answers['Q2-5'] !== 'なし' && answers['Q2-5'] !== 'ない') {
    products.push({
      category: answers['Q2-5'],
      sales: answers['Q2-6'],
      ratio: answers['Q2-7'],
      customers: answers['Q2-8']
    });
  }

  // 3位の製品
  if (answers['Q2-9'] && answers['Q2-9'] !== 'なし' && answers['Q2-9'] !== 'ない') {
    products.push({
      category: answers['Q2-9'],
      sales: answers['Q2-10'],
      ratio: answers['Q2-11'],
      customers: answers['Q2-12']
    });
  }

  return products;
};

/**
 * 顧客属性情報を抽出
 */
const extractBusinessInfo = (answers) => {
  return {
    customerAgeGroups: answers['Q2-13'] || [],
    customerCharacteristics: answers['Q2-14'] || [],
    customerNotes: answers['Q2-15'] || ''
  };
};

/**
 * 強み・差別化情報を抽出
 */
const extractStrengthsInfo = (answers) => {
  // 自動分析結果があればそれを優先
  const autoAnalysis = answers['Q2-17-analyzing'];
  const manualInput = answers['Q2-17-manual'] || answers['Q2-17-manual-add'];

  return {
    autoKeywords: autoAnalysis?.keywords || [],
    autoStrengthsText: autoAnalysis?.strengthsText || '',
    manualStrengths: manualInput || '',
    competitors: answers['Q2-16-analyzing']?.competitors || []
  };
};

/**
 * 経営課題情報を抽出
 */
const extractChallengesInfo = (answers) => {
  return {
    selectedChallenges: answers['Q2-18'] || [],
    otherChallenges: answers['Q2-18-other'] || ''
  };
};

/**
 * 今後の取り組み情報を抽出
 */
const extractPlansInfo = (answers) => {
  return {
    selectedPlans: answers['Q2-19'] || [],
    planDetails: answers['Q2-20'] || ''
  };
};
