/**
 * 様式3（経費明細表・資金調達方法）自動生成ロジック
 *
 * Phase 5の回答データから様式3を自動生成する
 */

/**
 * P5-2の回答をパースして項目リストを取得
 */
function parseExpenseItems(p5_2_answer) {
  if (!p5_2_answer) return [];

  // 改行で分割し、先頭の「・」「-」「*」を除去
  const items = p5_2_answer
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^[・\-\*]\s*/, ''));

  return items;
}

/**
 * 経費明細表の生成
 *
 * @param {Object} answers - Phase 5の全回答
 * @returns {Array} 経費項目の配列
 */
function generateExpenseBreakdown(answers) {
  const items = parseExpenseItems(answers['P5-2']);
  const categories = answers['P5-3'] || {};
  const costs = answers['P5-4'] || {};
  const taxTypes = answers['P5-5'] || {};

  const expenses = items.map(item => {
    const costData = costs[item] || {};
    const unitPrice = costData.unitPrice || 0;
    const quantity = costData.quantity || 1;
    const unit = costData.unit || '式';

    return {
      category: categories[item] || '⑪委託・外注費',
      description: item,
      breakdown: `${unitPrice.toLocaleString()}円×${quantity}${unit}`,
      taxType: taxTypes[item] || '税込',
      amount: unitPrice * quantity
    };
  });

  return expenses;
}

/**
 * 補助金額の自動計算
 *
 * @param {Array} expenses - 経費明細表
 * @param {Boolean} isDeficitBusiness - 赤字事業者かどうか
 * @returns {Object} 計算結果
 */
function calculateSubsidy(expenses, isDeficitBusiness = false) {
  // 補助率: 赤字事業者は3/4、それ以外は2/3
  const rate = isDeficitBusiness ? 3 / 4 : 2 / 3;

  // ウェブサイト関連費とそれ以外を分離
  const webExpenses = expenses.filter(e => e.category === '③ウェブサイト関連費');
  const otherExpenses = expenses.filter(e => e.category !== '③ウェブサイト関連費');

  // (1) 補助対象経費小計（ウェブサイト除く）
  const calc1 = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

  // (2) 補助金交付申請額（ウェブサイト除く）
  const calc2 = Math.floor(calc1 * rate);

  // (3) ウェブサイト関連費に係る補助対象経費小計
  const calc3 = webExpenses.reduce((sum, e) => sum + e.amount, 0);

  // (4) ウェブサイト関連費に係る交付申請額（3つの上限のうち最小値）
  // 1. (3) × 補助率
  // 2. (2) / 3（1/4制限を解いた結果: (6) = (2) + (4) より (4) ≤ (6) × 1/4 → (4) ≤ (2) / 3）
  // 3. 絶対上限50万円
  const calc4 = Math.min(
    Math.floor(calc3 * rate),  // (3) × 補助率
    Math.floor(calc2 / 3),      // (2) / 3（1/4制限）
    500000                      // 絶対上限50万円
  );

  // (5) 補助対象経費合計
  const calc5 = calc1 + calc3;

  // (6) 補助金交付申請額合計
  const calc6 = calc2 + calc4;

  return {
    calc1, // 補助対象経費小計（ウェブサイト除く）
    calc2, // 補助金交付申請額（ウェブサイト除く）
    calc3, // ウェブサイト関連費小計
    calc4, // ウェブサイト関連費交付申請額
    calc5, // 補助対象経費合計
    calc6, // 補助金交付申請額合計
    rate   // 補助率
  };
}

/**
 * 資金調達方法の生成
 *
 * @param {Number} calc5 - 補助対象経費合計
 * @param {Number} calc6 - 補助金交付申請額合計
 * @returns {Object} 資金調達方法
 */
function generateFundingPlan(calc5, calc6) {
  const selfFunding = calc5 - calc6; // 自己資金

  return {
    expenseFunding: {
      selfFunding: selfFunding,
      subsidy: calc6,
      bankLoan: 0,
      other: 0,
      total: calc5
    },
    subsidyFunding: {
      selfFunding: calc6, // 補助金入金までは自己資金で賄う
      bankLoan: 0,
      other: 0
    }
  };
}

/**
 * バリデーション
 *
 * @param {Array} expenses - 経費明細表
 * @param {Object} calculations - 計算結果
 * @param {Number} subsidyLimit - 補助金上限額（円）
 * @returns {Object} バリデーション結果
 */
function validateForm3(expenses, calculations, subsidyLimit = 500000) {
  const errors = [];

  // (1) + (3) = (5) の確認
  const expectedCalc5 = calculations.calc1 + calculations.calc3;
  if (Math.abs(calculations.calc5 - expectedCalc5) > 1) {
    errors.push('補助対象経費の合計が一致しません');
  }

  // (2) + (4) = (6) の確認
  const expectedCalc6 = calculations.calc2 + calculations.calc4;
  if (Math.abs(calculations.calc6 - expectedCalc6) > 1) {
    errors.push('補助金交付申請額の合計が一致しません');
  }

  // (4) ≤ (6) × 1/4 の確認
  if (calculations.calc4 > calculations.calc6 * 0.25 + 1) {
    errors.push('ウェブサイト関連費が全体の補助金額の1/4を超えています。ウェブサイト関連費を減額するか、他の経費を増やしてください。');
  }

  // 補助金額が上限を超えていないか
  if (calculations.calc6 > subsidyLimit) {
    errors.push(`補助金額が上限（${subsidyLimit.toLocaleString()}円）を超えています。経費を見直してください。`);
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * 様式3のマークダウン生成
 *
 * @param {Array} expenses - 経費明細表
 * @param {Object} calculations - 計算結果
 * @param {Object} fundingPlan - 資金調達方法
 * @returns {String} マークダウン形式の様式3
 */
function generateForm3Markdown(expenses, calculations, fundingPlan) {
  const { calc1, calc2, calc3, calc4, calc5, calc6, rate } = calculations;
  const ratePercent = rate === 3 / 4 ? '3/4' : '2/3';

  let markdown = `## Ⅱ 経費明細表

| 経費区分 | 内容・必要理由 | 経費内訳（単価×回数） | 補助対象経費（円） |
|---------|--------------|-------------------|------------------|
`;

  // 経費項目を追加
  expenses.forEach(expense => {
    markdown += `| ${expense.category} | ${expense.description} | ${expense.breakdown}（${expense.taxType}） | ${expense.amount.toLocaleString()} |\n`;
  });

  markdown += `

**計算**

- (1) 補助対象経費小計（ウェブサイト関連費を除く）: **${calc1.toLocaleString()}円**
- (2) 補助金交付申請額（ウェブサイト関連費を除く） [(1)×${ratePercent}]: **${calc2.toLocaleString()}円**
- (3) ウェブサイト関連費に係る補助対象経費小計: **${calc3.toLocaleString()}円**
- (4) ウェブサイト関連費に係る交付申請額 [(3)×${ratePercent}、ただし(6)の1/4が上限]: **${calc4.toLocaleString()}円**
- (5) 補助対象経費合計 [(1)+(3)]: **${calc5.toLocaleString()}円**
- (6) 補助金交付申請額合計 [(2)+(4)]: **${calc6.toLocaleString()}円**

**ウェブサイト関連費が補助金交付申請額合計の1/4以内であるかの確認**

- (4) = ${calc4.toLocaleString()}円
- (6) × 1/4 = ${Math.floor(calc6 * 0.25).toLocaleString()}円
- 結果: ${calc4 <= calc6 * 0.25 ? '✅ はい（要件を満たしています）' : '❌ いいえ（要件を満たしていません）'}

---

## Ⅲ 資金調達方法

### 補助対象経費の調達

| 区分 | 金額（円） |
|-----|----------|
| 1. 自己資金 | ${fundingPlan.expenseFunding.selfFunding.toLocaleString()} |
| 2. 持続化補助金 | ${fundingPlan.expenseFunding.subsidy.toLocaleString()} |
| 3. 金融機関からの借入金 | ${fundingPlan.expenseFunding.bankLoan.toLocaleString()} |
| 4. その他 | ${fundingPlan.expenseFunding.other.toLocaleString()} |
| **5. 合計額** | **${fundingPlan.expenseFunding.total.toLocaleString()}** |

### 「2. 補助金」相当額の手当方法

| 区分 | 金額（円） |
|-----|----------|
| 2-1. 自己資金 | ${fundingPlan.subsidyFunding.selfFunding.toLocaleString()} |
| 2-2. 金融機関からの借入金 | ${fundingPlan.subsidyFunding.bankLoan.toLocaleString()} |
| 2-3. その他 | ${fundingPlan.subsidyFunding.other.toLocaleString()} |

※補助事業は終了後の精算払いのため、補助金入金までは自己資金で賄う必要があります。
`;

  return markdown;
}

/**
 * 様式3の完全生成
 *
 * @param {Object} answers - Phase 5の全回答
 * @param {Boolean} isDeficitBusiness - 赤字事業者かどうか
 * @param {Number} subsidyLimit - 補助金上限額（円）
 * @returns {Object} 様式3の完全データ
 */
function generateForm3(answers, isDeficitBusiness = false, subsidyLimit = 500000) {
  // 1. 経費明細表の生成
  const expenses = generateExpenseBreakdown(answers);

  // 2. 補助金額の計算
  const calculations = calculateSubsidy(expenses, isDeficitBusiness);

  // 3. 資金調達方法の生成
  const fundingPlan = generateFundingPlan(calculations.calc5, calculations.calc6);

  // 4. バリデーション
  const validation = validateForm3(expenses, calculations, subsidyLimit);

  // 5. マークダウン生成
  const markdown = generateForm3Markdown(expenses, calculations, fundingPlan);

  return {
    expenses,
    calculations,
    fundingPlan,
    validation,
    markdown
  };
}

module.exports = {
  parseExpenseItems,
  generateExpenseBreakdown,
  calculateSubsidy,
  generateFundingPlan,
  validateForm3,
  generateForm3Markdown,
  generateForm3
};
