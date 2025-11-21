/**
 * Phase 2 会話形式質問生成のテスト
 *
 * IoT化支援のソフトウェア開発会社向けの質問を生成
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyBG6qJQs8B0RxQjVkQPk8K3X7jB0Z9Qx0E",
  authDomain: "aidant-app.firebaseapp.com",
  projectId: "aidant-app",
  storageBucket: "aidant-app.firebasestorage.app",
  messagingSenderId: "463087555161",
  appId: "1:463087555161:web:8d5e3c8b7f0d9a8e1c2d3e"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, 'asia-northeast1');

async function testQuestionGeneration() {
  try {
    console.log('=== Phase 2 会話形式質問生成テスト ===\n');

    // テスト用アカウントでログイン（環境変数から取得）
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'testpassword';

    console.log(`ログイン中... (${email})`);
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✓ ログイン成功\n');

    // 業種情報
    const businessType = 'IoT化を支援するソフトウェア開発会社';

    // テストするデータ項目
    const dataItems = [
      { id: 'target_customers', label: 'ターゲット顧客' },
      { id: 'customer_needs', label: '顧客ニーズ' },
      { id: 'market_trends', label: '市場の動向' }
    ];

    // 各データ項目の質問を生成
    for (const dataItem of dataItems) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`データ項目: ${dataItem.label}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const generateQuestionsFunc = httpsCallable(functions, 'generatePhase2ConversationalQuestions');

      const result = await generateQuestionsFunc({
        businessType,
        dataItemId: dataItem.id,
        dataItemLabel: dataItem.label,
        collectedData: {} // 初回なので空
      });

      const questions = result.data.questions || [];

      console.log(`生成された質問数: ${questions.length}\n`);

      questions.forEach((q, index) => {
        console.log(`\n【質問 ${index + 1}】`);
        console.log(`ID: ${q.id}`);
        console.log(`質問文: ${q.text}`);
        console.log(`タイプ: ${q.type}`);

        if (q.options) {
          console.log(`選択肢:`);
          q.options.forEach((opt, i) => {
            console.log(`  ${i + 1}. ${opt}`);
          });
        }

        if (q.placeholder) {
          console.log(`ヒント: ${q.placeholder}`);
        }

        if (q.example) {
          console.log(`回答例: ${q.example}`);
        }

        if (q.optional) {
          console.log(`任意質問: はい`);
        }
      });

      console.log('\n');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✓ テスト完了');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

// テスト実行
testQuestionGeneration();
