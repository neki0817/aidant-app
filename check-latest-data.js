const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async () => {
  try {
    // 最新の application データを取得（createdAt 降順で最大10件）
    const snapshot = await db.collection('applications')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    console.log('=== 最近の申請データ（最新10件） ===\n');

    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || 'N/A';

      console.log(`ID: ${doc.id}`);
      console.log(`作成日時: ${createdAt}`);
      console.log(`事業者名: ${data.answers?.['Q1-0']?.businessName || 'N/A'}`);
      console.log(`フェーズ: ${data.currentStep || 0}`);
      console.log(`回答数: ${Object.keys(data.answers || {}).length}件`);
      console.log(`Phase 0完了: ${data.answers?.['Q0-1'] ? '✅' : '❌'}`);
      console.log(`Phase 1完了: ${data.answers?.['Q1-1'] ? '✅' : '❌'}`);
      console.log('---\n');
    });

    // 最新のデータの詳細を表示
    if (!snapshot.empty) {
      const latestDoc = snapshot.docs[0];
      const latestData = latestDoc.data();

      console.log('\n=== 最新の申請データの詳細 ===\n');
      console.log('Phase 0の回答:');
      console.log(`Q0-1（取組の目的）: ${latestData.answers?.['Q0-1'] || 'なし'}`);
      console.log(`Q0-2（購入・実施予定）: ${latestData.answers?.['Q0-2'] || 'なし'}`);
      console.log(`Q0-3（受給歴）: ${latestData.answers?.['Q0-3'] || 'なし'}`);

      console.log('\nPhase 1の回答:');
      console.log(`Q1-0-website-check: ${latestData.answers?.['Q1-0-website-check'] || 'なし'}`);
      console.log(`Q1-5-fiscal（決算月）: ${latestData.answers?.['Q1-5-fiscal'] || 'なし'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
})();
