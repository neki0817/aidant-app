/**
 * AI vs AI 会話シミュレーター
 *
 * 中小企業診断士AI（質問側）と飲食店経営者AI（回答側）の会話を自動生成
 */

const admin = require('firebase-admin');
const mockStoreProfiles = require('./mockStoreProfiles');

/**
 * 会話シミュレーションを実行
 * @param {Object} options - シミュレーションオプション
 * @param {string} options.storeId - 店舗ID（指定しない場合はランダム）
 * @param {string} options.phase - フェーズ（'phase2' or 'phase3'）
 * @param {number} options.maxQuestions - 最大質問数（デフォルト: 5）
 * @returns {Promise<Object>} - シミュレーション結果
 */
async function runConversationSimulation(options = {}) {
  const {
    storeId = null,
    phase = 'phase2',
    maxQuestions = 5
  } = options;

  // 店舗プロフィール選択
  const storeProfile = storeId
    ? mockStoreProfiles.find(s => s.id === storeId)
    : mockStoreProfiles[Math.floor(Math.random() * mockStoreProfiles.length)];

  if (!storeProfile) {
    throw new Error('Store profile not found');
  }

  console.log(`\n========================================`);
  console.log(`会話シミュレーション開始`);
  console.log(`店舗: ${storeProfile.name} (${storeProfile.businessType})`);
  console.log(`フェーズ: ${phase}`);
  console.log(`========================================\n`);

  // Firestore参照
  const db = admin.firestore();

  // 会話履歴を保存するドキュメント作成
  const simulationId = `sim_${storeProfile.id}_${phase}_${Date.now()}`;
  const conversationRef = db.collection('conversation_simulations').doc(simulationId);

  await conversationRef.set({
    storeProfile: storeProfile,
    phase: phase,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'running'
  });

  const conversation = [];
  let questionCount = 0;

  // Phase 1のデータを模擬的に作成（質問生成に必要）
  const mockPhase1Data = createMockPhase1Data(storeProfile);

  try {
    while (questionCount < maxQuestions) {
      console.log(`\n--- 質問 ${questionCount + 1} ---`);

      // 1. 質問生成（中小企業診断士AI）
      const questionResult = await generateQuestion(phase, mockPhase1Data, conversation, storeProfile);

      if (!questionResult || questionResult.isComplete) {
        console.log('全ての質問が完了しました');
        break;
      }

      const { question, questionId, questionType, options } = questionResult;

      console.log(`質問ID: ${questionId}`);
      console.log(`質問タイプ: ${questionType}`);
      console.log(`質問文: ${question}`);
      if (options && options.length > 0) {
        console.log(`選択肢: ${options.join(', ')}`);
      }

      // 2. 回答生成（飲食店経営者AI）
      const answer = await generateAnswer(question, storeProfile, questionType, options);

      console.log(`回答: ${answer}`);

      // 3. 会話履歴に追加
      const conversationEntry = {
        questionId,
        question,
        questionType,
        options: options || [],
        answer,
        timestamp: new Date().toISOString()
      };

      conversation.push(conversationEntry);

      // 4. Firestoreに保存
      await conversationRef.collection('messages').add(conversationEntry);

      questionCount++;
    }

    // シミュレーション完了
    await conversationRef.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalQuestions: questionCount
    });

    console.log(`\n========================================`);
    console.log(`会話シミュレーション完了`);
    console.log(`合計質問数: ${questionCount}`);
    console.log(`========================================\n`);

    return {
      simulationId,
      storeProfile: storeProfile.name,
      phase,
      totalQuestions: questionCount,
      conversation
    };

  } catch (error) {
    console.error('シミュレーションエラー:', error);

    await conversationRef.update({
      status: 'error',
      error: error.message,
      erroredAt: admin.firestore.FieldValue.serverTimestamp()
    });

    throw error;
  }
}

/**
 * Phase 1の模擬データを作成
 */
function createMockPhase1Data(storeProfile) {
  return {
    'Q1-0': {
      name: storeProfile.name,
      formatted_address: storeProfile.location,
      rating: storeProfile.rating,
      user_ratings_total: storeProfile.reviewCount,
      types: [storeProfile.businessType]
    },
    'Q1-1': storeProfile.businessType,
    'Q1-5-fiscal': '3月',
    'Q1-7': storeProfile.subsidy_goal,
    'Q1-8': storeProfile.annualSales.toString(),
    'Q1-9': storeProfile.annualProfit.toString(),
    'Q1-10': storeProfile.monthlySales.toString(),
    'Q1-11': '1500', // 仮の客単価
    'Q1-12': '25' // 仮の営業日数
  };
}

/**
 * 質問を生成（中小企業診断士AI）
 *
 * 注意: この関数は generatePhase2ConversationalQuestions または
 * generatePhase3ConversationalQuestions の呼び出しをシミュレートします。
 * 実際の実装では Cloud Functions を呼び出す必要があります。
 */
async function generateQuestion(phase, phase1Data, previousConversation, storeProfile) {
  // ここでは簡略化のため、事前定義された質問リストを返す
  // 実際の実装では Cloud Functions を呼び出す

  const phase2Questions = [
    {
      questionId: 'P2-target_customers',
      question: 'あなたのお店に来店されるお客様は、主にどのような方ですか？年齢層、性別、職業など、できるだけ具体的に教えてください。',
      questionType: 'text',
      options: []
    },
    {
      questionId: 'P2-customer_needs',
      question: 'お客様は、あなたのお店で何を求めていると感じますか？',
      questionType: 'multi_select',
      options: ['美味しい料理', '雰囲気の良さ', '価格の手頃さ', '接客の良さ', '立地の便利さ', 'メニューの豊富さ', 'その他']
    },
    {
      questionId: 'P2-repeat_reasons',
      question: 'リピーターのお客様が再来店される理由は何だと思いますか？',
      questionType: 'text',
      options: []
    },
    {
      questionId: 'P2-market_trends',
      question: '最近、あなたのお店の周辺で変化や新しいトレンドはありますか？',
      questionType: 'text',
      options: []
    },
    {
      questionId: 'P2-customer_feedback',
      question: 'お客様からよく聞く感想や要望はありますか？',
      questionType: 'text',
      options: []
    }
  ];

  const phase3Questions = [
    {
      questionId: 'P3-unique_strengths',
      question: 'あなたのお店の強みは何ですか？他店と比べて優れている点を教えてください。',
      questionType: 'multi_select',
      options: ['料理の味', '食材の品質', '接客・サービス', '雰囲気・内装', '価格', '立地', 'メニューの独自性', 'その他']
    },
    {
      questionId: 'P3-quality_commitment',
      question: '品質や技術面で特にこだわっている点はありますか？',
      questionType: 'text',
      options: []
    },
    {
      questionId: 'P3-customer_reviews',
      question: 'Google Mapsや食べログなどの口コミで、お客様からどのような評価を受けていますか？',
      questionType: 'text',
      options: []
    },
    {
      questionId: 'P3-competitive_advantage',
      question: '競合他店との違いや差別化ポイントは何ですか？',
      questionType: 'text',
      options: []
    }
  ];

  const questions = phase === 'phase2' ? phase2Questions : phase3Questions;

  // 既に回答済みの質問を除外
  const answeredQuestionIds = previousConversation.map(c => c.questionId);
  const unansweredQuestions = questions.filter(q => !answeredQuestionIds.includes(q.questionId));

  if (unansweredQuestions.length === 0) {
    return { isComplete: true };
  }

  return unansweredQuestions[0];
}

/**
 * 回答を生成（飲食店経営者AI）
 *
 * 注意: この関数は generateMockAnswer Cloud Function を呼び出す必要があります。
 * ここでは簡略化のため、プロフィールに基づいた固定回答を返します。
 */
async function generateAnswer(question, storeProfile, questionType, options) {
  // 実際の実装では generateMockAnswer Cloud Function を呼び出す
  // ここでは簡略化のため、店舗プロフィールに基づいた仮の回答を生成

  // questionType に応じた回答形式
  if (questionType === 'multi_select' && options) {
    // 2-3個の選択肢を選ぶ
    const selectedOptions = options.slice(0, 2);
    return `「${selectedOptions.join('」と「')}」を選びます。${storeProfile.feature}という点で、これらを重視しています。`;
  } else if (questionType === 'single_select' && options) {
    // 1個の選択肢を選ぶ
    const selectedOption = options[0];
    return `「${selectedOption}」を選びます。当店では${storeProfile.feature}という理由からです。`;
  } else {
    // テキスト回答
    if (question.includes('お客様')) {
      return `当店のお客様は${storeProfile.customerBase}が中心です。${storeProfile.feature}という点が評価されていると感じています。`;
    } else if (question.includes('強み')) {
      return `当店の強みは${storeProfile.strengths[0]}です。特に${storeProfile.feature}という点で他店と差別化できていると考えています。`;
    } else if (question.includes('課題') || question.includes('変化')) {
      return `最近の課題としては、${storeProfile.challenges[0]}という点があります。`;
    } else {
      return `${storeProfile.feature}という点が当店の特徴です。Google Maps評価は${storeProfile.rating}点をいただいており、お客様からも高く評価されています。`;
    }
  }
}

/**
 * 複数店舗・複数フェーズのシミュレーションを一括実行
 */
async function runBatchSimulations(options = {}) {
  const {
    storeIds = null, // 指定しない場合は全店舗
    phases = ['phase2', 'phase3'],
    maxQuestions = 5
  } = options;

  const targetStores = storeIds
    ? mockStoreProfiles.filter(s => storeIds.includes(s.id))
    : mockStoreProfiles;

  const results = [];

  for (const store of targetStores) {
    for (const phase of phases) {
      console.log(`\n店舗: ${store.name}, フェーズ: ${phase}`);

      try {
        const result = await runConversationSimulation({
          storeId: store.id,
          phase,
          maxQuestions
        });

        results.push(result);

        // API制限を考慮して1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`エラー: ${store.name} - ${phase}`, error);
        results.push({
          storeId: store.id,
          storeName: store.name,
          phase,
          error: error.message
        });
      }
    }
  }

  console.log(`\n全シミュレーション完了: ${results.length}件`);

  return results;
}

module.exports = {
  runConversationSimulation,
  runBatchSimulations
};
