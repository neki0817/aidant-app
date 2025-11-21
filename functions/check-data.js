const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async () => {
  try {
    const snapshot = await db.collection('applications')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('アプリケーションが見つかりません');
      process.exit(0);
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log('=== 最新のアプリケーションデータ ===');
    console.log('ID:', doc.id);
    console.log('');
    console.log('【Q1-7: 補助事業で実現したいこと】');
    console.log(data.answers?.['Q1-7'] || '未回答');
    console.log('');
    console.log('【Q1-1: 業種】');
    console.log(data.answers?.['Q1-1'] || '未回答');
    console.log('');
    console.log('=== Phase 2の回答 ===');

    const phase2Answers = Object.keys(data.answers || {})
      .filter(key => key.startsWith('P2-') || key.startsWith('conv-'))
      .sort();

    if (phase2Answers.length > 0) {
      phase2Answers.forEach(key => {
        console.log('');
        console.log('[' + key + ']');
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

    console.log('');
    console.log('=== 現在の状態 ===');
    console.log('currentStep:', data.currentStep || 1);

    process.exit(0);
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
})();
