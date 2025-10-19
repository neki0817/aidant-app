/**
 * 完成度追跡モジュール - 11の評価ポイントの充足度を管理
 *
 * 小規模事業者持続化補助金の審査で評価される11のポイントを
 * リアルタイムで追跡し、不足している情報を特定します。
 *
 * @version 1.0.0
 * @created 2025-01-19
 */

/**
 * 11の評価ポイント定義
 */
export const EVALUATION_CRITERIA = {
  // 1. 審査項目に沿った記述
  ALIGNED_WITH_CRITERIA: {
    id: 'aligned_with_criteria',
    name: '審査項目に沿った記述',
    weight: 10,
    requiredFields: ['Q2-5', 'Q3-5', 'Q5-1'] // 経営理念、競合分析、販路開拓計画
  },

  // 2. 誰にでも分かりやすい表現
  CLEAR_EXPRESSION: {
    id: 'clear_expression',
    name: '誰にでも分かりやすい表現',
    weight: 8,
    requiredFields: ['Q2-5', 'Q5-1'] // 専門用語を避けた平易な表現
  },

  // 3. ターゲットの具体性
  SPECIFIC_TARGET: {
    id: 'specific_target',
    name: 'ターゲットの具体性',
    weight: 15,
    requiredFields: ['Q3-1', 'Q3-1-1', 'Q3-2'] // 年齢層、属性、利用目的
  },

  // 4. 論理的構成（課題→原因→解決策→実行→効果）
  LOGICAL_STRUCTURE: {
    id: 'logical_structure',
    name: '論理的構成',
    weight: 15,
    requiredFields: ['Q3-5', 'Q5-1', 'Q5-7', 'Q5-8', 'Q5-9'] // 課題、計画、効果
  },

  // 5. 数値による裏付け
  NUMERICAL_EVIDENCE: {
    id: 'numerical_evidence',
    name: '数値による裏付け',
    weight: 15,
    requiredFields: ['Q2-7-1', 'Q2-7-2', 'Q2-7-3', 'Q2-11', 'Q2-12', 'Q5-8', 'Q5-9'] // 売上、客単価、目標数値
  },

  // 6. ビフォーアフターの明示
  BEFORE_AFTER: {
    id: 'before_after',
    name: 'ビフォーアフターの明示',
    weight: 12,
    requiredFields: ['Q5-8', 'Q5-9', 'Q5-14'] // 現状と目標の比較
  },

  // 7. 強み・弱みと市場ニーズの把握
  SWOT_ANALYSIS: {
    id: 'swot_analysis',
    name: '強み・弱みと市場ニーズの把握',
    weight: 10,
    requiredFields: ['Q3-5', 'Q3-6'] // 競合分析、顧客要望
  },

  // 8. 経営方針と補助事業の整合性
  CONSISTENCY: {
    id: 'consistency',
    name: '経営方針と補助事業の整合性',
    weight: 10,
    requiredFields: ['Q2-5', 'Q5-1', 'Q5-10'] // 理念、計画、地域貢献
  },

  // 9. デジタル技術の活用
  DIGITAL_UTILIZATION: {
    id: 'digital_utilization',
    name: 'デジタル技術の活用',
    weight: 10,
    requiredFields: ['Q3-7', 'Q5-2', 'Q5-3', 'Q5-4'] // 現状、計画、具体策
  },

  // 10. 費用の透明性・適切性
  COST_TRANSPARENCY: {
    id: 'cost_transparency',
    name: '費用の透明性・適切性',
    weight: 8,
    requiredFields: ['Q5-6', 'Q5-6-1'] // 経費内訳、制約確認
  },

  // 11. 箇条書きでの情報整理
  ORGANIZED_INFO: {
    id: 'organized_info',
    name: '箇条書きでの情報整理',
    weight: 7,
    requiredFields: ['Q5-5', 'Q5-6'] // スケジュール、経費内訳
  }
};

/**
 * 各評価ポイントの充足度を計算
 * @param {Object} answers - ユーザーの回答データ
 * @param {Object} criterion - 評価ポイント
 * @returns {Object} { score: 0-100, missingFields: [], status: 'complete'|'partial'|'missing' }
 */
export const calculateCriterionCompleteness = (answers, criterion) => {
  const { requiredFields } = criterion;
  const totalFields = requiredFields.length;

  let completedFields = 0;
  const missingFields = [];

  requiredFields.forEach(fieldId => {
    const answer = answers[fieldId];

    // 回答が存在し、空でない場合はカウント
    if (answer !== null && answer !== undefined && answer !== '') {
      // 配列の場合は要素が存在するか確認
      if (Array.isArray(answer)) {
        if (answer.length > 0) {
          completedFields++;
        } else {
          missingFields.push(fieldId);
        }
      } else if (typeof answer === 'string') {
        // 文字列の場合は最低5文字以上
        if (answer.trim().length >= 5) {
          completedFields++;
        } else {
          missingFields.push(fieldId);
        }
      } else {
        completedFields++;
      }
    } else {
      missingFields.push(fieldId);
    }
  });

  const score = Math.round((completedFields / totalFields) * 100);

  let status = 'missing';
  if (score === 100) status = 'complete';
  else if (score >= 50) status = 'partial';

  return {
    score,
    completedFields,
    totalFields,
    missingFields,
    status
  };
};

/**
 * 全体の完成度を計算（加重平均）
 * @param {Object} answers - ユーザーの回答データ
 * @returns {Object} 全体の完成度と各ポイントの詳細
 */
export const calculateOverallCompleteness = (answers) => {
  const results = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.entries(EVALUATION_CRITERIA).forEach(([key, criterion]) => {
    const result = calculateCriterionCompleteness(answers, criterion);
    results[key] = {
      ...criterion,
      ...result
    };

    totalWeightedScore += result.score * criterion.weight;
    totalWeight += criterion.weight;
  });

  const overallScore = Math.round(totalWeightedScore / totalWeight);

  // ステータス判定
  let overallStatus = 'insufficient'; // 不十分
  if (overallScore >= 95) overallStatus = 'excellent'; // 優秀
  else if (overallScore >= 80) overallStatus = 'good'; // 良好
  else if (overallScore >= 60) overallStatus = 'acceptable'; // 合格ライン

  // 最も不足しているポイントを特定
  const sortedByScore = Object.entries(results)
    .sort((a, b) => a[1].score - b[1].score);

  const criticalGaps = sortedByScore
    .filter(([_, data]) => data.score < 80)
    .map(([key, data]) => ({
      id: key,
      name: data.name,
      score: data.score,
      missingFields: data.missingFields
    }));

  return {
    overallScore,
    overallStatus,
    criteriaDetails: results,
    criticalGaps,
    totalCriteria: Object.keys(EVALUATION_CRITERIA).length,
    completeCriteria: Object.values(results).filter(r => r.status === 'complete').length,
    partialCriteria: Object.values(results).filter(r => r.status === 'partial').length,
    missingCriteria: Object.values(results).filter(r => r.status === 'missing').length
  };
};

/**
 * 次に優先すべき質問を提案
 * @param {Object} answers - ユーザーの回答データ
 * @param {Array} availableQuestions - 利用可能な質問リスト
 * @returns {Array} 優先度順の質問ID配列
 */
export const suggestNextQuestions = (answers, availableQuestions = []) => {
  const completeness = calculateOverallCompleteness(answers);

  // 重要度が高く、不足しているポイントを優先
  const priorityOrder = completeness.criticalGaps
    .flatMap(gap => gap.missingFields)
    .filter(fieldId => availableQuestions.includes(fieldId));

  return priorityOrder;
};

/**
 * 進捗状況のサマリーを生成
 * @param {Object} answers - ユーザーの回答データ
 * @returns {String} 進捗状況の説明文
 */
export const generateProgressSummary = (answers) => {
  const completeness = calculateOverallCompleteness(answers);

  let summary = `【申請書完成度: ${completeness.overallScore}%】\n\n`;

  if (completeness.overallStatus === 'excellent') {
    summary += '素晴らしい！申請書は審査基準を満たす高い水準に達しています。\n\n';
  } else if (completeness.overallStatus === 'good') {
    summary += '良好な状態です。あと少しで完璧な申請書になります。\n\n';
  } else if (completeness.overallStatus === 'acceptable') {
    summary += '基本的な情報は揃っていますが、採択率を高めるためにはさらなる充実が必要です。\n\n';
  } else {
    summary += '重要な情報が不足しています。以下の項目を重点的に充実させましょう。\n\n';
  }

  // 完成・一部完成・不足の内訳
  summary += `✅ 完成: ${completeness.completeCriteria}項目\n`;
  summary += `🟡 一部完成: ${completeness.partialCriteria}項目\n`;
  summary += `❌ 不足: ${completeness.missingCriteria}項目\n\n`;

  // 最も改善が必要なポイント
  if (completeness.criticalGaps.length > 0) {
    summary += '【最優先で改善すべきポイント】\n';
    completeness.criticalGaps.slice(0, 3).forEach((gap, index) => {
      summary += `${index + 1}. ${gap.name} (${gap.score}%)\n`;
    });
  }

  return summary;
};

/**
 * 回答の深さを5段階で評価
 * @param {String} answer - 回答テキスト
 * @param {String} questionType - 質問タイプ（textarea, text等）
 * @returns {Number} 深さレベル 1-5
 */
export const evaluateAnswerDepth = (answer, questionType) => {
  if (!answer || (typeof answer === 'string' && answer.trim().length === 0)) {
    return 0; // 未回答
  }

  if (questionType !== 'textarea' && questionType !== 'text') {
    return 5; // 選択式は深さ評価不要
  }

  const text = String(answer).trim();
  const length = text.length;

  // 数値が含まれているか
  const hasNumbers = /\d+/.test(text);

  // 具体例・事例が含まれているか
  const hasExamples = /例えば|例：|具体的には|〜など/.test(text);

  // 理由・根拠が含まれているか
  const hasReason = /なぜなら|理由は|〜ため|〜から/.test(text);

  // 深さのスコアリング
  let depth = 1;

  if (length >= 50) depth = 2;
  if (length >= 100) depth = 3;
  if (length >= 150 && (hasNumbers || hasExamples)) depth = 4;
  if (length >= 200 && hasNumbers && hasExamples && hasReason) depth = 5;

  return depth;
};

/**
 * 不足情報の詳細レポート生成
 * @param {Object} answers - ユーザーの回答データ
 * @returns {Array} 不足情報の詳細配列
 */
export const generateMissingInfoReport = (answers) => {
  const completeness = calculateOverallCompleteness(answers);

  const report = [];

  completeness.criticalGaps.forEach(gap => {
    gap.missingFields.forEach(fieldId => {
      report.push({
        criterionName: gap.name,
        fieldId,
        priority: gap.score < 50 ? 'high' : 'medium',
        impact: `この情報がないと「${gap.name}」の評価が${gap.score}%にとどまります`
      });
    });
  });

  return report;
};
