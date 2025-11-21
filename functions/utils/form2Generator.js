// 様式2（経営計画書兼補助事業計画書）生成ロジック

const {
  extractTopKeywords,
  generateReviewSection,
  generateCompetitorComparison,
  extractStrengthTitle,
  extractExpertise,
  generateStrengthsWithReviews
} = require('../../src/services/ai/reviewDataHandler');

/**
 * （1）事業の概要を生成
 * @param {Object} answers - 全ての回答データ
 * @returns {string} 事業の概要のテキスト
 */
function generateBusinessOverview(answers) {
  const googleMaps = answers['Q1-0'];
  const tabelog = answers['Q1-0-tabelog'];
  const businessName = googleMaps?.name || answers['Q1-2-company'] || '当店';
  const businessType = answers['Q1-3'];
  const startDate = answers['Q1-5'];
  const concept = answers['Q1-NEW-1-generated'] || answers['Q1-NEW-1-manual'];
  const kodawari = answers['Q1-NEW-3'];

  let overview = '';

  // 基本情報
  overview += `当店「${businessName}」は、${formatDate(startDate)}に開業した${businessType}です。`;
  overview += `${concept}\n\n`;

  // こだわり
  if (kodawari && kodawari !== '特になし') {
    overview += `${kodawari}\n\n`;
  }

  // 人気商品
  if (answers['Q1-NEW-6-1']) {
    overview += `**主な商品と価格:**\n`;
    overview += `- 1位: ${answers['Q1-NEW-6-1']}（${answers['Q1-NEW-6-1-price'].toLocaleString()}円）\n`;

    if (answers['Q1-NEW-6-2']) {
      overview += `- 2位: ${answers['Q1-NEW-6-2']}（${answers['Q1-NEW-6-2-price'].toLocaleString()}円）\n`;
    }

    if (answers['Q1-NEW-6-3']) {
      overview += `- 3位: ${answers['Q1-NEW-6-3']}（${answers['Q1-NEW-6-3-price'].toLocaleString()}円）\n`;
    }

    overview += `\n`;
  }

  // 【口コミ情報を反映】
  const reviewSection = generateReviewSection(googleMaps, tabelog);
  if (reviewSection) {
    overview += `${reviewSection}\n\n`;
  }

  // 顧客層
  overview += generateCustomerSection(answers);
  overview += `\n`;

  // 売上・従業員情報
  const revenue = answers['Q1-8'];
  const profit = answers['Q1-9'];
  const employeeData = answers['Q1-NEW-10'];

  overview += `直近1年間の年間売上は${revenue}万円、経常利益は${profit}万円となっています。`;

  // Q1-NEW-10から従業員情報を取得
  if (employeeData) {
    const fulltimeCount = employeeData.fulltime_count || 0;
    if (fulltimeCount > 0) {
      overview += `常時雇用従業員は${fulltimeCount}名です。`;
    }
  }

  return overview;
}

/**
 * 顧客層セクションを生成
 * @param {Object} answers - 全ての回答データ
 * @returns {string} 顧客層のテキスト
 */
function generateCustomerSection(answers) {
  let section = '';

  // 年齢層
  const ageGroups = answers['Q1-NEW-4-age'];
  if (ageGroups && ageGroups.length > 0) {
    if (ageGroups.length === 6) {
      section += `主な顧客層は全年齢層にわたり、`;
    } else {
      section += `主な顧客層は${ageGroups.join('、')}を中心に、`;
    }
  }

  // ペルソナ
  const personas = answers['Q1-NEW-4-persona'];
  if (personas && personas.length > 0) {
    const personaText = personas
      .filter(p => p !== 'その他')
      .join('、');
    section += `${personaText}`;

    if (personas.includes('その他') && answers['Q1-NEW-4-persona-other']) {
      section += `、${answers['Q1-NEW-4-persona-other']}`;
    }

    section += `と幅広いお客様にご利用いただいています。`;
  }

  // 営業時間・来客パターン
  const busyDays = answers['Q1-NEW-5-busyday'];
  const busyTimes = answers['Q1-NEW-5-busytime'];

  if (busyDays && busyDays.length > 0) {
    section += `来客が多いのは${busyDays.join('、')}`;

    if (busyTimes && busyTimes.length > 0) {
      section += `の${busyTimes.join('、')}`;
    }

    section += `です。`;
  }

  // 季節変動
  const season = answers['Q1-NEW-5-season'];
  if (season && season !== '特に変動なし') {
    section += `${season}傾向にあります。`;
  }

  return section;
}

/**
 * （2）顧客ニーズと市場の動向を生成
 * @param {Object} answers - 全ての回答データ
 * @returns {string} 顧客ニーズと市場の動向のテキスト
 */
function generateMarketAnalysis(answers) {
  const googleMaps = answers['Q1-0'];
  const tabelog = answers['Q1-0-tabelog'];
  const businessType = answers['Q1-1'];

  let section = '';

  section += `### 2. 顧客ニーズと市場の動向\n\n`;

  // ターゲット顧客
  section += `#### （1）ターゲット顧客と顧客ニーズ\n\n`;
  section += `**主な顧客層:**\n`;
  section += generateCustomerSection(answers);
  section += `\n\n`;

  // 顧客が当店を選ぶ理由（口コミから）
  if (tabelog?.keywords && tabelog.keywords.length > 0) {
    section += `**お客様が当店を選ぶ理由:**\n`;
    const keywords = extractTopKeywords(tabelog.keywords, 5);
    section += `お客様からは「${keywords.join('」「')}」という評価をいただいています。`;

    if (googleMaps?.rating >= 4.0) {
      section += `Google口コミでも高評価をいただいており、リピーター率も高い水準を維持しています。`;
    }
    section += `\n\n`;
  }

  // 競合との比較（口コミ情報を活用）
  section += `#### （4）競合との比較\n\n`;
  const competitorSection = generateCompetitorComparison(googleMaps, tabelog, businessType);
  if (competitorSection) {
    section += `${competitorSection}\n\n`;
  }

  return section;
}

/**
 * （3）自社の強みを生成
 * @param {Object} answers - 全ての回答データ
 * @returns {string} 自社の強みのテキスト
 */
function generateStrengths(answers) {
  let section = '';

  section += `### 3. 自社や自社の提供する商品・サービスの強み\n\n`;
  section += `当店の強みは以下の通りです。\n\n`;

  // 口コミ情報を活用した強みを生成
  const strengthsSection = generateStrengthsWithReviews(answers);
  section += strengthsSection;

  return section;
}

/**
 * （2）事業別売上高・利益の推移表を生成
 * @param {Object} answers - 全ての回答データ
 * @returns {string} 売上推移表のMarkdown
 */
function generateRevenueTable(answers) {
  const fiscalMonth = parseInt(answers['Q1-5-fiscal']);
  const { getTableLabels } = require('../../src/services/ai/fiscalYearHelper');

  // 期のラベルを生成（決算月超過を考慮）
  const has2PeriodsAgo = !!answers['Q1-8-2期前'];
  const has3PeriodsAgo = !!answers['Q1-8-3期前'];
  const { current, prev1, prev2 } = getTableLabels(fiscalMonth, has2PeriodsAgo, has3PeriodsAgo);

  const labels = {
    current: current.label,
    prev1: prev1 ? prev1.label : null,
    prev2: prev2 ? prev2.label : null,
    isForecast: current.isForecast
  };

  // 列のヘッダーを作成
  let header = '| 項目 |';
  if (labels.prev2) header += ` ${labels.prev2} |`;
  if (labels.prev1) header += ` ${labels.prev1} |`;
  header += ` ${labels.current} |\n`;

  // 区切り線
  let separator = '|-----|';
  if (labels.prev2) separator += '---------------------|';
  if (labels.prev1) separator += '---------------------|';
  separator += '---------------------|\n';

  // 売上行
  let revenueRow = '| **年間売上** |';
  if (labels.prev2) revenueRow += ` ${answers['Q1-8-3期前']}万円 |`;
  if (labels.prev1) revenueRow += ` ${answers['Q1-8-2期前']}万円 |`;
  revenueRow += ` ${answers['Q1-8']}万円 |\n`;

  // 利益行
  let profitRow = '| **経常利益** |';
  if (labels.prev2) profitRow += ` ${answers['Q1-9-3期前']}万円 |`;
  if (labels.prev1) profitRow += ` ${answers['Q1-9-2期前']}万円 |`;
  profitRow += ` ${answers['Q1-9']}万円 |\n`;

  let table = header + separator + revenueRow + profitRow;

  // 売上推移の文章も生成
  let analysis = '';

  // 売上の成長率を計算
  if (answers['Q1-8-2期前']) {
    const prev1Revenue = answers['Q1-8-2期前'];
    const currentRevenue = answers['Q1-8'];
    const growthRate = ((currentRevenue - prev1Revenue) / prev1Revenue * 100).toFixed(1);

    if (growthRate > 0) {
      analysis += `\n売上は前年比${growthRate}%増と順調に成長している。`;
    } else if (growthRate < 0) {
      analysis += `\n売上は前年比${Math.abs(growthRate)}%減となっているが、`;
    } else {
      analysis += `\n売上は前年と同水準を維持している。`;
    }
  }

  // 売上トレンドの情報を追加
  const trend = answers['Q1-8-trend'];
  if (trend === '上昇傾向') {
    analysis += `ここ数年は上昇傾向にあり、今後も成長が見込まれる。`;
  } else if (trend === '下降傾向') {
    analysis += `今回の補助事業により売上回復を目指す。`;
  } else if (trend === '横ばい') {
    analysis += `今回の補助事業により売上拡大を目指す。`;
  }

  return table + analysis;
}

/**
 * 日付をフォーマット（YYYY-MM → YYYY年MM月）
 * @param {string} dateStr - 日付文字列（YYYY-MM形式）
 * @returns {string} フォーマットされた日付
 */
function formatDate(dateStr) {
  if (!dateStr) return '';

  const parts = dateStr.split('-');
  if (parts.length !== 2) return dateStr;

  return `${parts[0]}年${parts[1]}月`;
}

/**
 * （4）業務状況と課題を生成
 * @param {Object} answers - 全ての回答データ
 * @returns {string} 業務状況と課題のテキスト
 */
function generateBusinessOperationsAndIssues(answers) {
  let section = '【業務状況】\n';

  // 1. 従業員構成
  const employeeData = answers['Q1-NEW-10'];
  const totalEmployees = (employeeData?.employee_count || 0) + 1; // +1は代表者自身

  if (employeeData) {
    const fulltimeCount = employeeData.fulltime_count || 0;
    const parttimeCount = employeeData.parttime_count || 0;
    const familyWorkers = employeeData.family_workers || 0;

    if (fulltimeCount > 0 && parttimeCount > 0) {
      section += `現在${fulltimeCount}人の従業員と${parttimeCount}人のアルバイトを雇用し、`;
    } else if (fulltimeCount > 0) {
      section += `現在${fulltimeCount}人の従業員を雇用し、`;
    } else if (parttimeCount > 0) {
      section += `現在${parttimeCount}人のアルバイト・パートを雇用し、`;
    }

    if (familyWorkers > 0) {
      section += `家族従業員${familyWorkers}人を含め、`;
    }

    section += `${totalEmployees}名体制で`;
  }

  // 2. 特に時間を取られている業務
  const timeConsumingTasks = answers['Q1-NEW-11'] || [];
  if (timeConsumingTasks.length > 0) {
    const taskLabels = timeConsumingTasks.map(task => {
      // 業務名のマッピング（より自然な表現に変換）
      const taskMap = {
        '接客・ホール業務': '来客対応',
        '調理・仕込み': '調理',
        '受注管理': '注文受付',
        '梱包・発送': '梱包作業、発送作業',
        '商品陳列・ディスプレイ': '商品陳列',
        '仕入れ・発注': '仕入れ',
        '在庫管理': '在庫管理',
        'レジ・会計': '会計業務',
        '清掃・衛生管理': '清掃',
        '施術業務': '施術',
        '受付・予約管理': '受付',
        'Web運営・更新': 'Web管理',
        'SNS運用・広告': 'SNS運用',
        '経理・帳簿管理': '経理'
      };
      return taskMap[task] || task;
    });

    section += taskLabels.join('や') + 'などを行っている。';

    // 特に時間がかかっている業務を強調
    if (taskLabels.length > 0) {
      section += `特に${taskLabels[0]}に多くの時間を要している。`;
    }
  }

  section += '\n\n';

  // 4. 人員面での課題
  const staffIssues = answers['Q1-NEW-13'] || [];
  if (staffIssues.length > 0 && !staffIssues.includes('特に課題はない')) {
    if (staffIssues.includes('人手が足りない') || staffIssues.includes('繁忙期に対応しきれない')) {
      section += `そのため、今後来客数や売上げを伸ばすにあたり、人員の確保が課題となる。`;
    }

    if (staffIssues.includes('人を雇いたいが人件費が賄えない')) {
      section += `雇用を増やすにしても人件費が賄えないため、販路開拓等による売り上げの確保が急務である。`;
    }

    if (staffIssues.includes('特定の業務に負担が集中している')) {
      section += `また、特定の業務に負担が集中しており、業務の効率化が必要である。`;
    }

    section += '\n\n';
  }

  // 5. 借入金の状況
  const loanStatus = answers['Q1-NEW-14'];
  const loanDetail = answers['Q1-NEW-14-detail'];

  if (loanStatus === '借入金がある' && loanDetail) {
    if (loanDetail.loan_amount && loanDetail.monthly_repayment) {
      section += `また、新型コロナウイルスの影響による営業自粛から立ち直るため、`;
      section += `銀行から${formatCurrency(loanDetail.loan_amount)}の借入れがあり、`;
      section += `毎月${formatCurrency(loanDetail.monthly_repayment)}の返済をしている。`;
    } else if (loanDetail.repayment_burden === 'heavy') {
      section += `また、借入金の返済負担が重く、資金繰りの改善が課題である。`;
    } else if (loanDetail.repayment_burden === 'moderate') {
      section += `また、借入金の返済を行いながら、安定した経営を続けている。`;
    }

    section += '\n\n';
  }

  // 6. その他の経営課題
  const salesIssues = answers['Q1-NEW-16'] || [];
  const marketingIssues = answers['Q1-NEW-17'] || [];
  const operationIssues = answers['Q1-NEW-18'] || [];

  const otherIssues = [
    ...salesIssues.filter(i => i !== '特に課題なし' && i !== '特に大きな課題はない'),
    ...marketingIssues.filter(i => i !== '特に課題なし' && i !== '特に大きな課題はない'),
    ...operationIssues.filter(i => i !== '特に課題なし' && i !== '特に大きな課題はない')
  ];

  if (otherIssues.length > 0) {
    section += `さらに、`;

    const issueTexts = [];

    // 売上面
    if (salesIssues.includes('新規顧客不足')) {
      issueTexts.push('新規顧客の獲得');
    }
    if (salesIssues.includes('認知度不足')) {
      issueTexts.push('認知度の向上');
    }

    // マーケティング面
    if (marketingIssues.includes('Web未整備')) {
      issueTexts.push('Webサイトの整備');
    }
    if (marketingIssues.includes('SNS未活用')) {
      issueTexts.push('SNSの活用');
    }
    if (marketingIssues.includes('オンライン販売未対応')) {
      issueTexts.push('オンライン販売への対応');
    }

    // 業務効率面
    if (operationIssues.includes('設備老朽化')) {
      issueTexts.push('設備の老朽化');
    }
    if (operationIssues.includes('IT化遅れ')) {
      issueTexts.push('IT化の遅れ');
    }

    if (issueTexts.length > 0) {
      section += issueTexts.join('、') + 'といった課題もある。';
    }
  }

  return section;
}

/**
 * 金額フォーマット関数
 * @param {number} amount - 金額
 * @returns {string} フォーマットされた金額
 */
function formatCurrency(amount) {
  if (!amount) return '';

  if (amount >= 10000000) {
    return `約${Math.round(amount / 10000000)}千万円`;
  } else if (amount >= 1000000) {
    return `約${Math.round(amount / 1000000)}百万円`;
  } else {
    return `約${amount.toLocaleString()}円`;
  }
}

/**
 * 様式2の全体を生成
 * @param {Object} answers - 全ての回答データ
 * @returns {string} 様式2の全文
 */
function generateForm2(answers) {
  let form2 = '';

  form2 += `# 様式2（経営計画書兼補助事業計画書）\n\n`;
  form2 += `## 【経営計画】\n\n`;
  form2 += `### 1. 企業概要\n\n`;
  form2 += `#### （1）事業の概要\n\n`;
  form2 += generateBusinessOverview(answers);
  form2 += `\n\n`;

  // （2）事業別売上高・利益の推移
  form2 += `#### （2）事業別売上高・利益の推移\n\n`;
  form2 += generateRevenueTable(answers);
  form2 += `\n\n`;

  form2 += generateMarketAnalysis(answers);
  form2 += `\n\n`;

  form2 += generateStrengths(answers);
  form2 += `\n\n`;

  // （4）業務状況と課題
  form2 += `#### （4）業務状況と課題\n\n`;
  form2 += generateBusinessOperationsAndIssues(answers);
  form2 += `\n\n`;

  // Phase 4, Phase 5のデータがあれば追加
  // ※現時点ではPhase 1のみ実装

  return form2;
}

module.exports = {
  generateBusinessOverview,
  generateCustomerSection,
  generateMarketAnalysis,
  generateStrengths,
  generateRevenueTable,
  generateBusinessOperationsAndIssues,
  formatCurrency,
  generateForm2
};
