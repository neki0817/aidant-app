/**
 * 業種別の回答例とヒントを提供するモジュール
 *
 * 「業種別回答例と創作ガイドライン.md」に基づいて、
 * ユーザーの業種に応じた適切な回答例を動的に生成する
 */

/**
 * 業種分類
 */
export const INDUSTRY_CATEGORIES = {
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
  RETAIL: 'retail',
  BEAUTY: 'beauty',
  LODGING: 'lodging',
  SERVICE: 'service',
  OTHER: 'other'
};

/**
 * 業種を判定する
 * @param {string} businessType - Q1-1の回答（業種）
 * @returns {string} 業種カテゴリ
 */
export const detectIndustry = (businessType) => {
  if (!businessType) return INDUSTRY_CATEGORIES.OTHER;

  const type = businessType.toLowerCase();

  // 飲食業
  if (type.includes('レストラン') || type.includes('イタリアン') ||
      type.includes('フレンチ') || type.includes('中華') ||
      type.includes('和食') || type.includes('居酒屋')) {
    return INDUSTRY_CATEGORIES.RESTAURANT;
  }

  // カフェ
  if (type.includes('カフェ') || type.includes('喫茶')) {
    return INDUSTRY_CATEGORIES.CAFE;
  }

  // 美容業
  if (type.includes('美容') || type.includes('エステ') ||
      type.includes('ネイル') || type.includes('理容')) {
    return INDUSTRY_CATEGORIES.BEAUTY;
  }

  // 小売業
  if (type.includes('小売') || type.includes('販売') ||
      type.includes('ショップ') || type.includes('雑貨') ||
      type.includes('アパレル') || type.includes('書店')) {
    return INDUSTRY_CATEGORIES.RETAIL;
  }

  // 宿泊業
  if (type.includes('宿泊') || type.includes('ホテル') ||
      type.includes('旅館') || type.includes('民泊') ||
      type.includes('ゲストハウス')) {
    return INDUSTRY_CATEGORIES.LODGING;
  }

  // サービス業
  if (type.includes('サービス') || type.includes('整体') ||
      type.includes('教室') || type.includes('スクール')) {
    return INDUSTRY_CATEGORIES.SERVICE;
  }

  return INDUSTRY_CATEGORIES.OTHER;
};

/**
 * 業種別の財務データ目安
 */
export const INDUSTRY_BENCHMARKS = {
  [INDUSTRY_CATEGORIES.RESTAURANT]: {
    name: 'レストラン',
    annualSales: { min: 1200, max: 2400, average: 1800 }, // 万円
    profitRate: { min: 8, max: 15, average: 10 }, // %
    grossProfitRate: { min: 60, max: 70, average: 65 }, // %
    customerUnitPrice: { min: 3000, max: 8000, average: 5000 } // 円
  },
  [INDUSTRY_CATEGORIES.CAFE]: {
    name: 'カフェ',
    annualSales: { min: 720, max: 1200, average: 960 },
    profitRate: { min: 8, max: 15, average: 12 },
    grossProfitRate: { min: 60, max: 70, average: 65 },
    customerUnitPrice: { min: 1000, max: 2000, average: 1500 }
  },
  [INDUSTRY_CATEGORIES.BEAUTY]: {
    name: '美容業',
    annualSales: { min: 1200, max: 3600, average: 1800 },
    profitRate: { min: 10, max: 20, average: 15 },
    grossProfitRate: { min: 70, max: 80, average: 75 },
    customerUnitPrice: { min: 5000, max: 15000, average: 8000 }
  },
  [INDUSTRY_CATEGORIES.RETAIL]: {
    name: '小売業',
    annualSales: { min: 1000, max: 5000, average: 2000 },
    profitRate: { min: 3, max: 10, average: 5 },
    grossProfitRate: { min: 25, max: 35, average: 30 },
    customerUnitPrice: { min: 2000, max: 10000, average: 5000 }
  },
  [INDUSTRY_CATEGORIES.LODGING]: {
    name: '宿泊業',
    annualSales: { min: 2000, max: 10000, average: 5000 },
    profitRate: { min: 5, max: 15, average: 10 },
    grossProfitRate: { min: 40, max: 50, average: 45 },
    customerUnitPrice: { min: 8000, max: 30000, average: 15000 }
  },
  [INDUSTRY_CATEGORIES.SERVICE]: {
    name: 'サービス業',
    annualSales: { min: 800, max: 2400, average: 1500 },
    profitRate: { min: 10, max: 25, average: 18 },
    grossProfitRate: { min: 60, max: 80, average: 70 },
    customerUnitPrice: { min: 3000, max: 10000, average: 6000 }
  },
  [INDUSTRY_CATEGORIES.OTHER]: {
    name: 'その他',
    annualSales: { min: 1000, max: 3000, average: 1500 },
    profitRate: { min: 5, max: 15, average: 10 },
    grossProfitRate: { min: 40, max: 60, average: 50 },
    customerUnitPrice: { min: 3000, max: 10000, average: 5000 }
  }
};

/**
 * 業種別のベンチマークを取得
 * @param {string} businessType - Q1-1の回答
 * @returns {object} ベンチマークデータ
 */
export const getBenchmark = (businessType) => {
  const industry = detectIndustry(businessType);
  return INDUSTRY_BENCHMARKS[industry];
};

/**
 * Phase 2（顧客分析）の業種別回答例
 */
export const PHASE2_EXAMPLES = {
  [INDUSTRY_CATEGORIES.RESTAURANT]: {
    targetCustomer: '30-50代の女性グループ、デート利用のカップル',
    whyChosen: '本格的なイタリアンが楽しめる、雰囲気が良い',
    customerNeeds: '美味しい料理とゆったりした空間、特別な時間',
    needsChange: 'コロナ後、テイクアウト需要が増えた。平日ランチの個人客も増加',
    marketTrends: '駅前再開発で人通りが増加。インバウンド観光客も回復傾向',
    competitorComparison: 'Google口コミ4.3以上を維持。リピーター率が高い'
  },
  [INDUSTRY_CATEGORIES.CAFE]: {
    targetCustomer: '20-40代の女性、在宅ワーカー、学生',
    whyChosen: '落ち着いた雰囲気、Wi-Fi完備、居心地が良い',
    customerNeeds: '美味しいコーヒーと作業できる静かな空間',
    needsChange: 'リモートワーク需要で平日昼間の利用が増加。電源席の要望が多い',
    marketTrends: '駅周辺の競合が増加。差別化が必要',
    competitorComparison: '常連客が多く、SNSでの口コミも良好'
  },
  [INDUSTRY_CATEGORIES.BEAUTY]: {
    targetCustomer: '20-50代の女性、月1回以上の定期利用客',
    whyChosen: '技術力が高い、予約が取りやすい、価格が適正',
    customerNeeds: '髪の悩みを解決してくれる技術力、丁寧なカウンセリング',
    needsChange: 'SNS映えするスタイルの需要増加。トリートメント需要も高まっている',
    marketTrends: '美容室の競合増加。専門性やコンセプトが重要に',
    competitorComparison: 'リピート率80%以上。口コミ評価も高い'
  },
  [INDUSTRY_CATEGORIES.RETAIL]: {
    targetCustomer: '30-50代の女性、ギフト需要の顧客',
    whyChosen: '品揃えが良い、センスが良い、店員の接客が丁寧',
    customerNeeds: '質の良い商品、ギフトラッピング、提案力',
    needsChange: 'オンラインショップの需要増加。実店舗では体験重視',
    marketTrends: 'EC市場の拡大。実店舗は体験価値が重要',
    competitorComparison: '地域密着で常連客が多い。商品知識の豊富さが評価されている'
  },
  [INDUSTRY_CATEGORIES.LODGING]: {
    targetCustomer: '30-50代の家族連れ、カップル、一人旅の女性',
    whyChosen: '立地が良い、清潔感がある、価格が手頃',
    customerNeeds: '快適な宿泊環境、地域の観光情報、ホスピタリティ',
    needsChange: 'インバウンド需要の回復。体験型宿泊の人気増加',
    marketTrends: '観光需要が回復。OTA経由の予約が増加',
    competitorComparison: 'Google口コミ評価4.5以上。リピーターが多い'
  },
  [INDUSTRY_CATEGORIES.SERVICE]: {
    targetCustomer: '30-60代の男女、健康志向の顧客',
    whyChosen: '技術力、効果が実感できる、親身な対応',
    customerNeeds: '悩みの解決、専門的なアドバイス、リラックス',
    needsChange: '健康意識の高まりで予防的な利用が増加',
    marketTrends: '健康・ウェルネス市場の拡大',
    competitorComparison: '口コミ評価が高く、紹介での来店が多い'
  }
};

/**
 * Phase 3（強み分析）の業種別回答例
 */
export const PHASE3_EXAMPLES = {
  [INDUSTRY_CATEGORIES.RESTAURANT]: {
    uniqueness: '現地イタリアで修行したシェフの本格的な味、地元食材を活用した季節メニュー',
    customerValue: '他では味わえない本場の味を提供、季節ごとの新しい発見がある',
    expertise: '調理師免許保有、イタリア・トスカーナ地方のレストランで3年修行、ソムリエ資格保有',
    equipment: '石窯ピザ窯を導入、イタリア直輸入の食材を使用',
    achievements: 'Google口コミ4.3以上、地域のグルメ雑誌に掲載、リピーター率70%',
    weaknesses: '認知度が低く新規客の獲得が課題、駐車場が限られている',
    location: '駅から徒歩5分、住宅街にあり地域密着型、近隣に駐車場あり'
  },
  [INDUSTRY_CATEGORIES.CAFE]: {
    uniqueness: '自家焙煎のスペシャリティコーヒー、手作りスイーツ、落ち着いた空間',
    customerValue: '本格的なコーヒーが楽しめる、ゆっくり過ごせる空間',
    expertise: 'バリスタ資格保有、コーヒー焙煎技術、製菓経験5年',
    equipment: '業務用エスプレッソマシン、焙煎機導入',
    achievements: 'Google口コミ4.5以上、SNSフォロワー1,000人以上',
    weaknesses: '席数が少なくピーク時に満席になる、夜の集客が課題',
    location: '駅から徒歩3分、オフィス街に近く平日の需要が高い'
  },
  [INDUSTRY_CATEGORIES.BEAUTY]: {
    uniqueness: '髪質改善トリートメントの専門技術、マンツーマン対応',
    customerValue: '一人ひとりの髪の悩みに合わせた施術、プライベート空間',
    expertise: '美容師免許保有、都内有名サロンで10年勤務、毛髪診断士資格',
    equipment: '最新のトリートメントシステム、オーガニック薬剤使用',
    achievements: 'リピート率85%、口コミ評価4.6以上、SNSでの好評',
    weaknesses: '一人営業のため予約が取りにくい、新規顧客の獲得が課題',
    location: '駅から徒歩2分、閑静な住宅街の一角、駐車場1台完備'
  },
  [INDUSTRY_CATEGORIES.RETAIL]: {
    uniqueness: 'セレクトした国内外のブランド商品、ギフトラッピングサービス',
    customerValue: 'センスの良い商品が見つかる、ギフト選びをサポート',
    expertise: 'バイヤー経験5年、商品知識が豊富、ラッピングコーディネーター資格',
    equipment: '商品陳列の工夫、ギフトラッピングコーナー完備',
    achievements: 'リピーター率60%、地域イベントに出店、SNS発信で認知度向上',
    weaknesses: 'オンライン販売が未整備、実店舗のみで商圏が限定的',
    location: '商店街の中心、駐車場なし、徒歩・自転車での来店が中心'
  },
  [INDUSTRY_CATEGORIES.LODGING]: {
    uniqueness: '地域の観光情報に詳しいホスト、清潔で快適な客室、地元食材の朝食',
    customerValue: '地元ならではの体験ができる、アットホームな雰囲気',
    expertise: '地域観光ガイド経験、接客業10年、外国語対応可能（英語）',
    equipment: '全室Wi-Fi完備、最新の寝具導入、共有スペース充実',
    achievements: 'Google口コミ4.5以上、OTAでの評価も高い、リピーター多数',
    weaknesses: '客室数が少なく繁忙期に満室になる、オンライン予約の整備が課題',
    location: '観光地まで徒歩10分、駅から徒歩7分、静かな住宅街'
  },
  [INDUSTRY_CATEGORIES.SERVICE]: {
    uniqueness: '豊富な経験に基づく高い技術力、一人ひとりに合わせた施術',
    customerValue: '痛みや不調の改善、予防的なケア、丁寧なカウンセリング',
    expertise: '国家資格保有、臨床経験15年、セミナー講師経験あり',
    equipment: '最新の施術機器導入、清潔で落ち着いた施術環境',
    achievements: '口コミ評価4.7以上、紹介での来店が多い、リピート率90%',
    weaknesses: '一人営業のため対応人数に限界、認知度向上が課題',
    location: '駅から徒歩5分、住宅街の一角、駐車場2台完備'
  }
};

/**
 * 業種別の回答例を取得
 * @param {string} phase - 'phase2' or 'phase3'
 * @param {string} businessType - Q1-1の回答
 * @param {string} field - 回答例のフィールド名
 * @returns {string} 回答例
 */
export const getExample = (phase, businessType, field) => {
  const industry = detectIndustry(businessType);

  if (phase === 'phase2') {
    return PHASE2_EXAMPLES[industry]?.[field] || '';
  } else if (phase === 'phase3') {
    return PHASE3_EXAMPLES[industry]?.[field] || '';
  }

  return '';
};

/**
 * 動的なplaceholderを生成
 * @param {string} questionId - 質問ID
 * @param {object} answers - ユーザーの回答データ
 * @returns {string} placeholder文字列
 */
export const getDynamicPlaceholder = (questionId, answers) => {
  const businessType = answers['Q1-1'] || '';

  switch (questionId) {
    case 'P2-1': // ターゲット顧客
      return `例：${getExample('phase2', businessType, 'targetCustomer')}`;

    case 'P2-2': // 選ばれる理由
      return `例：${getExample('phase2', businessType, 'whyChosen')}`;

    case 'P2-3': // 顧客ニーズ
      return `例：${getExample('phase2', businessType, 'customerNeeds')}`;

    case 'P2-4': // ニーズの変化
      return `例：${getExample('phase2', businessType, 'needsChange')}`;

    case 'P2-5': // 市場動向
      return `例：${getExample('phase2', businessType, 'marketTrends')}`;

    case 'P2-6': // 競合比較
      return `例：${getExample('phase2', businessType, 'competitorComparison')}`;

    case 'P3-1': // 独自性・差別化
      return `例：${getExample('phase3', businessType, 'uniqueness')}`;

    case 'P3-2': // 顧客への価値
      return `例：${getExample('phase3', businessType, 'customerValue')}`;

    case 'P3-3': // 専門性・資格
      return `例：${getExample('phase3', businessType, 'expertise')}`;

    case 'P3-4': // 設備・技術
      return `例：${getExample('phase3', businessType, 'equipment')}`;

    case 'P3-5': // 実績・評価
      return `例：${getExample('phase3', businessType, 'achievements')}`;

    case 'P3-6': // 課題・弱み
      return `例：${getExample('phase3', businessType, 'weaknesses')}`;

    case 'P3-7': // 立地・商圏
      return `例：${getExample('phase3', businessType, 'location')}`;

    default:
      return '';
  }
};

/**
 * 動的なhelpTextを生成
 * @param {string} questionId - 質問ID
 * @param {object} answers - ユーザーの回答データ
 * @returns {string} helpText文字列
 */
export const getDynamicHelpText = (questionId, answers) => {
  const businessType = answers['Q1-1'] || '';
  const benchmark = getBenchmark(businessType);

  switch (questionId) {
    case 'Q1-20': // 粗利率
      return `【売上総利益率とは】\n` +
        `売上から原価を引いた利益の割合です\n\n` +
        `【あなたの業種の平均】\n` +
        `${benchmark.name}の平均：約${benchmark.grossProfitRate.average}%\n\n` +
        `💡 わからない場合は、この平均値「${benchmark.grossProfitRate.average}」を入力してください`;

    case 'Q1-21': // 客単価
      return `【客単価とは】\n` +
        `1人のお客様が1回の来店で使う金額の平均です\n\n` +
        `【あなたの業種の平均】\n` +
        `${benchmark.name}の平均：約${benchmark.customerUnitPrice.average.toLocaleString()}円\n\n` +
        `💡 売上÷客数で計算できます`;

    case 'P2-1': // ターゲット顧客
      return `💡 ${benchmark.name}の典型例：\n${getExample('phase2', businessType, 'targetCustomer')}`;

    case 'P3-1': // 独自性
      return `💡 ${benchmark.name}でよくある強み：\n${getExample('phase3', businessType, 'uniqueness')}`;

    default:
      return '';
  }
};

export default {
  detectIndustry,
  getBenchmark,
  getExample,
  getDynamicPlaceholder,
  getDynamicHelpText,
  INDUSTRY_CATEGORIES,
  INDUSTRY_BENCHMARKS,
  PHASE2_EXAMPLES,
  PHASE3_EXAMPLES
};
