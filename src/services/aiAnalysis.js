/**
 * AI分析サービス
 * Cloud Functions経由でOpenAI APIを呼び出し
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

/**
 * 回答内容の完成度を分析
 * @param {Object} answers - 全ての回答データ
 * @param {Object} placeData - Google Maps情報
 * @returns {Promise<Object>} - 分析結果
 */
export const analyzeCompleteness = async (answers, placeData) => {
  try {
    console.log('[AI Analysis] Analyzing completeness...');

    const analyzeFunction = httpsCallable(functions, 'analyzeCompleteness');
    const result = await analyzeFunction({ answers, placeData });

    console.log('[AI Analysis] Analysis result:', result.data);

    return {
      success: true,
      analysis: result.data.analysis,
      pointsUsed: result.data.pointsUsed,
      remainingPoints: result.data.remainingPoints
    };
  } catch (error) {
    console.error('[AI Analysis] Error:', error);
    return {
      success: false,
      error: error.message || '分析中にエラーが発生しました'
    };
  }
};

/**
 * 追加質問を生成
 * @param {Array} gaps - 不足情報のリスト
 * @param {Object} answers - 全ての回答データ
 * @param {Object} placeData - Google Maps情報
 * @returns {Promise<Object>} - 生成された質問
 */
export const generateFollowUpQuestion = async (gaps, answers, placeData) => {
  try {
    console.log('[AI Analysis] Generating follow-up question...');

    const generateFunction = httpsCallable(functions, 'generateFollowUpQuestion');
    const result = await generateFunction({ gaps, answers, placeData });

    console.log('[AI Analysis] Generated question:', result.data);

    return {
      success: true,
      question: result.data.question,
      pointsUsed: result.data.pointsUsed,
      remainingPoints: result.data.remainingPoints
    };
  } catch (error) {
    console.error('[AI Analysis] Error:', error);
    return {
      success: false,
      error: error.message || '質問生成中にエラーが発生しました'
    };
  }
};

/**
 * Phase 5完了後の完成度チェックとAI追加質問フロー
 * @param {Object} answers - 全ての回答データ
 * @param {Object} placeData - Google Maps情報
 * @returns {Promise<Object>} - 次のアクション（Phase 6 or AI追加質問）
 */
export const checkCompletenessAndDecideNext = async (answers, placeData) => {
  try {
    // 完成度を分析
    const analysisResult = await analyzeCompleteness(answers, placeData);

    if (!analysisResult.success) {
      throw new Error(analysisResult.error);
    }

    const { analysis } = analysisResult;

    console.log(`[AI Analysis] Overall completeness: ${analysis.overall}%`);

    // 完成度が90%以上ならPhase 6へ
    if (analysis.overall >= 90) {
      return {
        action: 'proceed_to_phase6',
        completeness: analysis.overall,
        message: `素晴らしいです！回答内容の完成度は${analysis.overall}%です。\n最後に、文章スタイルの確認に進みます。`
      };
    }

    // 完成度が90%未満ならAI追加質問を生成
    const questionResult = await generateFollowUpQuestion(
      analysis.priority_gaps,
      answers,
      placeData
    );

    if (!questionResult.success) {
      throw new Error(questionResult.error);
    }

    return {
      action: 'ai_follow_up',
      completeness: analysis.overall,
      question: questionResult.question,
      gaps: analysis.priority_gaps,
      message: `現在の完成度は${analysis.overall}%です。\nより充実した申請書にするため、追加で質問させてください。`
    };
  } catch (error) {
    console.error('[AI Analysis] Error in checkCompletenessAndDecideNext:', error);

    // エラーが発生した場合はPhase 6に進む（フォールバック）
    return {
      action: 'proceed_to_phase6',
      completeness: null,
      message: '分析中にエラーが発生しましたが、次のステップに進みます。',
      error: error.message
    };
  }
};
