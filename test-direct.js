/**
 * generateMockAnswer 直接テスト（ローカル実行）
 *
 * functions/index.jsの関数を直接インポートしてテスト
 */

// 環境変数を設定（OpenAI API Key）
// 実際のAPIキーは firebase functions:config:get で確認
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const admin = require('firebase-admin');

// Firebase Admin初期化（テスト用）
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

// buildMockAnswerPrompt関数をコピー
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
`;

  let answerFormat = '';

  if (questionType === 'multi_select' && options) {
    answerFormat = `
【回答形式】
この質問は複数選択式です。以下の選択肢から2-3個を選び、それぞれについて簡単に説明してください。

選択肢: ${options.join(', ')}

回答例:
「〇〇」と「△△」を選びます。
〇〇については、当店では～という理由で重視しています。
△△については、～という点で他店との差別化を図っています。
`;
  } else if (questionType === 'single_select' && options) {
    answerFormat = `
【回答形式】
この質問は単一選択式です。以下の選択肢から1つを選び、その理由を説明してください。

選択肢: ${options.join(', ')}

回答例:
「〇〇」を選びます。当店では～という理由からです。
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
4. Google Maps評価やレビュー内容と矛盾しない回答をしてください

【回答】
`;

  return prompt;
}

// テスト用店舗プロフィール
const testStoreProfile = {
  name: '珈琲館ブルーマウンテン',
  businessType: 'カフェ',
  location: '東京都渋谷区（駅徒歩5分）',
  feature: '自家焙煎コーヒーと手作りケーキ、落ち着いた雰囲気',
  customerBase: '30-40代女性、近隣オフィスワーカー、コーヒー愛好家',
  rating: 4.5,
  reviewCount: 150,
  yearsInBusiness: 3,
  monthlySales: 120,
  employees: 2
};

// テスト質問
const testQuestions = [
  {
    id: 1,
    question: 'あなたのお店に来店されるお客様は、主にどのような方ですか？年齢層、性別、職業など、できるだけ具体的に教えてください。',
    questionType: 'text',
    options: []
  },
  {
    id: 2,
    question: 'お客様は、あなたのお店で何を求めていると感じますか？',
    questionType: 'multi_select',
    options: ['美味しい料理', '雰囲気の良さ', '価格の手頃さ', '接客の良さ', '立地の便利さ', 'メニューの豊富さ', 'その他']
  },
  {
    id: 3,
    question: 'あなたのお店の強みは何ですか？他店と比べて優れている点を教えてください。',
    questionType: 'multi_select',
    options: ['料理の味', '食材の品質', '接客・サービス', '雰囲気・内装', '価格', '立地', 'メニューの独自性', 'その他']
  }
];

// テスト実行
async function runTest() {
  console.log('========================================');
  console.log('generateMockAnswer ローカルテスト');
  console.log('========================================\n');

  console.log(`店舗: ${testStoreProfile.name}`);
  console.log(`業種: ${testStoreProfile.businessType}`);
  console.log(`特徴: ${testStoreProfile.feature}\n`);

  // OpenAI API Keyチェック
  if (process.env.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
    console.error('❌ エラー: OPENAI_API_KEYが設定されていません');
    console.log('\nFirebase Functionsの環境変数を確認してください:');
    console.log('  firebase functions:config:get');
    console.log('\nまたは、このファイルの7行目を実際のAPIキーに置き換えてください。');
    process.exit(1);
  }

  for (const q of testQuestions) {
    console.log(`\n--- 質問 ${q.id} ---`);
    console.log(`タイプ: ${q.questionType}`);
    console.log(`質問文: ${q.question}`);
    if (q.options.length > 0) {
      console.log(`選択肢: ${q.options.join(', ')}`);
    }

    try {
      const prompt = buildMockAnswerPrompt(q.question, testStoreProfile, q.questionType, q.options);

      console.log('\n回答生成中...');
      const startTime = Date.now();

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
        max_tokens: 500
      });

      const answer = completion.choices[0].message.content.trim();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\n【回答】\n${answer}`);
      console.log(`\n✅ 成功 - 文字数: ${answer.length}文字 | 処理時間: ${duration}秒`);

      // API制限を考慮して1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`\n❌ エラー: ${error.message}`);
      if (error.response) {
        console.error('詳細:', error.response.data);
      }
    }
  }

  console.log('\n========================================');
  console.log('テスト完了');
  console.log('========================================');
}

// 実行
if (require.main === module) {
  runTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('\nエラーが発生しました:', error);
      process.exit(1);
    });
}
