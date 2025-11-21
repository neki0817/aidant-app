/**
 * 会話シミュレーション実行スクリプト（CLI）
 *
 * 使い方:
 * node runSimulation.js [オプション]
 *
 * オプション:
 * --store <storeId>  : 特定の店舗のみ実行
 * --phase <phase>    : 特定のフェーズのみ実行 (phase2 or phase3)
 * --max <number>     : 最大質問数
 * --batch            : 全店舗・全フェーズを一括実行
 *
 * 例:
 * node runSimulation.js --store cafe_bluemountain --phase phase2
 * node runSimulation.js --batch
 */

const admin = require('firebase-admin');
const { runConversationSimulation, runBatchSimulations } = require('./conversationSimulator');
const mockStoreProfiles = require('./mockStoreProfiles');

// Firebase Admin初期化
if (!admin.apps.length) {
  const serviceAccount = require('../../serviceAccountKey.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://aidant-app.firebaseio.com'
  });
}

// コマンドライン引数の解析
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--store' && i + 1 < args.length) {
    options.storeId = args[i + 1];
    i++;
  } else if (args[i] === '--phase' && i + 1 < args.length) {
    options.phase = args[i + 1];
    i++;
  } else if (args[i] === '--max' && i + 1 < args.length) {
    options.maxQuestions = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--batch') {
    options.batch = true;
  } else if (args[i] === '--list') {
    // 店舗一覧を表示
    console.log('\n利用可能な店舗ID:');
    mockStoreProfiles.forEach((store, index) => {
      console.log(`${index + 1}. ${store.id} - ${store.name} (${store.businessType})`);
    });
    process.exit(0);
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
会話シミュレーション実行スクリプト

使い方:
  node runSimulation.js [オプション]

オプション:
  --store <storeId>  : 特定の店舗のみ実行
  --phase <phase>    : 特定のフェーズのみ実行 (phase2 or phase3)
  --max <number>     : 最大質問数（デフォルト: 5）
  --batch            : 全店舗・全フェーズを一括実行
  --list             : 利用可能な店舗ID一覧を表示
  --help, -h         : このヘルプを表示

例:
  # 特定の店舗でPhase 2のみ実行
  node runSimulation.js --store cafe_bluemountain --phase phase2

  # 全店舗・全フェーズを一括実行
  node runSimulation.js --batch

  # 最大3質問で実行
  node runSimulation.js --store ramen_yokohama --max 3

  # 店舗一覧を表示
  node runSimulation.js --list
`);
    process.exit(0);
  }
}

// シミュレーション実行
async function main() {
  try {
    if (options.batch) {
      // 一括実行モード
      console.log('=== 一括シミュレーション開始 ===\n');

      const results = await runBatchSimulations({
        maxQuestions: options.maxQuestions || 5
      });

      console.log('\n=== 一括シミュレーション結果 ===');
      console.log(`成功: ${results.filter(r => !r.error).length}件`);
      console.log(`失敗: ${results.filter(r => r.error).length}件`);

      // 失敗したシミュレーションの詳細を表示
      const failures = results.filter(r => r.error);
      if (failures.length > 0) {
        console.log('\n失敗したシミュレーション:');
        failures.forEach(f => {
          console.log(`- ${f.storeName} (${f.phase}): ${f.error}`);
        });
      }

    } else {
      // 単一実行モード
      if (!options.storeId) {
        console.error('エラー: --store オプションが必要です');
        console.log('利用可能な店舗ID一覧を表示するには: node runSimulation.js --list');
        process.exit(1);
      }

      const result = await runConversationSimulation({
        storeId: options.storeId,
        phase: options.phase || 'phase2',
        maxQuestions: options.maxQuestions || 5
      });

      console.log('\n=== シミュレーション結果 ===');
      console.log(`シミュレーションID: ${result.simulationId}`);
      console.log(`店舗: ${result.storeProfile}`);
      console.log(`フェーズ: ${result.phase}`);
      console.log(`質問数: ${result.totalQuestions}`);
    }

    console.log('\n処理が完了しました');
    process.exit(0);

  } catch (error) {
    console.error('\nエラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
