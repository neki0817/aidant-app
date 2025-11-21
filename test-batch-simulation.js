/**
 * 10店舗分の大規模シミュレーション（バッチ実行）
 *
 * 全10店舗 × Phase 2-6（16問） = 160問の会話を自動生成
 */

// 環境変数を設定（OpenAI API Key）
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase Admin初期化
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'aidant-app'
  });
}

// OpenAI初期化
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 店舗プロフィールをインポート
const mockStoreProfiles = require('./functions/utils/mockStoreProfiles');

// buildMockAnswerPrompt関数
function buildMockAnswerPrompt(question, storeProfile, questionType, options) {
  const profileInfo = `
【店舗情報】
- 店舗名: ${storeProfile.name}
- 業種: ${storeProfile.businessType}
- 立地: ${storeProfile.location}
- 特徴: ${storeProfile.feature}
- 主な顧客: ${storeProfile.customerBase}
- Google Maps評価: ${storeProfile.rating}点（${storeProfile.reviewCount || 100}件のレビュー）
- 営業年数: ${storeProfile.yearsInBusiness || 3}年
- 月間売上: ${storeProfile.monthlySales ? `約${storeProfile.monthlySales}万円` : '非公開'}
- 従業員数: ${storeProfile.employees || 2}名
- 補助金の目的: ${storeProfile.subsidy_goal || '未定'}
`;

  let answerFormat = '';

  if (questionType === 'multi_select' && options) {
    answerFormat = `
【回答形式】
この質問は複数選択式です。以下の選択肢から2-3個を選び、それぞれについて簡単に説明してください。

選択肢: ${options.join(', ')}
`;
  } else if (questionType === 'single_select' && options) {
    answerFormat = `
【回答形式】
この質問は単一選択式です。以下の選択肢から1つを選び、その理由を説明してください。

選択肢: ${options.join(', ')}
`;
  } else {
    answerFormat = `
【回答形式】
具体的な数値やエピソードを含めて、2-3文で回答してください。
`;
  }

  const prompt = `
あなたは「${storeProfile.name}」の経営者です。中小企業診断士から補助金申請のためのヒアリングを受けています。

${profileInfo}

${answerFormat}

【質問】
${question}

【注意事項】
1. この店舗の経営者として、一人称（「私は」「当店では」）で回答してください
2. 具体的な数値や事例を含めて、説得力のある回答をしてください
3. 抽象的な表現（「良い」「素晴らしい」）ではなく、具体的な説明をしてください

【回答】
`;

  return prompt;
}

// 全フェーズの質問リスト
const allPhaseQuestions = {
  phase2: [
    {
      id: 'P2-1',
      question: 'あなたのお店に来店されるお客様は、主にどのような方ですか？年齢層、性別、職業など、できるだけ具体的に教えてください。',
      questionType: 'text',
      options: []
    },
    {
      id: 'P2-2',
      question: 'お客様は、あなたのお店で何を求めていると感じますか？',
      questionType: 'multi_select',
      options: ['美味しい料理', '雰囲気の良さ', '価格の手頃さ', '接客の良さ', '立地の便利さ', 'メニューの豊富さ', 'その他']
    },
    {
      id: 'P2-3',
      question: 'リピーターのお客様が再来店される理由は何だと思いますか？',
      questionType: 'text',
      options: []
    },
    {
      id: 'P2-4',
      question: '最近、あなたのお店の周辺で変化や新しいトレンドはありますか？',
      questionType: 'text',
      options: []
    }
  ],
  phase3: [
    {
      id: 'P3-1',
      question: 'あなたのお店の強みは何ですか？他店と比べて優れている点を教えてください。',
      questionType: 'multi_select',
      options: ['料理の味', '食材の品質', '接客・サービス', '雰囲気・内装', '価格', '立地', 'メニューの独自性', 'その他']
    },
    {
      id: 'P3-2',
      question: '品質や技術面で特にこだわっている点はありますか？',
      questionType: 'text',
      options: []
    },
    {
      id: 'P3-3',
      question: 'Google Mapsや食べログなどの口コミで、お客様からどのような評価を受けていますか？',
      questionType: 'text',
      options: []
    }
  ],
  phase4: [
    {
      id: 'P4-1',
      question: '今後、あなたのお店で達成したい目標は何ですか？',
      questionType: 'text',
      options: []
    },
    {
      id: 'P4-2',
      question: 'その目標を達成するために、具体的にどのようなことを行う予定ですか？',
      questionType: 'text',
      options: []
    },
    {
      id: 'P4-3',
      question: '売上目標について、具体的な数値はありますか？',
      questionType: 'text',
      options: []
    }
  ],
  phase5: [
    {
      id: 'P5-1',
      question: '補助金で購入・導入したいものは何ですか？',
      questionType: 'multi_select',
      options: ['設備・機械', '広告・チラシ', 'ウェブサイト制作', '看板', '内装工事', 'システム導入', 'その他']
    },
    {
      id: 'P5-2',
      question: 'それぞれの費用はどのくらいを想定していますか？',
      questionType: 'text',
      options: []
    },
    {
      id: 'P5-3',
      question: 'いつ頃から実施したいですか？',
      questionType: 'single_select',
      options: ['すぐに', '1ヶ月以内', '3ヶ月以内', '半年以内', '未定']
    },
    {
      id: 'P5-4',
      question: 'この取組によって、どのような効果を期待していますか？',
      questionType: 'text',
      options: []
    }
  ],
  phase6: [
    {
      id: 'P6-1',
      question: '様式2の文章スタイルについてお伺いします。どのような印象の文章がお好みですか？',
      questionType: 'single_select',
      options: ['堅実で信頼感のある文章', '情熱的でやる気が伝わる文章', '柔らかく親しみやすい文章', '簡潔で論理的な文章', 'わかりません。おまかせします']
    },
    {
      id: 'P6-2',
      question: '文章の詳細さについて、どちらがお好みですか？',
      questionType: 'single_select',
      options: ['具体的な数値やデータを多く盛り込む', 'ストーリー性を重視して、背景や想いも伝える', 'バランス良く']
    }
  ]
};

// 回答生成関数
async function generateAnswer(question, storeProfile, questionType, options) {
  const prompt = buildMockAnswerPrompt(question, storeProfile, questionType, options);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '飲食店経営者として、具体的で現実的な回答をしてください。数値や具体例を含め、説得力のある回答を心がけてください。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 400
  });

  return completion.choices[0].message.content.trim();
}

// 1店舗分のシミュレーション
async function runStoreSimulation(storeProfile, storeIndex, totalStores) {
  console.log(`\n========================================`);
  console.log(`店舗 ${storeIndex + 1}/${totalStores}: ${storeProfile.name}`);
  console.log(`業種: ${storeProfile.businessType}`);
  console.log(`========================================\n`);

  const storeAnswers = {};
  let questionCount = 0;
  let totalTime = 0;

  for (const [phaseName, questions] of Object.entries(allPhaseQuestions)) {
    console.log(`\n--- ${phaseName.toUpperCase()} ---`);

    for (const q of questions) {
      try {
        const startTime = Date.now();
        const answer = await generateAnswer(q.question, storeProfile, q.questionType, q.options);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        totalTime += parseFloat(duration);
        questionCount++;

        storeAnswers[q.id] = {
          question: q.question,
          questionType: q.questionType,
          options: q.options,
          answer: answer,
          answerLength: answer.length,
          duration: parseFloat(duration)
        };

        console.log(`✅ ${q.id} - ${answer.length}文字 (${duration}秒)`);

        // API制限を考慮して1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ ${q.id} - エラー: ${error.message}`);
        storeAnswers[q.id] = { error: error.message };
      }
    }
  }

  console.log(`\n店舗完了: ${questionCount}問 / ${totalTime.toFixed(2)}秒`);

  return {
    storeId: storeProfile.id,
    storeName: storeProfile.name,
    businessType: storeProfile.businessType,
    totalQuestions: questionCount,
    totalTime: parseFloat(totalTime.toFixed(2)),
    answers: storeAnswers
  };
}

// 大規模バッチシミュレーション
async function runBatchSimulation() {
  console.log('========================================');
  console.log('大規模シミュレーション開始');
  console.log(`全${mockStoreProfiles.length}店舗 × 16問 = ${mockStoreProfiles.length * 16}問`);
  console.log('========================================\n');

  const startTime = Date.now();
  const allResults = [];

  for (let i = 0; i < mockStoreProfiles.length; i++) {
    const storeProfile = mockStoreProfiles[i];

    try {
      const result = await runStoreSimulation(storeProfile, i, mockStoreProfiles.length);
      allResults.push(result);

      // 店舗間で2秒待機
      if (i < mockStoreProfiles.length - 1) {
        console.log('\n次の店舗まで2秒待機...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`\n店舗 ${i + 1} でエラー: ${error.message}`);
      allResults.push({
        storeId: storeProfile.id,
        storeName: storeProfile.name,
        businessType: storeProfile.businessType,
        error: error.message
      });
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // 結果サマリー
  console.log(`\n========================================`);
  console.log(`大規模シミュレーション完了`);
  console.log(`========================================`);
  console.log(`総店舗数: ${allResults.length}店舗`);
  console.log(`成功: ${allResults.filter(r => !r.error).length}店舗`);
  console.log(`失敗: ${allResults.filter(r => r.error).length}店舗`);
  console.log(`総処理時間: ${totalTime}秒 (${(totalTime / 60).toFixed(2)}分)`);

  const totalQuestions = allResults.reduce((sum, r) => sum + (r.totalQuestions || 0), 0);
  console.log(`総質問数: ${totalQuestions}問`);
  console.log(`平均処理時間: ${(totalTime / totalQuestions).toFixed(2)}秒/問`);

  // 結果をJSONファイルに保存
  const resultsDir = path.join(__dirname, 'simulation_results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsPath = path.join(resultsDir, `batch_simulation_${timestamp}.json`);

  fs.writeFileSync(resultsPath, JSON.stringify({
    metadata: {
      totalStores: allResults.length,
      totalQuestions: totalQuestions,
      totalTime: parseFloat(totalTime),
      averageTimePerQuestion: parseFloat((totalTime / totalQuestions).toFixed(2)),
      timestamp: new Date().toISOString()
    },
    results: allResults
  }, null, 2));

  console.log(`\n結果を保存: ${resultsPath}`);

  return allResults;
}

// 実行
if (require.main === module) {
  runBatchSimulation()
    .then(() => {
      console.log('\n全処理が完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nエラーが発生しました:', error);
      process.exit(1);
    });
}
