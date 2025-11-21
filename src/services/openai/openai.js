/**
 * OpenAI API呼び出し（Cloud Functions経由）
 * セキュリティ対策: APIキーはサーバーサイドで管理
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

/**
 * ユーザーの簡潔な回答を補完して詳細な文章にする
 * @param {string} questionId - 質問ID
 * @param {string} questionText - 質問文
 * @param {string} userAnswer - ユーザーの回答
 * @param {Object} context - 店舗情報などのコンテキスト
 * @returns {Promise<string>} 補完された回答
 */
export const enhanceAnswer = async (questionId, questionText, userAnswer, context = {}) => {
  try {
    console.log('[enhanceAnswer] Called with:', {
      questionId,
      answerType: typeof userAnswer,
      answerLength: typeof userAnswer === 'string' ? userAnswer.length : 'N/A',
      answer: typeof userAnswer === 'string' ? userAnswer.substring(0, 50) : JSON.stringify(userAnswer)
    });

    // 配列や選択肢の場合は補完不要
    if (Array.isArray(userAnswer)) {
      console.log('[enhanceAnswer] Skipped - array answer');
      return null;
    }

    // 数値や短い文字列の場合は補完不要
    if (typeof userAnswer === 'number') {
      console.log('[enhanceAnswer] Skipped - number answer');
      return null;
    }

    if (typeof userAnswer === 'string' && userAnswer.length < 10) {
      console.log('[enhanceAnswer] Skipped - too short');
      return null;
    }

    // Cloud Functionsを呼び出し
    const generateAnswerDraftFunc = httpsCallable(functions, 'generateAnswerDraft');
    const result = await generateAnswerDraftFunc({
      questionText,
      userInput: userAnswer,
      context
    });

    console.log('[enhanceAnswer] Success:', result.data);
    return result.data.enhancedAnswer;

  } catch (error) {
    console.error('[enhanceAnswer] Error:', error);

    // エラーハンドリング
    if (error.code === 'unauthenticated') {
      throw new Error('ログインが必要です');
    } else if (error.code === 'failed-precondition') {
      throw new Error('ポイント残高が不足しています');
    } else if (error.code === 'resource-exhausted') {
      throw new Error(error.message);
    }

    // その他のエラーは補完なしで続行
    console.warn('[enhanceAnswer] Continuing without enhancement');
    return null;
  }
};

/**
 * AI Draftを生成（簡易版）
 * @param {string} questionText - 質問文
 * @param {string} userInput - ユーザーの入力
 * @param {Object} allAnswers - 全回答
 * @returns {Promise<string>} 生成されたDraft
 */
export const generateAnswerDraft = async (questionText, userInput, allAnswers = {}) => {
  try {
    console.log('[generateAnswerDraft] Generating draft for:', questionText);

    // Cloud Functionsを呼び出し
    const generateAnswerDraftFunc = httpsCallable(functions, 'generateAnswerDraft');
    const result = await generateAnswerDraftFunc({
      questionText,
      userInput,
      context: allAnswers
    });

    console.log('[generateAnswerDraft] Success');
    return result.data.enhancedAnswer;

  } catch (error) {
    console.error('[generateAnswerDraft] Error:', error);
    throw error;
  }
};

/**
 * 様式2（経営計画書兼補助事業計画書）を生成
 * @param {Object} answers - 全質問の回答
 * @returns {Promise<string>} 生成されたMarkdownテキスト
 */
export const generateSubsidyApplication = async (answers) => {
  try {
    console.log('[generateSubsidyApplication] Generating application...');

    // Cloud Functionsを呼び出し
    const generateFunc = httpsCallable(functions, 'generateSubsidyApplication');
    const result = await generateFunc({ answers });

    console.log('[generateSubsidyApplication] Success');
    console.log('Points used:', result.data.pointsUsed);
    console.log('Remaining points:', result.data.remainingPoints);

    return result.data.generatedText;

  } catch (error) {
    console.error('[generateSubsidyApplication] Error:', error);

    // エラーハンドリング
    if (error.code === 'unauthenticated') {
      throw new Error('ログインが必要です');
    } else if (error.code === 'failed-precondition') {
      throw new Error('ポイント残高が不足しています。申請書生成には100ポイント必要です。');
    } else if (error.code === 'resource-exhausted') {
      throw new Error(error.message);
    } else if (error.code === 'not-found') {
      throw new Error('ユーザー情報が見つかりません');
    }

    throw new Error('申請書の生成に失敗しました。もう一度お試しください。');
  }
};

export default { enhanceAnswer, generateAnswerDraft, generateSubsidyApplication };
