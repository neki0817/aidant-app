/**
 * Phase 2-6の質問フローを管理するヘルパー関数
 */

import { conversationalQuestionsPhase2 } from './conversationalQuestionsPhase2';
import { conversationalQuestionsPhase3 } from './conversationalQuestionsPhase3';
import { conversationalQuestionsPhase4 } from './conversationalQuestionsPhase4';
import { conversationalQuestionsPhase5 } from './conversationalQuestionsPhase5';
import { conversationalQuestionsPhase6 } from './conversationalQuestionsPhase6';
import { generateFollowUpQuestions, isFollowUpQuestion, getOriginalQuestionId } from './followUpQuestions';
import { generateNextPhase2Question } from './aiQuestionGeneratorPhase2';
import { isSectionComplete } from './form2Requirements';

/**
 * Phaseに対応する質問配列を取得
 */
export const getPhaseQuestions = (phase) => {
  const phaseMap = {
    2: conversationalQuestionsPhase2,
    3: conversationalQuestionsPhase3,
    4: conversationalQuestionsPhase4,
    5: conversationalQuestionsPhase5,
    6: conversationalQuestionsPhase6
  };

  return phaseMap[phase] || [];
};

/**
 * Phaseの次の未回答質問を取得
 */
export const getNextPhaseQuestion = (phase, answers) => {
  const questions = getPhaseQuestions(phase);

  // 未回答の必須質問を優先して取得
  const requiredQuestions = questions.filter(q => q.validation?.required);
  const unansweredRequired = requiredQuestions.find(q => !answers[q.id]);

  if (unansweredRequired) {
    return unansweredRequired;
  }

  // 必須質問が全て回答済みなら、任意質問を取得
  const unansweredOptional = questions.find(q => !answers[q.id]);
  return unansweredOptional || null;
};

/**
 * Phaseの最初の質問を取得
 */
export const getFirstPhaseQuestion = (phase) => {
  const questions = getPhaseQuestions(phase);
  return questions.length > 0 ? questions[0] : null;
};

/**
 * Phaseが完了しているかチェック
 */
export const isPhaseComplete = (phase, answers) => {
  // Phase 2はAI自律質問生成を使用（様式2の要件チェック）
  if (phase === 2) {
    return isSectionComplete('section2', answers);
  }

  // Phase 3-6は従来の固定質問チェック
  const questions = getPhaseQuestions(phase);

  // 必須質問（validation.required: true）が全て回答されているかチェック
  const requiredQuestions = questions.filter(q => q.validation?.required);

  if (requiredQuestions.length === 0) {
    // 必須質問が定義されていない場合は、全質問の回答を必須とする
    return questions.every(q => answers[q.id]);
  }

  // 全ての必須質問が回答されていることを確認
  const allRequiredAnswered = requiredQuestions.every(q => {
    const answer = answers[q.id];

    // 回答が存在しない
    if (!answer) return false;

    // 文字列の場合、空文字列でないことを確認
    if (typeof answer === 'string' && answer.trim() === '') return false;

    // 配列の場合、空配列でないことを確認
    if (Array.isArray(answer) && answer.length === 0) return false;

    return true;
  });

  return allRequiredAnswered;
};

/**
 * 現在のPhase番号を取得（Step 1完了後はPhase 2から開始）
 */
export const getCurrentPhase = (currentStep) => {
  // Step 1 = Phase 1（申請資格チェック）
  // Step 2以降 = Phase 2-5
  if (currentStep === 1) {
    return 1;
  } else if (currentStep >= 2 && currentStep <= 5) {
    return currentStep; // Step 2 → Phase 2, Step 3 → Phase 3, etc.
  }
  return null;
};

/**
 * Phaseの表示名を取得
 */
export const getPhaseName = (phase) => {
  const phaseNames = {
    1: '申請資格確認',
    2: '市場・顧客分析',
    3: '自社の強み分析',
    4: '経営方針・目標設定',
    5: '補助事業の具体的内容',
    6: '文章スタイル確認'
  };

  return phaseNames[phase] || `Phase ${phase}`;
};

/**
 * 全Phase（2-5）が完了しているかチェック
 */
export const areAllPhasesComplete = (answers) => {
  return [2, 3, 4, 5].every(phase => isPhaseComplete(phase, answers));
};

/**
 * Phase 6を含む全Phase（2-6）が完了しているかチェック
 */
export const areAllPhasesCompleteWithStyle = (answers) => {
  return [2, 3, 4, 5, 6].every(phase => isPhaseComplete(phase, answers));
};

/**
 * 深堀り質問機能をエクスポート
 */
export { generateFollowUpQuestions, isFollowUpQuestion, getOriginalQuestionId };

/**
 * AI質問生成機能をエクスポート（Phase 2用）
 */
export { generateNextPhase2Question };
