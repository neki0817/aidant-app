/**
 * 業種別回答傾向分析スクリプト
 */

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('simulation_results/batch_simulation_2025-11-16T10-17-42-257Z.json', 'utf8'));

console.log('========================================');
console.log('業種別回答サンプル分析');
console.log('========================================\n');

// カフェの例
const cafe = data.results.find(r => r.businessType === 'カフェ');
console.log('【カフェ - P2-1回答例（ターゲット顧客）】');
console.log(cafe.answers['P2-1'].answer + '\n');

// ラーメン店の例
const ramen = data.results.find(r => r.businessType === 'ラーメン店');
console.log('【ラーメン店 - P2-1回答例（ターゲット顧客）】');
console.log(ramen.answers['P2-1'].answer + '\n');

// イタリアンの例
const italian = data.results.find(r => r.businessType === 'イタリアンレストラン');
console.log('【イタリアンレストラン - P3-1回答例（強み）】');
console.log(italian.answers['P3-1'].answer.substring(0, 400) + '...\n');

// 寿司店の例
const sushi = data.results.find(r => r.businessType === '寿司店');
console.log('【寿司店 - P3-2回答例（こだわり）】');
console.log(sushi.answers['P3-2'].answer + '\n');

// 焼肉店の例
const yakiniku = data.results.find(r => r.businessType === '焼肉店');
console.log('【焼肉店 - P4-1回答例（今後の目標）】');
console.log(yakiniku.answers['P4-1'].answer + '\n');

console.log('========================================');
console.log('数値データの抽出例');
console.log('========================================\n');

console.log('【各店舗の具体的数値の使用状況】');
data.results.forEach(store => {
  const numericMentions = [];
  Object.values(store.answers).forEach(ans => {
    // 数値パターンを検出
    const numbers = ans.answer.match(/\d+[万千百十]?円|\d+％|\d+点|\d+代|\d+年|\d+名|\d+件/g);
    if (numbers && numbers.length > 0) {
      numericMentions.push(...numbers.slice(0, 3)); // 最初の3つ
    }
  });
  console.log(`${store.businessType.padEnd(20)} | 例: ${numericMentions.slice(0, 5).join(', ')}`);
});

console.log('\n========================================');
console.log('特徴的な表現パターン');
console.log('========================================\n');

const patterns = {
  '具体的数値': 0,
  '顧客の声': 0,
  'Google評価言及': 0,
  '専門用語': 0,
  '比較表現': 0
};

data.results.forEach(store => {
  Object.values(store.answers).forEach(ans => {
    if (ans.answer.match(/\d+/)) patterns['具体的数値']++;
    if (ans.answer.match(/「.*」|お客様.*言|評価|レビュー|口コミ/)) patterns['顧客の声']++;
    if (ans.answer.match(/Google Maps|4\.\d点|\d+件のレビュー/)) patterns['Google評価言及']++;
    if (ans.answer.match(/自家焙煎|江戸前|和牛|スパイス|ナチュラル|炉端/)) patterns['専門用語']++;
    if (ans.answer.match(/他店|競合|差別化|優れている|独自/)) patterns['比較表現']++;
  });
});

console.log('【表現パターンの出現回数】');
Object.entries(patterns).forEach(([pattern, count]) => {
  console.log(`${pattern.padEnd(15)}: ${count}回 (${(count / 160 * 100).toFixed(1)}%)`);
});

console.log('\n========================================');
console.log('Phase別の特徴');
console.log('========================================\n');

console.log('【Phase 2 - 顧客ニーズと市場の動向】');
console.log('- 年齢層・性別・職業の具体的記述が多い');
console.log('- 来店パターン（ランチ/ディナー、平日/土日）を明記');
console.log('- 客数・売上の具体的数値を含む');
console.log('');

console.log('【Phase 3 - 自社の強み】');
console.log('- 専門用語を適切に使用（自家焙煎、江戸前、和牛等）');
console.log('- Google Maps評価を積極的に引用');
console.log('- 競合との差別化ポイントを明確化');
console.log('');

console.log('【Phase 4 - 経営方針・目標】');
console.log('- 売上目標を具体的な数値で記述');
console.log('- 実施時期を明確に記載');
console.log('- 補助金の活用方法を具体的に説明');
console.log('');

console.log('【Phase 5 - 補助事業の内容】');
console.log('- 購入予定の設備・システムを詳細に記述');
console.log('- 費用の内訳を具体的に記載');
console.log('- 期待される効果を数値で表現');
