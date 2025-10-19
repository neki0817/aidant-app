/**
 * 完全自律AIエージェント
 *
 * ユーザーの回答を分析し、自律的に以下を実行：
 * 1. 回答の充足度チェック（11の評価ポイント）
 * 2. 深堀り質問の自動生成
 * 3. 矛盾・非現実性の検出と修正提案
 * 4. 補完情報の自動提案
 * 5. 申請書完成までの自律的なガイド
 *
 * @version 1.0.0
 * @created 2025-01-19
 */

import {
  calculateOverallCompleteness,
  generateProgressSummary,
  evaluateAnswerDepth
} from './completionTracker';

import {
  generateDeepDiveQuestion,
  detectMissingElements,
  generateImprovementSuggestion,
  getIndustryQuestions,
  getBusinessTypeDetailQuestion
} from './deepDiveEngine';

import {
  runComprehensiveValidation,
  generateValidationSummary
} from './validationEngine';

/**
 * 自律エージェントのステータス
 */
export const AGENT_STATUS = {
  ANALYZING: 'analyzing',
  DEEP_DIVING: 'deep_diving',
  VALIDATING: 'validating',
  SUGGESTING: 'suggesting',
  COMPLETE: 'complete',
  ERROR: 'error'
};

/**
 * 自律エージェントのセッション状態
 */
class AutonomousAgentSession {
  constructor() {
    this.status = AGENT_STATUS.ANALYZING;
    this.completeness = null;
    this.validationResult = null;
    this.currentDeepDive = null;
    this.deepDiveHistory = [];
    this.suggestions = [];
    this.questionCount = 0;
    this.maxQuestions = 50; // 無限ループ防止
  }

  reset() {
    this.status = AGENT_STATUS.ANALYZING;
    this.completeness = null;
    this.validationResult = null;
    this.currentDeepDive = null;
    this.deepDiveHistory = [];
    this.suggestions = [];
    this.questionCount = 0;
  }
}

// シングルトンセッション
let agentSession = new AutonomousAgentSession();

/**
 * エージェントセッションのリセット
 */
export const resetAgentSession = () => {
  agentSession.reset();
};

/**
 * 現在のセッション状態を取得
 */
export const getAgentSession = () => {
  return { ...agentSession };
};

/**
 * 回答を分析して次のアクションを決定
 * @param {String} questionId - 質問ID
 * @param {Object} question - 質問オブジェクト
 * @param {String|Array} answer - ユーザーの回答
 * @param {Object} allAnswers - 全回答データ
 * @param {Object} context - コンテキスト（placeInfo等）
 * @returns {Promise<Object>} 次のアクション
 */
export const analyzeAnswerAndDecideNextAction = async (
  questionId,
  question,
  answer,
  allAnswers,
  context = {}
) => {
  agentSession.questionCount++;

  console.log('[Autonomous Agent] Analyzing answer:', {
    questionId,
    answerLength: typeof answer === 'string' ? answer.length : 'N/A',
    questionCount: agentSession.questionCount
  });

  // 最大質問数チェック
  if (agentSession.questionCount >= agentSession.maxQuestions) {
    return {
      action: 'proceed',
      message: '十分な情報が集まりました。次のステップに進みましょう。',
      data: null
    };
  }

  // 1. 完成度を計算
  agentSession.completeness = calculateOverallCompleteness(allAnswers);
  console.log('[Autonomous Agent] Completeness:', agentSession.completeness.overallScore);

  // 2. バリデーション実行
  agentSession.validationResult = await runComprehensiveValidation(allAnswers, true);
  console.log('[Autonomous Agent] Validation:', agentSession.validationResult);

  // 3. 重大な問題がある場合は即座に指摘
  if (agentSession.validationResult.issues.critical.length > 0) {
    const criticalIssue = agentSession.validationResult.issues.critical[0];

    return {
      action: 'flag_critical_issue',
      message: `⚠️ 重大な問題を検出しました\n\n${criticalIssue.message}\n\n💡 ${criticalIssue.suggestion}`,
      data: criticalIssue,
      requiresCorrection: true
    };
  }

  // 【新機能】業種別の深堀り質問を自動挿入
  // Step 2の最後の質問（Q2-13）に回答した直後に業態確認質問を挿入
  const businessType = allAnswers['Q1-1'];

  // Step 2の最後の質問リスト（これらに回答した直後に業態確認質問を挿入）
  const step2LastQuestions = ['Q2-13', 'Q2-12']; // Q2-13が任意なので、Q2-12も含める

  // Step 2完了判定: Q2-13またはQ2-12に回答した直後
  // ただし、業態確認質問や業種別質問に回答中の場合は除外
  const isStep2LastQuestion = step2LastQuestions.includes(questionId);
  const isAnsweringDetailOrIndustryQuestion = questionId.startsWith('detail-') || questionId.startsWith('industry-');

  console.log('[Autonomous Agent] Step 2 completion check:', {
    businessType,
    questionId,
    isStep2LastQuestion,
    isAnsweringDetailOrIndustryQuestion,
    hasBusinessDetail: !!allAnswers['detail-restaurant-type'],
    hasIndustryQuestions: Object.keys(allAnswers).filter(k => k.startsWith('industry-')).length
  });

  // 業態確認質問や業種別質問に回答中の場合はスキップ
  if (businessType && isStep2LastQuestion && !isAnsweringDetailOrIndustryQuestion) {
    // Step 2-1: まず業態・特性確認質問を挿入（まだ聞いていない場合）
    const businessTypeDetailQuestion = getBusinessTypeDetailQuestion(businessType);

    if (businessTypeDetailQuestion && !allAnswers[`detail-${businessTypeDetailQuestion.id}`]) {
      console.log('[Autonomous Agent] Inserting business type detail question:', businessTypeDetailQuestion.id);

      return {
        action: 'business_detail_question',
        message: `📋 お店の特徴をもう少し詳しく教えてください。`,
        data: {
          id: `detail-${businessTypeDetailQuestion.id}`,
          text: businessTypeDetailQuestion.question,
          type: 'textarea',
          placeholder: businessTypeDetailQuestion.placeholder,
          helpText: businessTypeDetailQuestion.helpText,
          required: false,
          isBusinessDetail: true,
          googleMapsHint: businessTypeDetailQuestion.googleMapsHint
        },
        requiresAnswer: true
      };
    }

    // Step 2-2: 業態確認が完了したら、業種別質問を挿入
    const industryQuestions = getIndustryQuestions(businessType);

    if (industryQuestions.length > 0) {
      // まだ聞いていない業種別質問を探す
      const askedIndustryQuestions = Object.keys(allAnswers).filter(key =>
        key.startsWith('industry-')
      );

      const nextIndustryQuestion = industryQuestions.find(q =>
        !askedIndustryQuestions.includes(`industry-${q.id}`)
      );

      if (nextIndustryQuestion) {
        console.log('[Autonomous Agent] Inserting industry-specific question:', nextIndustryQuestion.id);

        return {
          action: 'industry_question',
          message: `📊 業種の特性に合わせた質問をさせてください。`,
          data: {
            id: `industry-${nextIndustryQuestion.id}`,
            text: nextIndustryQuestion.question,
            type: 'textarea',
            placeholder: nextIndustryQuestion.placeholder,
            helpText: nextIndustryQuestion.helpText,
            required: false,
            isIndustrySpecific: true
          },
          requiresAnswer: true
        };
      }
    }
  }

  // 4. 回答の深さを評価
  const depth = evaluateAnswerDepth(answer, question.type);
  console.log('[Autonomous Agent] Answer depth:', depth);

  // 5. 深堀りが必要か判定
  if (depth < 4 && (question.type === 'textarea' || question.type === 'text')) {
    agentSession.status = AGENT_STATUS.DEEP_DIVING;

    // 深堀り質問を生成
    const deepDiveCount = agentSession.deepDiveHistory.filter(
      h => h.parentQuestionId === questionId
    ).length;

    const deepDiveQuestion = await generateDeepDiveQuestion(
      questionId,
      question,
      answer,
      { ...context, allAnswers },
      deepDiveCount
    );

    if (deepDiveQuestion) {
      agentSession.currentDeepDive = deepDiveQuestion;
      agentSession.deepDiveHistory.push({
        parentQuestionId: questionId,
        deepDiveQuestionId: deepDiveQuestion.id,
        timestamp: new Date()
      });

      return {
        action: 'deep_dive',
        message: `回答をさらに充実させましょう。`,
        data: deepDiveQuestion,
        requiresAnswer: true
      };
    }
  }

  // 6. 改善提案を生成
  const improvementSuggestion = generateImprovementSuggestion(
    questionId,
    answer,
    { ...context, allAnswers }
  );

  if (improvementSuggestion) {
    agentSession.status = AGENT_STATUS.SUGGESTING;
    agentSession.suggestions.push({
      questionId,
      suggestion: improvementSuggestion,
      timestamp: new Date()
    });

    return {
      action: 'suggest_improvement',
      message: improvementSuggestion,
      data: null,
      optional: true
    };
  }

  // 7. 高優先度の問題を指摘
  if (agentSession.validationResult.issues.high.length > 0) {
    const highIssue = agentSession.validationResult.issues.high[0];

    return {
      action: 'flag_high_priority_issue',
      message: `🟠 改善推奨\n\n${highIssue.message}\n\n💡 ${highIssue.suggestion}`,
      data: highIssue,
      optional: false
    };
  }

  // 8. 通常の進行
  return {
    action: 'proceed',
    message: null,
    data: null
  };
};

/**
 * 進捗状況をチェックして、次に優先すべき質問を提案
 * @param {Object} allAnswers - 全回答データ
 * @param {Array} availableQuestions - 利用可能な質問ID配列
 * @returns {Object} 提案内容
 */
export const checkProgressAndSuggestNextFocus = (allAnswers, availableQuestions = []) => {
  const completeness = calculateOverallCompleteness(allAnswers);

  // 完成度が95%以上なら完了
  if (completeness.overallScore >= 95) {
    return {
      isComplete: true,
      message: '🎉 素晴らしい！申請書は完璧な状態です。',
      summary: generateProgressSummary(allAnswers)
    };
  }

  // 最優先の改善ポイントを特定
  const topGap = completeness.criticalGaps[0];

  if (!topGap) {
    return {
      isComplete: false,
      message: '順調に進んでいます。',
      summary: generateProgressSummary(allAnswers)
    };
  }

  // 不足しているフィールドの中で回答可能な質問を探す
  const nextQuestion = topGap.missingFields.find(fieldId =>
    availableQuestions.includes(fieldId)
  );

  return {
    isComplete: false,
    message: `次は「${topGap.name}」を充実させましょう。`,
    summary: generateProgressSummary(allAnswers),
    recommendedQuestion: nextQuestion,
    focusArea: topGap.name
  };
};

/**
 * 最終チェックを実行
 * @param {Object} allAnswers - 全回答データ
 * @returns {Promise<Object>} 最終チェック結果
 */
export const runFinalCheck = async (allAnswers) => {
  agentSession.status = AGENT_STATUS.VALIDATING;

  // 完成度チェック
  const completeness = calculateOverallCompleteness(allAnswers);

  // 包括的バリデーション（AI使用）
  const validationResult = await runComprehensiveValidation(allAnswers, true);

  // レポート生成
  const progressSummary = generateProgressSummary(allAnswers);
  const validationSummary = generateValidationSummary(validationResult);

  const canSubmit = validationResult.isValid && completeness.overallScore >= 80;

  let finalMessage = '【最終チェック完了】\n\n';
  finalMessage += progressSummary + '\n\n';
  finalMessage += validationSummary + '\n\n';

  if (canSubmit) {
    finalMessage += '✅ 申請書は提出可能な状態です。おめでとうございます！\n';
    agentSession.status = AGENT_STATUS.COMPLETE;
  } else {
    finalMessage += '⚠️ 提出前に改善をお勧めします。\n';
  }

  return {
    canSubmit,
    completeness,
    validationResult,
    message: finalMessage,
    recommendations: [
      ...validationResult.issues.critical,
      ...validationResult.issues.high
    ].slice(0, 5) // 上位5件の推奨改善
  };
};

/**
 * AIによる補完提案を生成
 * @param {String} questionId - 質問ID
 * @param {String} answer - ユーザーの回答
 * @param {Object} context - コンテキスト
 * @returns {Promise<Object|null>} 補完提案、または不要ならnull
 */
export const generateAutoCompletionSuggestion = async (
  questionId,
  answer,
  context = {}
) => {
  // 不足要素を検出
  const missingElements = detectMissingElements(questionId, answer, context);

  if (missingElements.length === 0) {
    return null; // 補完不要
  }

  // 深さチェック
  const depth = evaluateAnswerDepth(answer, 'textarea');

  if (depth >= 4) {
    return null; // 十分詳しい
  }

  try {
    // OpenAI APIで補完案を生成（既存のenhanceAnswer関数を利用可能）
    return {
      needsCompletion: true,
      missingElements,
      depth,
      suggestion: `以下の要素を追加すると、より説得力のある内容になります：\n${missingElements.join('\n')}`
    };
  } catch (error) {
    console.error('[Autonomous Agent] Auto-completion error:', error);
    return null;
  }
};

/**
 * エージェントの自律実行ループ（メインロジック）
 * @param {String} questionId - 現在の質問ID
 * @param {Object} question - 現在の質問オブジェクト
 * @param {String|Array} answer - ユーザーの回答
 * @param {Object} allAnswers - 全回答データ
 * @param {Object} context - コンテキスト
 * @returns {Promise<Object>} 次のアクション
 */
export const runAutonomousLoop = async (
  questionId,
  question,
  answer,
  allAnswers,
  context = {}
) => {
  console.log('[Autonomous Agent] Starting autonomous loop...');

  // 回答を分析して次のアクションを決定
  const nextAction = await analyzeAnswerAndDecideNextAction(
    questionId,
    question,
    answer,
    allAnswers,
    context
  );

  console.log('[Autonomous Agent] Next action:', nextAction.action);

  return nextAction;
};

/**
 * エージェントの統計情報を取得
 * @returns {Object} 統計情報
 */
export const getAgentStatistics = () => {
  return {
    questionCount: agentSession.questionCount,
    deepDiveCount: agentSession.deepDiveHistory.length,
    suggestionCount: agentSession.suggestions.length,
    currentStatus: agentSession.status,
    completeness: agentSession.completeness
      ? agentSession.completeness.overallScore
      : 0
  };
};
