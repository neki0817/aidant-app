/**
 * Phase 2 会話形式質問生成サービス
 *
 * OpenAI APIを使って業種に応じた会話形式の質問を動的に生成
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(undefined, 'asia-northeast1');

/**
 * データ項目の定義
 */
export const PHASE2_DATA_ITEMS = [
  { id: 'target_customers', label: 'ターゲット顧客', priority: 'high' },
  { id: 'customer_composition', label: '客層の構成', priority: 'high' },
  { id: 'customer_needs', label: '顧客ニーズ', priority: 'high' },
  { id: 'market_trends', label: '市場の動向', priority: 'high' },
  { id: 'needs_changes', label: 'ニーズの変化', priority: 'medium' },
  { id: 'competitive_landscape', label: '競合状況', priority: 'medium' },
  { id: 'seasonal_patterns', label: '季節変動', priority: 'low' },
  { id: 'untapped_areas', label: '未開拓市場', priority: 'low' },
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
    console.log(`[generateConversationalQuestions] Business: ${businessType}, DataItem: ${dataItemId}`);

    const generateFunc = httpsCallable(functions, 'generatePhase2ConversationalQuestions');

    const result = await generateFunc({
      businessType,
      dataItemId,
      dataItemLabel,
      collectedData
    });

    const questions = result.data.questions || [];

    console.log(`[generateConversationalQuestions] Generated ${questions.length} questions`);

    return questions;
  } catch (error) {
    console.error('[generateConversationalQuestions] Error:', error);
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
    console.log(`[consolidateConversationAnswers] DataItem: ${dataItemId}`);

    const consolidateFunc = httpsCallable(functions, 'consolidatePhase2Answers');

    const result = await consolidateFunc({
      businessType,
      dataItemId,
      dataItemLabel,
      conversationAnswers
    });

    const consolidatedText = result.data.consolidatedText || '';

    console.log(`[consolidateConversationAnswers] Success: ${consolidatedText.substring(0, 50)}...`);

    return consolidatedText;
  } catch (error) {
    console.error('[consolidateConversationAnswers] Error:', error);
    throw error;
  }
};

/**
 * Phase 2の会話状態を管理するクラス
 */
export class ConversationalPhase2Manager {
  constructor(businessType, allAnswers = {}) {
    this.businessType = businessType;
    this.allAnswers = allAnswers;
    this.currentDataItemIndex = 0;
    this.currentQuestions = [];
    this.currentQuestionIndex = 0;
    this.conversationAnswers = {};
    this.isAwaitingConfirmation = false;
    this.consolidatedText = '';
  }

  /**
   * 次のデータ項目を取得
   */
  getNextDataItem() {
    // 優先度highのみを収集（mediumとlowは任意）
    const highPriorityItems = PHASE2_DATA_ITEMS.filter(item => item.priority === 'high');

    if (this.currentDataItemIndex >= highPriorityItems.length) {
      return null; // 全て完了
    }

    return highPriorityItems[this.currentDataItemIndex];
  }

  /**
   * 現在のデータ項目の会話を開始
   */
  async startDataItemConversation() {
    const dataItem = this.getNextDataItem();

    if (!dataItem) {
      return null; // Phase 2完了
    }

    console.log(`[ConversationalPhase2Manager] Starting conversation for: ${dataItem.label}`);

    // AI質問生成
    this.currentQuestions = await generateConversationalQuestions(
      this.businessType,
      dataItem.id,
      dataItem.label,
      this.allAnswers
    );

    this.currentQuestionIndex = 0;
    this.conversationAnswers = {};
    this.isAwaitingConfirmation = false;

    return this.getCurrentQuestion();
  }

  /**
   * 現在の質問を取得
   */
  getCurrentQuestion() {
    if (this.isAwaitingConfirmation) {
      // 確認質問
      return {
        id: `${this.getNextDataItem().id}-confirm`,
        text: `以下のようにまとめました。このままでよろしいですか？\n\n${this.consolidatedText}`,
        type: 'single_select',
        options: [
          { value: 'yes', label: 'はい、これで進める' },
          { value: 'no', label: '修正する' }
        ],
        isConfirmation: true
      };
    }

    if (this.currentQuestionIndex >= this.currentQuestions.length) {
      return null; // このデータ項目の会話完了
    }

    return this.currentQuestions[this.currentQuestionIndex];
  }

  /**
   * 回答を保存して次の質問へ
   */
  async saveAnswer(questionId, answer) {
    if (this.isAwaitingConfirmation) {
      // 確認への回答
      if (answer === 'yes') {
        // OKなので次のデータ項目へ
        const dataItem = this.getNextDataItem();
        this.allAnswers[`P2-${dataItem.id}`] = this.consolidatedText;
        this.allAnswers[`P2-${dataItem.id}-confirm`] = 'yes';
        this.isAwaitingConfirmation = false; // 確認フラグをリセット
        this.currentDataItemIndex++;

        console.log(`[ConversationalPhase2Manager] Confirmed ${dataItem.id}, moving to next item (index: ${this.currentDataItemIndex})`);

        return await this.startDataItemConversation();
      } else {
        // 修正モード
        this.isAwaitingConfirmation = false; // 確認フラグをリセット
        return {
          id: `${this.getNextDataItem().id}-edit`,
          text: '修正内容を入力してください',
          type: 'textarea',
          placeholder: this.consolidatedText,
          isEdit: true
        };
      }
    }

    // 通常の回答
    this.conversationAnswers[questionId] = answer;
    this.currentQuestionIndex++;

    const nextQuestion = this.getCurrentQuestion();

    if (!nextQuestion) {
      // このデータ項目の会話完了 → 統合
      await this.consolidateCurrentConversation();
      return this.getCurrentQuestion(); // 確認質問を返す
    }

    // 任意質問で「いいえ」なら会話終了
    if (nextQuestion.optional && answer === 'いいえ') {
      await this.consolidateCurrentConversation();
      return this.getCurrentQuestion(); // 確認質問を返す
    }

    return nextQuestion;
  }

  /**
   * 現在の会話を統合
   */
  async consolidateCurrentConversation() {
    const dataItem = this.getNextDataItem();

    this.consolidatedText = await consolidateConversationAnswers(
      this.businessType,
      dataItem.id,
      dataItem.label,
      this.conversationAnswers
    );

    this.isAwaitingConfirmation = true;
  }

  /**
   * 手動編集を保存
   */
  saveManualEdit(editedText) {
    const dataItem = this.getNextDataItem();
    this.allAnswers[`P2-${dataItem.id}`] = editedText;
    this.currentDataItemIndex++;
    return this.startDataItemConversation();
  }

  /**
   * Phase 2が完了したか
   */
  isComplete() {
    return this.currentDataItemIndex >= PHASE2_DATA_ITEMS.filter(item => item.priority === 'high').length;
  }
}

export default {
  generateConversationalQuestions,
  consolidateConversationAnswers,
  ConversationalPhase2Manager,
  PHASE2_DATA_ITEMS
};
