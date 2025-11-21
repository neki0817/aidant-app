/**
 * Phase 3 会話形式質問生成サービス（自社の強み）
 *
 * OpenAI APIを使って業種に応じた会話形式の質問を動的に生成
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(undefined, 'asia-northeast1');

/**
 * データ項目の定義
 */
export const PHASE3_DATA_ITEMS = [
  { id: 'product_service_strengths', label: '商品・サービスの強み', priority: 'high' },
  { id: 'customer_evaluation_reasons', label: '顧客評価の理由', priority: 'high' },
  { id: 'quality_technical_commitment', label: '品質・技術のこだわり', priority: 'high' },
  { id: 'competitive_differentiation', label: '競合との違い', priority: 'high' },
];

/**
 * 会話形式の質問を生成
 *
 * @param {string} businessType - 業種
 * @param {string} dataItemId - データ項目ID
 * @param {string} dataItemLabel - データ項目名
 * @param {Object} collectedData - 既に収集済みのデータ
 * @returns {Promise<Array>} - 生成された質問のリスト
 */
export const generateConversationalQuestions = async (businessType, dataItemId, dataItemLabel, collectedData = {}) => {
  try {
    console.log(`[Phase3 generateConversationalQuestions] Business: ${businessType}, DataItem: ${dataItemId}`);

    const generateFunc = httpsCallable(functions, 'generatePhase3ConversationalQuestions');

    const result = await generateFunc({
      businessType,
      dataItemId,
      dataItemLabel,
      collectedData
    });

    const questions = result.data.questions || [];

    console.log(`[Phase3 generateConversationalQuestions] Generated ${questions.length} questions`);

    return questions;
  } catch (error) {
    console.error('[Phase3 generateConversationalQuestions] Error:', error);
    throw error;
  }
};

/**
 * 会話の回答を統合して自然な文章にする
 *
 * @param {string} businessType - 業種
 * @param {string} dataItemId - データ項目ID
 * @param {string} dataItemLabel - データ項目名
 * @param {Object} conversationAnswers - 会話の回答
 * @returns {Promise<string>} - 統合された文章
 */
export const consolidateConversationAnswers = async (businessType, dataItemId, dataItemLabel, conversationAnswers) => {
  try {
    console.log(`[Phase3 consolidateConversationAnswers] DataItem: ${dataItemId}`);

    const consolidateFunc = httpsCallable(functions, 'consolidatePhase3Answers');

    const result = await consolidateFunc({
      businessType,
      dataItemId,
      dataItemLabel,
      conversationAnswers
    });

    const consolidatedText = result.data.consolidatedText || '';

    console.log(`[Phase3 consolidateConversationAnswers] Success: ${consolidatedText.substring(0, 50)}...`);

    return consolidatedText;
  } catch (error) {
    console.error('[Phase3 consolidateConversationAnswers] Error:', error);
    throw error;
  }
};

/**
 * Phase 3の会話状態を管理するクラス
 */
export class ConversationalPhase3Manager {
  constructor(businessType, allAnswers = {}) {
    this.businessType = businessType;
    this.allAnswers = allAnswers;
    this.currentDataItemIndex = 0;
    this.currentQuestions = [];
    this.currentQuestionIndex = 0;
    this.conversationAnswers = {}; // 会話の回答を保存
    this.isGeneratingQuestions = false;
    this.currentDataItemId = null;
  }

  /**
   * 現在の質問を取得（同期）
   */
  getCurrentQuestion() {
    if (this.currentQuestionIndex < this.currentQuestions.length) {
      return this.currentQuestions[this.currentQuestionIndex];
    }
    return null;
  }

  /**
   * 次の質問を取得（非同期）
   */
  async getNextQuestion() {
    console.log(`[Phase3Manager] getNextQuestion called. DataItemIndex: ${this.currentDataItemIndex}, QuestionIndex: ${this.currentQuestionIndex}`);

    // 現在のデータ項目の質問が残っている場合
    if (this.currentQuestionIndex < this.currentQuestions.length) {
      const question = this.currentQuestions[this.currentQuestionIndex];
      console.log(`[Phase3Manager] Returning question ${this.currentQuestionIndex + 1}/${this.currentQuestions.length}`);
      return question;
    }

    // 現在のデータ項目の質問が終わった場合、次のデータ項目へ
    if (this.currentDataItemIndex >= PHASE3_DATA_ITEMS.length) {
      console.log('[Phase3Manager] All data items completed');
      return null; // Phase 3完了
    }

    // 次のデータ項目の質問を生成
    await this.generateQuestionsForCurrentDataItem();

    if (this.currentQuestions.length === 0) {
      console.log('[Phase3Manager] No questions generated, moving to next item');
      this.currentDataItemIndex++;
      return this.getNextQuestion();
    }

    const question = this.currentQuestions[this.currentQuestionIndex];
    console.log(`[Phase3Manager] Generated new questions for data item. Returning first question.`);
    return question;
  }

  /**
   * 現在のデータ項目の質問を生成
   */
  async generateQuestionsForCurrentDataItem() {
    if (this.isGeneratingQuestions) {
      console.log('[Phase3Manager] Already generating questions, skipping');
      return;
    }

    this.isGeneratingQuestions = true;

    try {
      const dataItem = PHASE3_DATA_ITEMS[this.currentDataItemIndex];
      this.currentDataItemId = dataItem.id;

      console.log(`[Phase3Manager] Generating questions for: ${dataItem.label}`);

      const questions = await generateConversationalQuestions(
        this.businessType,
        dataItem.id,
        dataItem.label,
        this.allAnswers
      );

      this.currentQuestions = questions.map((q, idx) => ({
        ...q,
        id: `conv-p3-${dataItem.id}-${idx}`
      }));

      this.currentQuestionIndex = 0;
      this.conversationAnswers[dataItem.id] = {};

      console.log(`[Phase3Manager] Generated ${this.currentQuestions.length} questions for ${dataItem.label}`);
    } catch (error) {
      console.error('[Phase3Manager] Error generating questions:', error);
      this.currentQuestions = [];
    } finally {
      this.isGeneratingQuestions = false;
    }
  }

  /**
   * 回答を保存して次の質問へ
   */
  async saveAnswer(questionId, answer) {
    console.log(`[Phase3Manager] saveAnswer: ${questionId} = ${JSON.stringify(answer)}`);

    // 会話の回答を保存
    const dataItem = PHASE3_DATA_ITEMS[this.currentDataItemIndex];
    if (dataItem) {
      this.conversationAnswers[dataItem.id][questionId] = answer;
    }

    this.currentQuestionIndex++;

    // 現在のデータ項目の質問が全て終わった場合
    if (this.currentQuestionIndex >= this.currentQuestions.length) {
      console.log(`[Phase3Manager] Completed data item: ${dataItem.label}`);

      // 会話を統合して自然な文章にする
      await this.consolidateCurrentDataItem();

      // 次のデータ項目へ
      this.currentDataItemIndex++;
      this.currentQuestions = [];
      this.currentQuestionIndex = 0;
    }

    return this.getNextQuestion();
  }

  /**
   * 現在のデータ項目の会話を統合
   */
  async consolidateCurrentDataItem() {
    const dataItem = PHASE3_DATA_ITEMS[this.currentDataItemIndex];

    if (!dataItem) return;

    console.log(`[Phase3Manager] Consolidating answers for: ${dataItem.label}`);

    try {
      const conversationAnswers = this.conversationAnswers[dataItem.id] || {};

      const consolidatedText = await consolidateConversationAnswers(
        this.businessType,
        dataItem.id,
        dataItem.label,
        conversationAnswers
      );

      // 統合されたテキストを保存
      this.allAnswers[`P3-${dataItem.id}`] = consolidatedText;
      this.allAnswers[`P3-${dataItem.id}-confirm`] = 'yes';

      console.log(`[Phase3Manager] Consolidated text saved for ${dataItem.id}`);
    } catch (error) {
      console.error('[Phase3Manager] Error consolidating answers:', error);
    }
  }

  /**
   * Phase 3が完了したか確認
   */
  isComplete() {
    return this.currentDataItemIndex >= PHASE3_DATA_ITEMS.length &&
           this.currentQuestionIndex >= this.currentQuestions.length;
  }

  /**
   * 進捗状況を取得
   */
  getProgress() {
    return {
      current: this.currentDataItemIndex + 1,
      total: PHASE3_DATA_ITEMS.length,
      currentItem: PHASE3_DATA_ITEMS[this.currentDataItemIndex]?.label || 'Complete'
    };
  }
}

export default {
  ConversationalPhase3Manager,
  generateConversationalQuestions,
  consolidateConversationAnswers,
  PHASE3_DATA_ITEMS
};
