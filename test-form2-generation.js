/**
 * 様式2（補助金申請書）生成テスト
 *
 * Phase 1のデータを準備 + Phase 2-6のシミュレーションデータを統合して
 * generateSubsidyApplicationを呼び出し、様式2の品質を評価
 */

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'aidant-app'
  });
}

const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// シミュレーション結果を読み込み
const simulationData = JSON.parse(
  fs.readFileSync('simulation_results/batch_simulation_2025-11-16T10-17-42-257Z.json', 'utf8')
);

// 店舗プロフィールを読み込み
const mockStoreProfiles = require('./functions/utils/mockStoreProfiles');

/**
 * Phase 1データを生成（店舗プロフィールから）
 */
function generatePhase1Data(storeProfile) {
  return {
    'Q1-0': {
      name: storeProfile.name,
      address: storeProfile.location,
      placeId: storeProfile.id,
      rating: storeProfile.rating,
      reviewCount: storeProfile.reviewCount || 100,
      website: storeProfile.website || ''
    },
    'Q1-1': storeProfile.businessType,
    'Q1-2': '同じです', // 法人名と店舗名が同じ
    'Q1-3': storeProfile.yearsInBusiness || 3,
    'Q1-4': storeProfile.employees || 2,
    'Q1-5': storeProfile.feature || '',
    'Q1-6': storeProfile.customerBase || '',
    'Q1-7': storeProfile.subsidy_goal || '',
    'Q1-8': storeProfile.annualSales || 1440, // 年間売上（万円）
    'Q1-8-trend': '上昇傾向',
    'Q1-9': storeProfile.annualProfit || 240, // 年間営業利益（万円）
    'Q1-10': storeProfile.monthlySales || 120, // 月間平均売上（万円）
    'Q1-11': 3000, // 客単価（円）
    'Q1-COMPLETE': true
  };
}

/**
 * Phase 2-6データを統合（シミュレーション結果から）
 */
function extractPhase2to6Data(storeSimulation) {
  const answers = {};

  // P2-1からP6-2までの回答を抽出
  Object.entries(storeSimulation.answers).forEach(([questionId, data]) => {
    answers[questionId] = data.answer;
  });

  return answers;
}

/**
 * 様式2生成のためのプロンプト構築（簡易版）
 */
async function generateSubsidyApplicationSimple(phase1Data, phase2to6Data, storeProfile) {
  const prompt = `
あなたは中小企業診断士です。以下の情報を元に、小規模事業者持続化補助金の「様式2（経営計画書兼補助事業計画書）」を作成してください。

# 店舗の基本情報（Phase 1）
- 店舗名: ${phase1Data['Q1-0'].name}
- 業種: ${phase1Data['Q1-1']}
- 所在地: ${phase1Data['Q1-0'].address}
- 営業年数: ${phase1Data['Q1-3']}年
- 従業員数: ${phase1Data['Q1-4']}名
- 年間売上: ${phase1Data['Q1-8']}万円
- 年間営業利益: ${phase1Data['Q1-9']}万円
- Google Maps評価: ${phase1Data['Q1-0'].rating}点（${phase1Data['Q1-0'].reviewCount}件）

# Phase 2の回答（顧客ニーズと市場の動向）
${Object.entries(phase2to6Data)
      .filter(([id]) => id.startsWith('P2-'))
      .map(([id, answer]) => `${id}: ${answer}`)
      .join('\n\n')}

# Phase 3の回答（自社の強み）
${Object.entries(phase2to6Data)
      .filter(([id]) => id.startsWith('P3-'))
      .map(([id, answer]) => `${id}: ${answer}`)
      .join('\n\n')}

# Phase 4の回答（経営方針・目標）
${Object.entries(phase2to6Data)
      .filter(([id]) => id.startsWith('P4-'))
      .map(([id, answer]) => `${id}: ${answer}`)
      .join('\n\n')}

# Phase 5の回答（補助事業の内容）
${Object.entries(phase2to6Data)
      .filter(([id]) => id.startsWith('P5-'))
      .map(([id, answer]) => `${id}: ${answer}`)
      .join('\n\n')}

# Phase 6の回答（文章スタイル）
${Object.entries(phase2to6Data)
      .filter(([id]) => id.startsWith('P6-'))
      .map(([id, answer]) => `${id}: ${answer}`)
      .join('\n\n')}

---

【指示】
上記の情報を元に、以下のセクションを「である調（常体）」で作成してください。

## 1. 企業概要
## 2. 顧客ニーズと市場の動向
## 3. 自社や自社の提供する商品・サービスの強み
## 4. 経営方針・目標と今後のプラン
## 5. 補助事業で行う事業名（30文字以内）
## 6. 販路開拓等（生産性向上）の取組内容
## 7. 補助事業の効果

各セクションは具体的な数値を含め、審査員が理解しやすい構成で記述してください。
`;

  console.log('様式2生成中...');
  const startTime = Date.now();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '中小企業診断士として、小規模事業者持続化補助金の様式2を作成してください。具体的な数値を含め、である調（常体）で記述してください。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 3000
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const form2Content = completion.choices[0].message.content.trim();

  console.log(`✅ 様式2生成完了: ${form2Content.length}文字 (${duration}秒)\n`);

  return {
    content: form2Content,
    length: form2Content.length,
    duration: parseFloat(duration)
  };
}

/**
 * テスト実行
 */
async function runForm2GenerationTest() {
  console.log('========================================');
  console.log('様式2生成テスト');
  console.log('========================================\n');

  // テスト対象: 最初の3店舗
  const testStores = simulationData.results.slice(0, 3);

  const results = [];

  for (let i = 0; i < testStores.length; i++) {
    const storeSimulation = testStores[i];
    const storeProfile = mockStoreProfiles.find(s => s.id === storeSimulation.storeId);

    console.log(`\n--- 店舗 ${i + 1}/${testStores.length}: ${storeProfile.name} ---\n`);

    // Phase 1データを生成
    const phase1Data = generatePhase1Data(storeProfile);

    // Phase 2-6データを抽出
    const phase2to6Data = extractPhase2to6Data(storeSimulation);

    try {
      // 様式2生成
      const form2 = await generateSubsidyApplicationSimple(phase1Data, phase2to6Data, storeProfile);

      console.log('【生成された様式2の冒頭200文字】');
      console.log(form2.content.substring(0, 200) + '...\n');

      results.push({
        storeId: storeProfile.id,
        storeName: storeProfile.name,
        businessType: storeProfile.businessType,
        form2Length: form2.length,
        form2Duration: form2.duration,
        form2Preview: form2.content.substring(0, 500),
        form2Full: form2.content
      });

      // API制限を考慮して3秒待機
      if (i < testStores.length - 1) {
        console.log('次の店舗まで3秒待機...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ エラー: ${error.message}\n`);
      results.push({
        storeId: storeProfile.id,
        storeName: storeProfile.name,
        businessType: storeProfile.businessType,
        error: error.message
      });
    }
  }

  // 結果を保存
  const resultsDir = path.join(__dirname, 'simulation_results');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsPath = path.join(resultsDir, `form2_generation_test_${timestamp}.json`);

  fs.writeFileSync(resultsPath, JSON.stringify({
    metadata: {
      totalStores: results.length,
      successCount: results.filter(r => !r.error).length,
      failureCount: results.filter(r => r.error).length,
      timestamp: new Date().toISOString()
    },
    results: results
  }, null, 2));

  console.log(`\n========================================`);
  console.log(`様式2生成テスト完了`);
  console.log(`========================================`);
  console.log(`成功: ${results.filter(r => !r.error).length}/${results.length}店舗`);
  console.log(`結果保存: ${resultsPath}\n`);

  // 各店舗の様式2を個別ファイルに保存
  results.forEach((result, index) => {
    if (!result.error) {
      const form2Path = path.join(resultsDir, `form2_${result.storeId}.md`);
      const content = `# 様式2（経営計画書兼補助事業計画書）

**店舗名**: ${result.storeName}
**業種**: ${result.businessType}
**文字数**: ${result.form2Length}文字
**生成時間**: ${result.form2Duration}秒

---

${result.form2Full}
`;
      fs.writeFileSync(form2Path, content);
      console.log(`  ✅ 様式2を保存: ${form2Path}`);
    }
  });

  return results;
}

// 実行
if (require.main === module) {
  runForm2GenerationTest()
    .then(() => {
      console.log('\n全処理が完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nエラーが発生しました:', error);
      process.exit(1);
    });
}
