/**
 * Gemini 3.0 Pro 動的質問生成サービス
 *
 * Phase 1の回答に基づいて、業種別の最適な質問を動的に生成
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase Functions初期化（asia-northeast1リージョン）
const functions = getFunctions(undefined, 'asia-northeast1');

/**
 * 動的質問を生成
 * @param {Object} phase1Answers - Phase 1の回答データ
 * @param {string} targetPhase - 質問を生成する対象フェーズ
 * @returns {Promise<Object>} 生成された質問リスト
 */
export async function generateDynamicQuestions(phase1Answers, targetPhase = 'customerNeeds') {
  try {
    console.log('[dynamicQuestionService] Generating questions for phase:', targetPhase);

    const generateQuestions = httpsCallable(functions, 'generateDynamicQuestions');
    const result = await generateQuestions({
      phase1Answers,
      targetPhase
    });

    console.log('[dynamicQuestionService] Generated questions:', result.data);

    return result.data;
  } catch (error) {
    console.error('[dynamicQuestionService] generateDynamicQuestions error:', error);

    // エラー時はフォールバック質問を返す
    return {
      success: false,
      error: error.message,
      questions: getFallbackQuestions(targetPhase)
    };
  }
}

/**
 * フォローアップ質問を生成
 * @param {string} questionId - 元の質問ID
 * @param {any} answer - ユーザーの回答
 * @param {string} questionText - 元の質問文
 * @param {Object} allAnswers - これまでの全回答
 * @returns {Promise<Object>} フォローアップ質問
 */
export async function generateFollowUp(questionId, answer, questionText, allAnswers) {
  try {
    const generateFollowUpDynamic = httpsCallable(functions, 'generateFollowUpDynamic');
    const result = await generateFollowUpDynamic({
      questionId,
      answer,
      questionText,
      allAnswers
    });

    return result.data;
  } catch (error) {
    console.error('[dynamicQuestionService] generateFollowUp error:', error);
    return { success: false, followUpNeeded: false };
  }
}

/**
 * フォールバック質問（API失敗時）
 * @param {string} targetPhase - フェーズ名
 * @returns {Array} デフォルト質問リスト
 */
function getFallbackQuestions(targetPhase) {
  const fallbackQuestions = {
    customerNeeds: [
      {
        id: 'FB-customerNeeds-1',
        text: '主なターゲット顧客層を教えてください',
        type: 'multi_select',
        options: [
          '10-20代',
          '30-40代',
          '50-60代',
          '70代以上',
          '男性が多い',
          '女性が多い',
          '家族連れ',
          '観光客'
        ],
        priority: 'high',
        helpText: 'メインの顧客層を選択してください（複数選択可）'
      },
      {
        id: 'FB-customerNeeds-2',
        text: 'お客様が最も重視していると思うことは何ですか？',
        type: 'multi_select',
        options: [
          '価格の安さ',
          '品質の良さ',
          'サービスの良さ',
          '立地・アクセス',
          '雰囲気・清潔感',
          '専門性・技術力',
          '対応の早さ',
          'その他'
        ],
        priority: 'high',
        helpText: '顧客ニーズの分析に使用します'
      },
      {
        id: 'FB-customerNeeds-3',
        text: '最近の顧客ニーズの変化を感じますか？',
        type: 'single_select',
        options: [
          '大きく変化している',
          'やや変化している',
          'あまり変化していない',
          'わからない'
        ],
        priority: 'medium',
        helpText: '市場動向の分析に使用します'
      }
    ],
    strengths: [
      {
        id: 'FB-strengths-1',
        text: '競合他社と比較した際の強みは何ですか？',
        type: 'multi_select',
        options: [
          '価格競争力',
          '品質・技術力',
          '専門性・資格',
          'サービス対応',
          '立地条件',
          'ブランド力・知名度',
          '独自商品・サービス',
          '顧客との関係性'
        ],
        priority: 'high',
        helpText: '自社の強みを選択してください（複数選択可）'
      },
      {
        id: 'FB-strengths-2',
        text: 'お客様に最も評価されている点は何ですか？',
        type: 'textarea',
        placeholder: '例：丁寧な接客、高品質な商品、豊富な品揃えなど',
        priority: 'high',
        helpText: '顧客からの評価を具体的に記載してください'
      }
    ],
    managementPlan: [
      {
        id: 'FB-managementPlan-1',
        text: '今後1-3年の経営目標は何ですか？',
        type: 'multi_select',
        options: [
          '売上増加',
          '利益率改善',
          '新規顧客獲得',
          'リピート率向上',
          '新商品・サービス開発',
          '業務効率化',
          '人材採用・育成',
          '設備投資'
        ],
        priority: 'high',
        helpText: '主要な経営目標を選択してください（複数選択可）'
      },
      {
        id: 'FB-managementPlan-2',
        text: '売上目標（年間）を教えてください',
        type: 'number',
        placeholder: '例：1500',
        suffix: '万円',
        priority: 'high',
        helpText: '今後達成したい年間売上目標'
      }
    ],
    subsidyPlan: [
      {
        id: 'FB-subsidyPlan-1',
        text: '補助金で導入したいものは何ですか？',
        type: 'multi_select',
        options: [
          'ウェブサイト制作・改修',
          'ECサイト構築',
          '広告・チラシ',
          '機械・設備',
          'システム・ソフトウェア',
          '展示会出展',
          '外注・委託',
          'その他'
        ],
        priority: 'high',
        helpText: '補助金の使い道を選択してください（複数選択可）'
      },
      {
        id: 'FB-subsidyPlan-2',
        text: '補助事業の実施予定時期を教えてください',
        type: 'single_select',
        options: [
          '採択後すぐに開始',
          '1-2ヶ月後に開始',
          '3-6ヶ月後に開始',
          '具体的な時期は未定'
        ],
        priority: 'medium',
        helpText: '実施スケジュールの計画に使用します'
      }
    ]
  };

  return fallbackQuestions[targetPhase] || fallbackQuestions.customerNeeds;
}

/**
 * 質問をフェーズ名から様式2セクションにマッピング
 * @param {string} phaseName - フェーズ名
 * @returns {string} 対応するセクション名
 */
export function mapPhaseToSection(phaseName) {
  const mapping = {
    2: 'customerNeeds',
    3: 'strengths',
    4: 'managementPlan',
    5: 'subsidyPlan',
    'customerNeeds': 'customerNeeds',
    'strengths': 'strengths',
    'managementPlan': 'managementPlan',
    'subsidyPlan': 'subsidyPlan'
  };

  return mapping[phaseName] || 'customerNeeds';
}

/**
 * 動的質問と静的質問をマージ
 * @param {Array} staticQuestions - 定義済みの静的質問
 * @param {Array} dynamicQuestions - Gemini 3.0が生成した動的質問
 * @returns {Array} マージされた質問リスト
 */
export function mergeQuestions(staticQuestions, dynamicQuestions) {
  // 重複排除（質問のtextで比較）
  const staticTexts = new Set(staticQuestions.map(q => q.text.toLowerCase()));

  const uniqueDynamicQuestions = dynamicQuestions.filter(
    dq => !staticTexts.has(dq.text.toLowerCase())
  );

  // 優先度でソート（high > medium > low）
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const merged = [...staticQuestions, ...uniqueDynamicQuestions];

  return merged.sort((a, b) => {
    const aOrder = priorityOrder[a.priority] ?? 2;
    const bOrder = priorityOrder[b.priority] ?? 2;
    return aOrder - bOrder;
  });
}

export default {
  generateDynamicQuestions,
  generateFollowUp,
  mapPhaseToSection,
  mergeQuestions
};
