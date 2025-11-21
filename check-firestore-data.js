// Firestoreのデータを確認するスクリプト
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkLatestApplication() {
  try {
    // 最新のアプリケーションを取得
    const snapshot = await db.collection('applications')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('アプリケーションが見つかりません');
      return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log('=== 最新のアプリケーションデータ ===');
    console.log('ID:', doc.id);
    console.log('作成日時:', data.createdAt?.toDate());
    console.log('\n=== Phase 1の回答 ===');

    // Q1-7（補助事業で実現したいこと）を特に確認
    console.log('\n【Q1-7: 補助事業で実現したいこと】');
    console.log(data.answers?.['Q1-7'] || '未回答');

    // その他の重要な回答
    console.log('\n【Q1-1: 業種】');
    console.log(data.answers?.['Q1-1'] || '未回答');

    console.log('\n【Q1-0: Google Maps情報】');
    if (data.answers?.['Q1-0']) {
      const q10 = data.answers['Q1-0'];
      console.log('- 店舗名:', q10.name);
      console.log('- 業種:', q10.types?.join(', '));
      console.log('- 評価:', q10.rating);
    }

    // Phase 2の回答を確認
    console.log('\n=== Phase 2の回答 ===');
    const phase2Answers = Object.keys(data.answers || {})
      .filter(key => key.startsWith('P2-'))
      .sort();

    if (phase2Answers.length > 0) {
      phase2Answers.forEach(key => {
        console.log(`\n【${key}】`);
        const answer = data.answers[key];
        if (typeof answer === 'object') {
          console.log(JSON.stringify(answer, null, 2));
        } else {
          console.log(answer);
        }
      });
    } else {
      console.log('Phase 2の回答はまだありません');
    }

    // Phase 2会話形式の回答を確認
    console.log('\n=== Phase 2会話形式の回答（conv-） ===');
    const convAnswers = Object.keys(data.answers || {})
      .filter(key => key.startsWith('conv-'))
      .sort();

    if (convAnswers.length > 0) {
      convAnswers.forEach(key => {
        console.log(`\n【${key}】`);
        const answer = data.answers[key];
        if (Array.isArray(answer)) {
          console.log('複数選択:', answer.join(', '));
        } else if (typeof answer === 'object') {
          console.log(JSON.stringify(answer, null, 2));
        } else {
          console.log(answer);
        }
      });
    } else {
      console.log('会話形式の回答はまだありません');
    }

    // 確認・統合済みデータを確認
    console.log('\n=== Phase 2確認・統合済みデータ ===');
    const confirmAnswers = Object.keys(data.answers || {})
      .filter(key => key.includes('-confirm') || key.includes('target_customers') || key.includes('customer_composition') || key.includes('customer_needs') || key.includes('market_trends'))
      .sort();

    if (confirmAnswers.length > 0) {
      confirmAnswers.forEach(key => {
        console.log(`\n【${key}】`);
        const answer = data.answers[key];
        if (typeof answer === 'object') {
          console.log(JSON.stringify(answer, null, 2));
        } else {
          console.log(answer);
        }
      });
    }

    // 現在のステップ
    console.log('\n=== 現在の状態 ===');
    console.log('currentStep:', data.currentStep || 1);
    console.log('完了状況:', data.isComplete ? '完了' : '進行中');

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    process.exit(0);
  }
}

checkLatestApplication();
