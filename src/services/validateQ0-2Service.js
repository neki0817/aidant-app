/**
 * Q0-2回答のAI判定サービス
 * Cloud Functionを呼び出してQ0-2の回答を検証
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Q0-2の回答をAIで判定
 * @param {string} answer - ユーザーの回答
 * @param {Object} previousAnswers - Q0-0, Q0-1の回答
 * @returns {Promise<Object>} 判定結果
 */
export const validateQ0_2Answer = async (answer, previousAnswers) => {
  try {
    console.log('[validateQ0-2Service] Validating Q0-2 answer...');
    console.log('[validateQ0-2Service] Answer:', answer);
    console.log('[validateQ0-2Service] Previous answers:', previousAnswers);

    const functions = getFunctions(undefined, 'asia-northeast1');
    const validateFunction = httpsCallable(functions, 'validateQ0_2Answer');

    const result = await validateFunction({
      answer,
      previousAnswers
    });

    console.log('[validateQ0-2Service] Validation result:', result.data);

    return result.data;

  } catch (error) {
    console.error('[validateQ0-2Service] Error during validation:', error);

    // エラー時もvalidation通過扱い（ユーザー体験を損なわないため）
    return {
      success: true,
      isValid: true,
      issues: [],
      followUpQuestions: [],
      error: error.message
    };
  }
};
