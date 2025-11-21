/**
 * generateMockAnswer Cloud Functionの簡易テストスクリプト
 *
 * Firebase Admin SDK不要で、直接HTTPSリクエストでテスト
 */

const https = require('https');

// テスト用の店舗プロフィール
const testStoreProfile = {
  id: 'cafe_bluemountain',
  name: '珈琲館ブルーマウンテン',
  businessType: 'カフェ',
  location: '東京都渋谷区（駅徒歩5分）',
  feature: '自家焙煎コーヒーと手作りケーキ、落ち着いた雰囲気',
  customerBase: '30-40代女性、近隣オフィスワーカー、コーヒー愛好家',
  rating: 4.5,
  reviewCount: 150,
  yearsInBusiness: 3,
  monthlySales: 120,
  annualSales: 1440,
  annualProfit: 240,
  employees: 2,
  subsidy_goal: 'オンライン販売サイト構築と焙煎機の増強'
};

// テスト用の質問リスト
const testQuestions = [
  {
    question: 'あなたのお店に来店されるお客様は、主にどのような方ですか？年齢層、性別、職業など、できるだけ具体的に教えてください。',
    questionType: 'text',
    options: []
  },
  {
    question: 'お客様は、あなたのお店で何を求めていると感じますか？',
    questionType: 'multi_select',
    options: ['美味しい料理', '雰囲気の良さ', '価格の手頃さ', '接客の良さ', '立地の便利さ', 'メニューの豊富さ', 'その他']
  },
  {
    question: 'あなたのお店の強みは何ですか？他店と比べて優れている点を教えてください。',
    questionType: 'multi_select',
    options: ['料理の味', '食材の品質', '接客・サービス', '雰囲気・内装', '価格', '立地', 'メニューの独自性', 'その他']
  }
];

/**
 * Cloud Functionを呼び出す（簡易版）
 *
 * 注意: 実際のCloud Functions呼び出しにはFirebase SDKが必要
 * このスクリプトはローカルエミュレーターまたは直接HTTPSエンドポイント呼び出し用
 */
async function callGenerateMockAnswer(question, questionType, options) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      data: {
        question,
        storeProfile: testStoreProfile,
        questionType,
        options
      }
    });

    const options_req = {
      hostname: 'asia-northeast1-aidant-app.cloudfunctions.net',
      port: 443,
      path: '/generateMockAnswer',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options_req, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * テスト実行
 */
async function runTest() {
  console.log('========================================');
  console.log('generateMockAnswer テスト開始');
  console.log('========================================\n');

  console.log(`店舗: ${testStoreProfile.name} (${testStoreProfile.businessType})`);
  console.log(`立地: ${testStoreProfile.location}`);
  console.log(`特徴: ${testStoreProfile.feature}\n`);

  for (let i = 0; i < testQuestions.length; i++) {
    const { question, questionType, options } = testQuestions[i];

    console.log(`\n--- 質問 ${i + 1} ---`);
    console.log(`質問タイプ: ${questionType}`);
    console.log(`質問文: ${question}`);
    if (options && options.length > 0) {
      console.log(`選択肢: ${options.join(', ')}`);
    }

    try {
      console.log('\n回答生成中...');
      const response = await callGenerateMockAnswer(question, questionType, options);

      if (response.result && response.result.answer) {
        console.log(`\n【回答】\n${response.result.answer}`);
        console.log(`\n文字数: ${response.result.answer.length}文字`);
      } else if (response.error) {
        console.error(`\nエラー: ${response.error.message}`);
      } else {
        console.error(`\n予期しないレスポンス形式:`, response);
      }

      // API制限を考慮して1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`\nエラー: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log('テスト完了');
  console.log('========================================');
}

// テスト実行
runTest()
  .then(() => {
    console.log('\n処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nエラーが発生しました:', error);
    process.exit(1);
  });
