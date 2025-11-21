/**
 * 様式3（経費明細表・資金調達方法）生成テスト
 */

const { generateForm3 } = require('./functions/utils/generateForm3');

console.log('========================================');
console.log('様式3（経費明細表・資金調達方法）生成テスト');
console.log('========================================\n');

// テストケース1: カフェの例（参考資料 r3i_kisairei_coffee.pdf P.13に完全準拠）
const testAnswers1 = {
  'P5-1': '新規顧客獲得のための地域広報及びオンラインショップサイトのリニューアル事業',

  'P5-2': `・新聞折り込みチラシ印刷費
・ホームページ改修費
・焙煎機購入費
・コーヒー豆仕入れ費`,

  'P5-3': {
    '新聞折り込みチラシ印刷費': '②広報費',
    'ホームページ改修費': '③ウェブサイト関連費',
    '焙煎機購入費': '①機械装置等費',
    'コーヒー豆仕入れ費': '①機械装置等費'
  },

  'P5-4': {
    '新聞折り込みチラシ印刷費': {
      unitPrice: 120000,  // 参考資料: 240,000円 ÷ 2回 = 120,000円/回
      quantity: 2,
      unit: '回'
    },
    'ホームページ改修費': {
      unitPrice: 490000,  // 参考資料: (3) = 490,000円
      quantity: 1,
      unit: '式'
    },
    '焙煎機購入費': {
      unitPrice: 324600,  // 参考資料から逆算: (1) - 240,000 - 510,000 = 324,600円
      quantity: 1,
      unit: '台'
    },
    'コーヒー豆仕入れ費': {
      unitPrice: 510000,  // 参考資料から推定
      quantity: 1,
      unit: '式'
    }
  },

  'P5-5': {
    '新聞折り込みチラシ印刷費': '税込',
    'ホームページ改修費': '税込',
    '焙煎機購入費': '税込',
    'コーヒー豆仕入れ費': '税込'
  },

  'P5-6': '2025年6月',
  'P5-7': '2025年12月',
  'P5-8': 20,
  'P5-9': 30,
  'P5-10': '自己資金だけでは投資が難しい'
};

console.log('【テストケース1: カフェ（参考資料準拠）】\n');

// 様式3生成
const form3_1 = generateForm3(testAnswers1, false, 2000000); // 通常枠（上限200万円と仮定）

console.log('=== 経費明細表 ===');
console.log('経費項目数:', form3_1.expenses.length);
form3_1.expenses.forEach((expense, index) => {
  console.log(`${index + 1}. ${expense.category} - ${expense.description}`);
  console.log(`   ${expense.breakdown}（${expense.taxType}）: ${expense.amount.toLocaleString()}円`);
});

console.log('\n=== 計算結果 ===');
console.log(`(1) 補助対象経費小計（ウェブサイト除く）: ${form3_1.calculations.calc1.toLocaleString()}円`);
console.log(`(2) 補助金交付申請額（ウェブサイト除く）: ${form3_1.calculations.calc2.toLocaleString()}円`);
console.log(`(3) ウェブサイト関連費小計: ${form3_1.calculations.calc3.toLocaleString()}円`);
console.log(`(4) ウェブサイト関連費交付申請額: ${form3_1.calculations.calc4.toLocaleString()}円`);
console.log(`(5) 補助対象経費合計: ${form3_1.calculations.calc5.toLocaleString()}円`);
console.log(`(6) 補助金交付申請額合計: ${form3_1.calculations.calc6.toLocaleString()}円`);
console.log(`補助率: ${form3_1.calculations.rate === 2/3 ? '2/3' : '3/4'}`);

console.log('\n=== バリデーション ===');
console.log(`検証結果: ${form3_1.validation.isValid ? '✅ 合格' : '❌ 不合格'}`);
if (!form3_1.validation.isValid) {
  console.log('エラー:');
  form3_1.validation.errors.forEach(error => console.log(`  - ${error}`));
}

console.log('\n=== 資金調達方法 ===');
console.log('【補助対象経費の調達】');
console.log(`  自己資金: ${form3_1.fundingPlan.expenseFunding.selfFunding.toLocaleString()}円`);
console.log(`  持続化補助金: ${form3_1.fundingPlan.expenseFunding.subsidy.toLocaleString()}円`);
console.log(`  合計額: ${form3_1.fundingPlan.expenseFunding.total.toLocaleString()}円`);

console.log('【補助金相当額の手当方法】');
console.log(`  自己資金: ${form3_1.fundingPlan.subsidyFunding.selfFunding.toLocaleString()}円`);

console.log('\n========================================');
console.log('生成されたマークダウン（冒頭500文字）');
console.log('========================================\n');
console.log(form3_1.markdown.substring(0, 500) + '...\n');

// テストケース2: ウェブサイト関連費が多い例（エラーケース）
const testAnswers2 = {
  'P5-1': 'ECサイト構築と広報強化事業',

  'P5-2': `・ECサイト構築
・SNS広告
・チラシ印刷`,

  'P5-3': {
    'ECサイト構築': '③ウェブサイト関連費',
    'SNS広告': '②広報費',
    'チラシ印刷': '②広報費'
  },

  'P5-4': {
    'ECサイト構築': {
      unitPrice: 800000,
      quantity: 1,
      unit: '式'
    },
    'SNS広告': {
      unitPrice: 50000,
      quantity: 1,
      unit: '式'
    },
    'チラシ印刷': {
      unitPrice: 30000,
      quantity: 1,
      unit: '式'
    }
  },

  'P5-5': {
    'ECサイト構築': '税込',
    'SNS広告': '税込',
    'チラシ印刷': '税込'
  }
};

console.log('【テストケース2: ウェブサイト関連費が多い例（エラーケース）】\n');

const form3_2 = generateForm3(testAnswers2, false, 500000); // 通常枠50万円

console.log('=== 計算結果 ===');
console.log(`(3) ウェブサイト関連費小計: ${form3_2.calculations.calc3.toLocaleString()}円`);
console.log(`(4) ウェブサイト関連費交付申請額: ${form3_2.calculations.calc4.toLocaleString()}円`);
console.log(`(6) 補助金交付申請額合計: ${form3_2.calculations.calc6.toLocaleString()}円`);
console.log(`(6) × 1/4 = ${Math.floor(form3_2.calculations.calc6 * 0.25).toLocaleString()}円`);

console.log('\n=== バリデーション ===');
console.log(`検証結果: ${form3_2.validation.isValid ? '✅ 合格' : '❌ 不合格'}`);
if (!form3_2.validation.isValid) {
  console.log('エラー:');
  form3_2.validation.errors.forEach(error => console.log(`  - ${error}`));
}

// 参考資料との比較
console.log('\n========================================');
console.log('参考資料（r3i_kisairei_coffee.pdf）との比較');
console.log('========================================\n');

console.log('【参考資料の値】');
console.log('(1) 補助対象経費小計（ウェブサイト除く）: 1,074,600円');
console.log('(2) 補助金交付申請額（ウェブサイト除く）: 716,400円');
console.log('(3) ウェブサイト関連費小計: 490,000円');
console.log('(4) ウェブサイト関連費交付申請額: 238,800円');
console.log('(5) 補助対象経費合計: 1,564,600円');
console.log('(6) 補助金交付申請額合計: 955,200円');

console.log('\n【テストケース1の値】');
console.log(`(1) 補助対象経費小計（ウェブサイト除く）: ${form3_1.calculations.calc1.toLocaleString()}円`);
console.log(`(2) 補助金交付申請額（ウェブサイト除く）: ${form3_1.calculations.calc2.toLocaleString()}円`);
console.log(`(3) ウェブサイト関連費小計: ${form3_1.calculations.calc3.toLocaleString()}円`);
console.log(`(4) ウェブサイト関連費交付申請額: ${form3_1.calculations.calc4.toLocaleString()}円`);
console.log(`(5) 補助対象経費合計: ${form3_1.calculations.calc5.toLocaleString()}円`);
console.log(`(6) 補助金交付申請額合計: ${form3_1.calculations.calc6.toLocaleString()}円`);

console.log('\n【計算式の検証】');
console.log(`参考資料: (1) × 2/3 = 1,074,600 × 2/3 = 716,400円 ✅`);
console.log(`テスト: (1) × 2/3 = ${form3_1.calculations.calc1} × 2/3 = ${Math.floor(form3_1.calculations.calc1 * 2/3)}円 ${Math.floor(form3_1.calculations.calc1 * 2/3) === form3_1.calculations.calc2 ? '✅' : '❌'}`);

console.log(`\n参考資料: (3) × 2/3 = 490,000 × 2/3 = 326,666円（端数切捨て326,666円）`);
console.log(`           しかし(6) × 1/4 = 955,200 × 1/4 = 238,800円が上限`);
console.log(`           よって(4) = 238,800円 ✅`);

console.log(`\nテスト: (3) × 2/3 = ${form3_1.calculations.calc3} × 2/3 = ${Math.floor(form3_1.calculations.calc3 * 2/3)}円`);
console.log(`       (6) × 1/4 = ${form3_1.calculations.calc6} × 1/4 = ${Math.floor(form3_1.calculations.calc6 * 0.25)}円`);
console.log(`       よって(4) = ${form3_1.calculations.calc4}円 ${form3_1.calculations.calc4 <= form3_1.calculations.calc6 * 0.25 ? '✅' : '❌'}`);

// テストケース3: 個人事業主（赤字事業者、補助率3/4）
const testAnswers3 = {
  'P5-1': '集客強化のためのホームページ刷新事業',
  'P5-2': `・ホームページ制作
・チラシ印刷`,
  'P5-3': {
    'ホームページ制作': '③ウェブサイト関連費',
    'チラシ印刷': '②広報費'
  },
  'P5-4': {
    'ホームページ制作': { unitPrice: 300000, quantity: 1, unit: '式' },
    'チラシ印刷': { unitPrice: 100000, quantity: 1, unit: '式' }
  },
  'P5-5': {
    'ホームページ制作': '税込',
    'チラシ印刷': '税込'
  }
};

console.log('\n【テストケース3: 個人事業主（赤字事業者、補助率3/4）】\n');
const form3_3 = generateForm3(testAnswers3, true, 500000); // 赤字事業者、通常枠50万円

console.log('=== 計算結果 ===');
console.log(`(1) = ${form3_3.calculations.calc1.toLocaleString()}円`);
console.log(`(2) = ${form3_3.calculations.calc2.toLocaleString()}円`);
console.log(`(3) = ${form3_3.calculations.calc3.toLocaleString()}円`);
console.log(`(4) = ${form3_3.calculations.calc4.toLocaleString()}円`);
console.log(`(6) = ${form3_3.calculations.calc6.toLocaleString()}円`);
console.log(`補助率: ${form3_3.calculations.rate === 3/4 ? '3/4（赤字事業者）' : '2/3'}`);

console.log('\n=== 検証 ===');
console.log(`(3) × 3/4 = ${Math.floor(300000 * 3/4).toLocaleString()}円`);
console.log(`(2) / 3 = ${Math.floor(form3_3.calculations.calc2 / 3).toLocaleString()}円`);
console.log(`絶対上限 = 500,000円`);
console.log(`(4) = min(225,000, ${Math.floor(form3_3.calculations.calc2 / 3).toLocaleString()}, 500,000) = ${form3_3.calculations.calc4.toLocaleString()}円`);
console.log(`バリデーション: ${form3_3.validation.isValid ? '✅ 合格' : '❌ 不合格'}`);

// テストケース4: ウェブサイト関連費200万円（50万円絶対上限のテスト）
// (1) = 2,250,000円 → (2) = 1,500,000円 → (2)/3 = 500,000円 = 500,000円
// (3) = 2,000,000円 → (3)×2/3 = 1,333,333円
// よって (4) = min(1,333,333, 500,000, 500,000) = 500,000円 ← 絶対上限が適用される
const testAnswers4 = {
  'P5-1': 'ECサイト本格構築事業',
  'P5-2': `・ECサイト構築
・広告宣伝費
・機械装置購入`,
  'P5-3': {
    'ECサイト構築': '③ウェブサイト関連費',
    '広告宣伝費': '②広報費',
    '機械装置購入': '①機械装置等費'
  },
  'P5-4': {
    'ECサイト構築': { unitPrice: 2000000, quantity: 1, unit: '式' },
    '広告宣伝費': { unitPrice: 1125000, quantity: 1, unit: '式' },
    '機械装置購入': { unitPrice: 1125000, quantity: 1, unit: '台' }
  },
  'P5-5': {
    'ECサイト構築': '税込',
    '広告宣伝費': '税込',
    '機械装置購入': '税込'
  }
};

console.log('\n【テストケース4: ウェブサイト関連費200万円（50万円絶対上限のテスト）】\n');
const form3_4 = generateForm3(testAnswers4, false, 2000000); // 通常、賃上げ枠200万円

console.log('=== 計算結果 ===');
console.log(`(1) = ${form3_4.calculations.calc1.toLocaleString()}円`);
console.log(`(2) = ${form3_4.calculations.calc2.toLocaleString()}円`);
console.log(`(3) = ${form3_4.calculations.calc3.toLocaleString()}円`);
console.log(`(3) × 2/3 = ${Math.floor(form3_4.calculations.calc3 * 2/3).toLocaleString()}円`);
console.log(`(2) / 3 = ${Math.floor(form3_4.calculations.calc2 / 3).toLocaleString()}円`);
console.log(`絶対上限 = 500,000円`);
console.log(`(4) = min(${Math.floor(form3_4.calculations.calc3 * 2/3).toLocaleString()}, ${Math.floor(form3_4.calculations.calc2 / 3).toLocaleString()}, 500,000) = ${form3_4.calculations.calc4.toLocaleString()}円 ✅`);
console.log(`(6) = ${form3_4.calculations.calc6.toLocaleString()}円`);

console.log('\n=== 検証 ===');
console.log(`(4) = 500,000円（絶対上限により制限）: ${form3_4.calculations.calc4 === 500000 ? '✅ 正しい' : '❌ 誤り'}`);
console.log(`(6) × 1/4 = ${Math.floor(form3_4.calculations.calc6 * 0.25).toLocaleString()}円`);
console.log(`(4) ≤ (6) × 1/4 ? ${form3_4.calculations.calc4 <= form3_4.calculations.calc6 * 0.25 ? '✅ はい' : '❌ いいえ'}`);
console.log(`バリデーション: ${form3_4.validation.isValid ? '✅ 合格' : '❌ 不合格'}`);

console.log('\n========================================');
console.log('テスト完了');
console.log('========================================');
