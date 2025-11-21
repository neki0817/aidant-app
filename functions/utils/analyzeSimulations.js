/**
 * 会話シミュレーションデータ分析ツール
 *
 * 生成された会話データを分析し、以下の情報を抽出:
 * - 質問タイプ別の回答パターン
 * - 業種別の回答傾向
 * - 頻出キーワード
 * - 回答の長さ・品質
 * - 様式2生成への活用可能性
 */

const admin = require('firebase-admin');
const mockStoreProfiles = require('./mockStoreProfiles');

/**
 * 全シミュレーションデータを取得
 */
async function fetchAllSimulations() {
  const db = admin.firestore();
  const simulationsSnapshot = await db.collection('conversation_simulations').get();

  const simulations = [];

  for (const doc of simulationsSnapshot.docs) {
    const data = doc.data();
    const messagesSnapshot = await doc.ref.collection('messages').orderBy('timestamp').get();

    const messages = messagesSnapshot.docs.map(m => m.data());

    simulations.push({
      id: doc.id,
      ...data,
      messages
    });
  }

  return simulations;
}

/**
 * 業種別の統計を生成
 */
function analyzeByBusinessType(simulations) {
  const stats = {};

  simulations.forEach(sim => {
    const businessType = sim.storeProfile.businessType;

    if (!stats[businessType]) {
      stats[businessType] = {
        totalSimulations: 0,
        totalQuestions: 0,
        totalAnswerLength: 0,
        questionTypes: {},
        commonKeywords: {}
      };
    }

    stats[businessType].totalSimulations++;
    stats[businessType].totalQuestions += sim.messages.length;

    sim.messages.forEach(msg => {
      // 回答の長さを集計
      stats[businessType].totalAnswerLength += msg.answer.length;

      // 質問タイプ別の集計
      const qType = msg.questionType;
      if (!stats[businessType].questionTypes[qType]) {
        stats[businessType].questionTypes[qType] = 0;
      }
      stats[businessType].questionTypes[qType]++;

      // キーワード抽出（簡易版）
      const keywords = extractKeywords(msg.answer);
      keywords.forEach(keyword => {
        if (!stats[businessType].commonKeywords[keyword]) {
          stats[businessType].commonKeywords[keyword] = 0;
        }
        stats[businessType].commonKeywords[keyword]++;
      });
    });
  });

  // 平均値を計算
  Object.keys(stats).forEach(businessType => {
    const s = stats[businessType];
    s.avgAnswerLength = Math.round(s.totalAnswerLength / s.totalQuestions);
    s.avgQuestionsPerSimulation = Math.round(s.totalQuestions / s.totalSimulations);

    // TOP10キーワードのみ保持
    s.topKeywords = Object.entries(s.commonKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    delete s.commonKeywords;
  });

  return stats;
}

/**
 * 質問タイプ別の統計を生成
 */
function analyzeByQuestionType(simulations) {
  const stats = {
    text: { count: 0, totalLength: 0, examples: [] },
    multi_select: { count: 0, totalLength: 0, examples: [] },
    single_select: { count: 0, totalLength: 0, examples: [] }
  };

  simulations.forEach(sim => {
    sim.messages.forEach(msg => {
      const qType = msg.questionType;
      if (!stats[qType]) return;

      stats[qType].count++;
      stats[qType].totalLength += msg.answer.length;

      // サンプル回答を保存（最大5件）
      if (stats[qType].examples.length < 5) {
        stats[qType].examples.push({
          question: msg.question,
          answer: msg.answer,
          store: sim.storeProfile.name
        });
      }
    });
  });

  // 平均値を計算
  Object.keys(stats).forEach(qType => {
    if (stats[qType].count > 0) {
      stats[qType].avgLength = Math.round(stats[qType].totalLength / stats[qType].count);
    }
    delete stats[qType].totalLength;
  });

  return stats;
}

/**
 * フェーズ別の統計を生成
 */
function analyzeByPhase(simulations) {
  const stats = {
    phase2: { count: 0, totalQuestions: 0, completedCount: 0 },
    phase3: { count: 0, totalQuestions: 0, completedCount: 0 }
  };

  simulations.forEach(sim => {
    const phase = sim.phase;
    if (!stats[phase]) return;

    stats[phase].count++;
    stats[phase].totalQuestions += sim.messages.length;

    if (sim.status === 'completed') {
      stats[phase].completedCount++;
    }
  });

  // 平均値を計算
  Object.keys(stats).forEach(phase => {
    if (stats[phase].count > 0) {
      stats[phase].avgQuestions = Math.round(stats[phase].totalQuestions / stats[phase].count);
      stats[phase].completionRate = Math.round((stats[phase].completedCount / stats[phase].count) * 100);
    }
  });

  return stats;
}

/**
 * キーワード抽出（簡易版）
 * 実際の実装では形態素解析などを使用
 */
function extractKeywords(text) {
  // ストップワードを除外
  const stopWords = ['です', 'ます', 'ている', 'いる', 'という', 'こと', 'ため', 'よう', 'として', 'について'];

  // カンマやピリオドで分割し、ストップワードを除外
  const words = text
    .replace(/[、。！？]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.includes(word));

  return words;
}

/**
 * 様式2生成への活用可能性を分析
 */
function analyzeForForm2Generation(simulations) {
  const analysis = {
    totalSimulations: simulations.length,
    usableForTraining: 0,
    qualityIssues: [],
    recommendations: []
  };

  simulations.forEach(sim => {
    let hasQualityIssue = false;

    // 質の評価基準
    // 1. 回答が短すぎる（10文字未満）
    const shortAnswers = sim.messages.filter(m => m.answer.length < 10);
    if (shortAnswers.length > 0) {
      hasQualityIssue = true;
      analysis.qualityIssues.push({
        simulationId: sim.id,
        store: sim.storeProfile.name,
        issue: `短い回答が${shortAnswers.length}件`,
        severity: 'low'
      });
    }

    // 2. 質問数が少なすぎる（3問未満）
    if (sim.messages.length < 3) {
      hasQualityIssue = true;
      analysis.qualityIssues.push({
        simulationId: sim.id,
        store: sim.storeProfile.name,
        issue: `質問数が少ない（${sim.messages.length}問）`,
        severity: 'medium'
      });
    }

    // 3. ステータスがエラー
    if (sim.status === 'error') {
      hasQualityIssue = true;
      analysis.qualityIssues.push({
        simulationId: sim.id,
        store: sim.storeProfile.name,
        issue: `エラー: ${sim.error || '不明'}`,
        severity: 'high'
      });
    }

    if (!hasQualityIssue && sim.status === 'completed') {
      analysis.usableForTraining++;
    }
  });

  // 推奨事項を生成
  if (analysis.usableForTraining < simulations.length * 0.8) {
    analysis.recommendations.push('シミュレーションの品質を改善する必要があります');
  }

  const shortAnswerIssues = analysis.qualityIssues.filter(q => q.issue.includes('短い回答'));
  if (shortAnswerIssues.length > 5) {
    analysis.recommendations.push('回答生成プロンプトを改善し、より詳細な回答を生成するようにしてください');
  }

  const errorIssues = analysis.qualityIssues.filter(q => q.severity === 'high');
  if (errorIssues.length > 0) {
    analysis.recommendations.push('エラーが発生しているシミュレーションを調査してください');
  }

  return analysis;
}

/**
 * 分析結果を出力
 */
async function runAnalysis() {
  console.log('=== 会話シミュレーションデータ分析 ===\n');

  const simulations = await fetchAllSimulations();

  console.log(`総シミュレーション数: ${simulations.length}\n`);

  if (simulations.length === 0) {
    console.log('シミュレーションデータがありません');
    return;
  }

  // 1. 業種別分析
  console.log('--- 業種別統計 ---');
  const businessTypeStats = analyzeByBusinessType(simulations);
  console.log(JSON.stringify(businessTypeStats, null, 2));

  // 2. 質問タイプ別分析
  console.log('\n--- 質問タイプ別統計 ---');
  const questionTypeStats = analyzeByQuestionType(simulations);
  console.log(JSON.stringify(questionTypeStats, null, 2));

  // 3. フェーズ別分析
  console.log('\n--- フェーズ別統計 ---');
  const phaseStats = analyzeByPhase(simulations);
  console.log(JSON.stringify(phaseStats, null, 2));

  // 4. 様式2生成への活用可能性
  console.log('\n--- 様式2生成への活用可能性 ---');
  const form2Analysis = analyzeForForm2Generation(simulations);
  console.log(JSON.stringify(form2Analysis, null, 2));

  console.log('\n=== 分析完了 ===');
}

// Firebase Admin初期化
if (!admin.apps.length) {
  const serviceAccount = require('../../serviceAccountKey.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://aidant-app.firebaseio.com'
  });
}

module.exports = {
  fetchAllSimulations,
  analyzeByBusinessType,
  analyzeByQuestionType,
  analyzeByPhase,
  analyzeForForm2Generation,
  runAnalysis
};

// CLIから直接実行された場合
if (require.main === module) {
  runAnalysis()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('エラー:', error);
      process.exit(1);
    });
}
