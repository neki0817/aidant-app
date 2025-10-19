/**
 * 業種分類ユーティリティ
 * Step 1で取得した業種情報から、質問内容を切り替えるための判定を行う
 */

/**
 * 業種タイプの定義
 */
export const INDUSTRY_TYPES = {
  RESTAURANT: 'restaurant', // 飲食店
  RETAIL: 'retail', // 小売業
  BEAUTY: 'beauty', // 美容・理容
  SERVICE: 'service', // サービス業
  MANUFACTURING: 'manufacturing', // 製造業・建設業
  OTHER: 'other' // その他
};

/**
 * Step 1の業種選択肢から業種タイプを判定
 * @param {string} industryAnswer - Q1-1の回答
 * @returns {string} - INDUSTRY_TYPESのいずれか
 */
export const classifyIndustry = (industryAnswer) => {
  if (!industryAnswer) {
    return INDUSTRY_TYPES.OTHER;
  }

  // 絵文字を含む選択肢なので、部分一致で判定
  if (industryAnswer.includes('飲食店')) {
    return INDUSTRY_TYPES.RESTAURANT;
  } else if (industryAnswer.includes('小売業')) {
    return INDUSTRY_TYPES.RETAIL;
  } else if (industryAnswer.includes('美容・理容業')) {
    return INDUSTRY_TYPES.BEAUTY;
  } else if (industryAnswer.includes('サービス業')) {
    return INDUSTRY_TYPES.SERVICE;
  } else if (industryAnswer.includes('建設業・製造業')) {
    return INDUSTRY_TYPES.MANUFACTURING;
  } else {
    return INDUSTRY_TYPES.OTHER;
  }
};

/**
 * 業種に応じて「販売先」または「顧客層」の質問文を生成
 * @param {Object} answers - 全回答
 * @param {string} productCategory - 製品・サービスのカテゴリー名
 * @returns {Object} - { question, examples, inputHint }
 */
export const getCustomerQuestion = (answers, productCategory) => {
  const industryType = classifyIndustry(answers['Q1-1']);

  // 製造業・建設業の場合は「販売先」
  if (industryType === INDUSTRY_TYPES.MANUFACTURING) {
    return {
      question: `「${productCategory}」の主要な販売先を教えてください。`,
      examples: [
        '○○商社、△△工務店',
        '××建設、◇◇住宅',
        '地域の工務店3社',
        '建設会社、リフォーム業者'
      ],
      inputHint: '例：○○商社、△△工務店'
    };
  }

  // 飲食店・小売業・美容業・サービス業の場合は「顧客層」
  return {
    question: `「${productCategory}」の主な顧客層を教えてください。`,
    examples: [
      '地域住民、観光客',
      '20〜30代の女性客',
      '近隣の企業（法人顧客）',
      'ビジネスマン、ファミリー層'
    ],
    inputHint: '例：地域住民、観光客'
  };
};

/**
 * 業種に応じた製品カテゴリーの例を取得
 * @param {Object} answers - 全回答
 * @returns {Array} - カテゴリー例のリスト
 */
export const getProductCategoryExamples = (answers) => {
  const industryType = classifyIndustry(answers['Q1-1']);

  switch (industryType) {
    case INDUSTRY_TYPES.RESTAURANT:
      return [
        '定食類',
        'ランチメニュー',
        'テイクアウト商品',
        'ドリンク類',
        'コース料理'
      ];

    case INDUSTRY_TYPES.RETAIL:
      return [
        'レディース衣料',
        '雑貨類',
        '食品類',
        'アクセサリー',
        '季節商品'
      ];

    case INDUSTRY_TYPES.BEAUTY:
      return [
        'カット施術',
        'カラー・パーマ',
        'トリートメント',
        'ネイル施術',
        'エステコース'
      ];

    case INDUSTRY_TYPES.SERVICE:
      return [
        'クリーニングサービス',
        '修理サービス',
        '清掃サービス',
        'メンテナンス',
        '配送サービス'
      ];

    case INDUSTRY_TYPES.MANUFACTURING:
      return [
        '○○部品',
        '加工製品',
        'オリジナル製品',
        '受注生産品',
        '建設資材'
      ];

    default:
      return [
        '主力サービスA',
        '主力サービスB',
        '主力商品A',
        '主力商品B'
      ];
  }
};
