/**
 * バリデーション・矛盾検出エンジン
 *
 * ユーザーの回答の論理的矛盾、非現実的な数値、
 * 制度上の問題を自動検出し、修正を提案します。
 *
 * @version 1.0.0
 * @created 2025-01-19
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * 数値目標の現実性をチェック
 * @param {Object} answers - 全回答データ
 * @returns {Array} 問題点の配列
 */
export const validateNumericGoals = (answers) => {
  const issues = [];

  // 売上目標の現実性チェック
  const latestSales = parseFloat(answers['Q2-7-3']) || 0;
  const targetSales = parseFloat(answers['Q5-9']?.match(/\d+/)?.[0]) || 0;

  if (latestSales > 0 && targetSales > 0) {
    const growthRate = targetSales / latestSales;

    if (growthRate > 2.0) {
      issues.push({
        type: 'unrealistic_goal',
        severity: 'high',
        field: 'Q5-9',
        message: `売上目標が非現実的です（${growthRate.toFixed(1)}倍）`,
        suggestion: `実績の1.2〜1.3倍（${Math.round(latestSales * 1.2)}〜${Math.round(latestSales * 1.3)}万円）が現実的です`,
        currentValue: targetSales,
        recommendedValue: Math.round(latestSales * 1.25)
      });
    } else if (growthRate > 1.5) {
      issues.push({
        type: 'ambitious_goal',
        severity: 'medium',
        field: 'Q5-9',
        message: `売上目標がやや高めです（${growthRate.toFixed(1)}倍）`,
        suggestion: `達成可能な根拠を明確に示す必要があります`,
        currentValue: targetSales,
        recommendedValue: null
      });
    }
  }

  // 新規顧客獲得数の現実性チェック
  const currentCustomers = parseInt(answers['Q2-12']?.match(/\d+/)?.[0]) || 0;
  const targetNewCustomers = parseInt(answers['Q5-8']?.match(/\d+/)?.[0]) || 0;

  if (currentCustomers > 0 && targetNewCustomers > currentCustomers) {
    issues.push({
      type: 'unrealistic_customer_goal',
      severity: 'medium',
      field: 'Q5-8',
      message: '新規顧客目標が現在の来客数を上回っています',
      suggestion: '月間の増加数として現実的な数値を設定してください',
      currentValue: targetNewCustomers,
      recommendedValue: Math.round(currentCustomers * 0.3) // 30%増が現実的
    });
  }

  return issues;
};

/**
 * ウェブサイト関連費の制約チェック
 * @param {Object} answers - 全回答データ
 * @returns {Array} 問題点の配列
 */
export const validateWebsiteCosts = (answers) => {
  const issues = [];

  const costsAnswer = answers['Q5-6'] || '';

  // 経費の解析
  const webRelatedKeywords = ['ウェブサイト', 'HP', 'ホームページ', 'ECサイト', 'Web'];
  const hasWebCost = webRelatedKeywords.some(keyword => costsAnswer.includes(keyword));

  if (!hasWebCost) {
    return issues; // ウェブ関連費がない場合はチェック不要
  }

  // 総額の抽出
  const costMatches = costsAnswer.match(/(\d+)万円/g) || [];
  const costs = costMatches.map(match => parseInt(match.replace('万円', '')));
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0);

  // ウェブ関連費の抽出（簡易的な判定）
  const webCostMatch = costsAnswer.match(/ウェブサイト関連費[：:]\s*[^\d]*(\d+)万円/);
  const webCost = webCostMatch ? parseInt(webCostMatch[1]) : 0;

  if (webCost > 0) {
    // 1/4ルールチェック
    const maxAllowedWebCost = Math.floor(totalCost / 4);

    if (webCost > maxAllowedWebCost) {
      issues.push({
        type: 'web_cost_exceeded',
        severity: 'critical',
        field: 'Q5-6',
        message: `ウェブサイト関連費が総額の1/4を超えています（${webCost}万円 / ${totalCost}万円）`,
        suggestion: `ウェブサイト関連費は${maxAllowedWebCost}万円以下にしてください`,
        currentValue: webCost,
        recommendedValue: maxAllowedWebCost
      });
    }

    // 50万円上限チェック
    if (webCost > 50) {
      issues.push({
        type: 'web_cost_limit',
        severity: 'critical',
        field: 'Q5-6',
        message: `ウェブサイト関連費が上限の50万円を超えています（${webCost}万円）`,
        suggestion: 'ウェブサイト関連費は最大50万円までです',
        currentValue: webCost,
        recommendedValue: 50
      });
    }

    // 単独申請チェック
    if (costs.length === 1 && webCost === totalCost) {
      issues.push({
        type: 'web_only_application',
        severity: 'critical',
        field: 'Q5-6',
        message: 'ウェブサイト関連費のみでの申請は認められていません',
        suggestion: '他の経費（広報費、機械装置等費など）と組み合わせてください',
        currentValue: webCost,
        recommendedValue: null
      });
    }
  }

  return issues;
};

/**
 * 論理的整合性のチェック
 * @param {Object} answers - 全回答データ
 * @returns {Array} 問題点の配列
 */
export const validateLogicalConsistency = (answers) => {
  const issues = [];

  // 経営理念と補助事業計画の整合性
  const philosophy = answers['Q2-5'] || '';
  const plan = answers['Q5-1'] || '';

  if (philosophy && plan) {
    // 簡易的な整合性チェック（キーワードマッチング）
    const philosophyKeywords = philosophy.match(/地域|品質|サービス|貢献|こだわり/g) || [];
    const planKeywords = plan.match(/地域|品質|サービス|貢献|こだわり/g) || [];

    const commonKeywords = philosophyKeywords.filter(kw => planKeywords.includes(kw));

    if (commonKeywords.length === 0) {
      issues.push({
        type: 'inconsistent_philosophy_plan',
        severity: 'medium',
        field: 'Q5-1',
        message: '経営理念と補助事業計画のつながりが不明確です',
        suggestion: '経営理念で述べた価値観が計画にどう反映されているかを明記してください',
        currentValue: null,
        recommendedValue: null
      });
    }
  }

  // ターゲット顧客と取組内容の整合性
  const targetAge = answers['Q3-1'] || [];
  const initiatives = answers['Q5-2'] || [];

  if (Array.isArray(targetAge) && targetAge.includes('60代') || targetAge.includes('70代以上')) {
    if (Array.isArray(initiatives) && initiatives.some(i => i.includes('SNS') || i.includes('Instagram'))) {
      // 必ずしも矛盾ではないが、確認は必要
      issues.push({
        type: 'target_initiative_mismatch',
        severity: 'low',
        field: 'Q5-2',
        message: 'シニア層向けにSNSマーケティングを実施する理由を説明すると説得力が増します',
        suggestion: 'ターゲット層がSNSを利用する根拠や、家族経由での情報拡散などの戦略を明記してください',
        currentValue: null,
        recommendedValue: null
      });
    }
  }

  return issues;
};

/**
 * 業務効率化と販路開拓のつながりをチェック
 * @param {Object} answers - 全回答データ
 * @returns {Array} 問題点の配列
 */
export const validateSalesChannelConnection = (answers) => {
  const issues = [];

  const plan = answers['Q5-1'] || '';
  const initiatives = answers['Q5-2'] || [];
  const efficiencyPlan = answers['Q5-15'] || '';

  // 業務効率化のキーワード
  const efficiencyKeywords = [
    '効率化', '時間削減', 'コスト削減', '自動化', '省力化',
    '内装', '改装', 'スマートロック', '設備'
  ];

  const hasEfficiencyFocus = efficiencyKeywords.some(keyword =>
    plan.includes(keyword) || efficiencyPlan.includes(keyword)
  );

  if (hasEfficiencyFocus) {
    // 販路開拓とのつながりチェック
    const salesKeywords = ['新規', '顧客', '獲得', '集客', '売上', '認知', 'リピート'];

    const hasSalesConnection = salesKeywords.some(keyword =>
      plan.includes(keyword) || efficiencyPlan.includes(keyword)
    );

    if (!hasSalesConnection) {
      issues.push({
        type: 'missing_sales_connection',
        severity: 'high',
        field: 'Q5-1',
        message: '業務効率化の取組が販路開拓にどうつながるか不明確です',
        suggestion: '削減された時間やコストを「どのように新規顧客獲得や売上向上に活用するか」を必ず記載してください',
        currentValue: null,
        recommendedValue: null
      });
    }
  }

  return issues;
};

/**
 * AIを使った高度な矛盾検出
 * @param {Object} answers - 全回答データ
 * @returns {Promise<Array>} 問題点の配列
 */
export const detectContradictionsWithAI = async (answers) => {
  try {
    const relevantAnswers = {
      philosophy: answers['Q2-5'],
      targetAge: answers['Q3-1'],
      targetAttributes: answers['Q3-1-1'],
      purpose: answers['Q3-2'],
      competitors: answers['Q3-5'],
      plan: answers['Q5-1'],
      initiatives: answers['Q5-2'],
      salesGoal: answers['Q5-9'],
      newCustomerGoal: answers['Q5-8']
    };

    const prompt = `以下の補助金申請内容を分析し、論理的矛盾や問題点を検出してください。

【申請内容】
${JSON.stringify(relevantAnswers, null, 2)}

【検出すべき問題】
1. 論理的矛盾（経営理念と計画の不整合など）
2. ターゲット顧客と取組内容の不一致
3. 非現実的な数値目標（実績の2倍以上など）
4. 競合分析と差別化戦略の不整合
5. 販路開拓とのつながりが不明確な取組

【出力形式】
JSON配列で以下の形式で返してください：
[
  {
    "type": "問題タイプ",
    "severity": "high|medium|low",
    "message": "問題の説明",
    "suggestion": "改善提案",
    "affectedFields": ["関連する質問ID"]
  }
]

問題がない場合は空配列 [] を返してください。`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは小規模事業者持続化補助金の審査専門家です。
申請内容の論理的矛盾や問題点を厳しくチェックします。

【重要な観点】
- 経営理念と計画の一貫性
- ターゲット顧客と施策の適合性
- 数値目標の現実性（実績の1.2〜1.3倍が適切）
- 販路開拓（新規顧客獲得・売上向上）との明確なつながり

批判的な視点で分析し、具体的な改善提案を行ってください。`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result.issues || [];

  } catch (error) {
    console.error('[Validation] AI contradiction detection error:', error);
    return [];
  }
};

/**
 * 総合バリデーション実行
 * @param {Object} answers - 全回答データ
 * @param {Boolean} useAI - AIによる高度な検証を使用するか
 * @returns {Promise<Object>} バリデーション結果
 */
export const runComprehensiveValidation = async (answers, useAI = false) => {
  const issues = [
    ...validateNumericGoals(answers),
    ...validateWebsiteCosts(answers),
    ...validateLogicalConsistency(answers),
    ...validateSalesChannelConnection(answers)
  ];

  // AI検証を追加
  if (useAI) {
    const aiIssues = await detectContradictionsWithAI(answers);
    issues.push(...aiIssues);
  }

  // 重要度別に分類
  const critical = issues.filter(i => i.severity === 'critical');
  const high = issues.filter(i => i.severity === 'high');
  const medium = issues.filter(i => i.severity === 'medium');
  const low = issues.filter(i => i.severity === 'low');

  return {
    isValid: critical.length === 0 && high.length === 0,
    hasWarnings: medium.length > 0 || low.length > 0,
    totalIssues: issues.length,
    issues: {
      critical,
      high,
      medium,
      low
    },
    allIssues: issues
  };
};

/**
 * バリデーション結果のサマリーを生成
 * @param {Object} validationResult - バリデーション結果
 * @returns {String} サマリーテキスト
 */
export const generateValidationSummary = (validationResult) => {
  if (validationResult.isValid && !validationResult.hasWarnings) {
    return '✅ 問題は検出されませんでした。申請書は良好な状態です。';
  }

  let summary = '【申請書チェック結果】\n\n';

  const { critical, high, medium, low } = validationResult.issues;

  if (critical.length > 0) {
    summary += `🔴 重大な問題: ${critical.length}件\n`;
    critical.forEach((issue, i) => {
      summary += `  ${i + 1}. ${issue.message}\n`;
      summary += `     → ${issue.suggestion}\n`;
    });
    summary += '\n';
  }

  if (high.length > 0) {
    summary += `🟠 要改善: ${high.length}件\n`;
    high.forEach((issue, i) => {
      summary += `  ${i + 1}. ${issue.message}\n`;
      summary += `     → ${issue.suggestion}\n`;
    });
    summary += '\n';
  }

  if (medium.length > 0) {
    summary += `🟡 推奨改善: ${medium.length}件\n`;
    medium.forEach((issue, i) => {
      summary += `  ${i + 1}. ${issue.message}\n`;
    });
    summary += '\n';
  }

  if (critical.length > 0 || high.length > 0) {
    summary += '\n⚠️ 赤・オレンジの問題を解決してから申請することをお勧めします。\n';
  }

  return summary;
};
