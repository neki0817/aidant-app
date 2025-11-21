// 口コミ情報の抽出・整形ロジック

/**
 * ポジティブなキーワードリスト
 */
const POSITIVE_KEYWORDS = [
  '美味しい', 'おいしい', '本格的', 'こだわり', 'ジューシー',
  '絶品', '最高', '満足', 'ボリューム', '新鮮', '手作り',
  'おすすめ', '人気', '評判', '丁寧', '親切', '清潔',
  'おしゃれ', '雰囲気', 'コスパ', 'リーズナブル', '安い',
  '早い', '速い', '便利', '快適', 'センス', '素敵'
];

/**
 * ネガティブなキーワードリスト（除外用）
 */
const NEGATIVE_KEYWORDS = [
  '不味い', 'まずい', '高い', '遅い', '待たされる', '不親切',
  '汚い', '古い', '残念', '微妙', 'イマイチ', '普通'
];

/**
 * Tabelogキーワードから上位N件のポジティブキーワードを抽出
 * @param {string[]} keywords - Tabelogキーワードの配列
 * @param {number} count - 抽出する件数（デフォルト: 3）
 * @returns {string[]} 抽出されたキーワード
 */
export function extractTopKeywords(keywords, count = 3) {
  if (!keywords || keywords.length === 0) return [];

  // ネガティブキーワードを除外
  const filteredKeywords = keywords.filter(keyword =>
    !NEGATIVE_KEYWORDS.some(negative => keyword.includes(negative))
  );

  // ポジティブキーワードを含むものを優先
  const sortedKeywords = filteredKeywords.sort((a, b) => {
    const aIsPositive = POSITIVE_KEYWORDS.some(p => a.includes(p));
    const bIsPositive = POSITIVE_KEYWORDS.some(p => b.includes(p));

    if (aIsPositive && !bIsPositive) return -1;
    if (!aIsPositive && bIsPositive) return 1;
    return 0;
  });

  // 上位N件を取得
  return sortedKeywords.slice(0, count);
}

/**
 * Google Maps評価とTabelogキーワードから口コミセクションを生成
 * @param {Object} googleMaps - Google Mapsデータ
 * @param {Object} tabelog - Tabelogデータ
 * @returns {string} 口コミセクションのテキスト
 */
export function generateReviewSection(googleMaps, tabelog) {
  let section = '';

  // Google Maps評価
  if (googleMaps?.rating && googleMaps?.user_ratings_total) {
    section += `Google Mapsの口コミ評価は${googleMaps.rating}（${googleMaps.user_ratings_total}件）`;

    // 評価レベルに応じたコメント
    if (googleMaps.rating >= 4.5) {
      section += `と非常に高い評価をいただいており`;
    } else if (googleMaps.rating >= 4.0) {
      section += `と高い評価をいただいており`;
    } else if (googleMaps.rating >= 3.5) {
      section += `と良好な評価をいただいており`;
    } else {
      section += `の評価をいただいており`;
    }
  }

  // Tabelogキーワードから具体的なコメントを生成
  if (tabelog?.keywords && tabelog.keywords.length > 0) {
    const keywords = extractTopKeywords(tabelog.keywords, 3);
    if (keywords.length > 0) {
      section += `、「${keywords.join('」「')}」といったコメントが多く寄せられています。`;
    } else {
      section += `。`;
    }
  } else {
    section += `。`;
  }

  return section;
}

/**
 * 競合との比較セクションを生成
 * @param {Object} googleMaps - Google Mapsデータ
 * @param {Object} tabelog - Tabelogデータ
 * @param {string} businessType - 業種
 * @returns {string} 競合比較のテキスト
 */
export function generateCompetitorComparison(googleMaps, tabelog, businessType) {
  let section = '';

  // 業種別の平均評価（目安）
  const avgRatingMap = {
    '飲食業': 3.8,
    '小売業': 4.0,
    'サービス業（美容・理容業）': 4.2,
    'サービス業（その他）': 4.0,
    '宿泊業・娯楽業': 3.9,
    '製造業その他': 4.0
  };

  const avgRating = avgRatingMap[businessType] || 3.8;

  if (googleMaps?.rating) {
    if (googleMaps.rating > avgRating) {
      section += `近隣の競合店のGoogle口コミ評価は平均${avgRating}ですが、`;
      section += `当店は${googleMaps.rating}（${googleMaps.user_ratings_total}件）と上回っています。`;
    } else if (googleMaps.rating === avgRating) {
      section += `当店のGoogle口コミ評価は${googleMaps.rating}（${googleMaps.user_ratings_total}件）と、`;
      section += `近隣の競合店と同水準の評価をいただいています。`;
    } else {
      section += `当店のGoogle口コミ評価は${googleMaps.rating}（${googleMaps.user_ratings_total}件）です。`;
    }
  }

  // お客様からの評価
  if (tabelog?.keywords && tabelog.keywords.length > 0) {
    const keywords = extractTopKeywords(tabelog.keywords, 3);
    if (keywords.length > 0) {
      section += `お客様からは「${keywords.join('」「')}」とのコメントが多く、`;
      section += `味・品質ともに高く評価されています。`;
    }
  }

  return section;
}

/**
 * こだわり文から適切な強みタイトルを生成
 * @param {string} kodawari - こだわり文
 * @returns {string} 強みのタイトル
 */
export function extractStrengthTitle(kodawari) {
  if (!kodawari) return '商品・サービスの品質';

  if (kodawari.includes('食材') || kodawari.includes('原材料')) {
    return '厳選した食材・原材料';
  } else if (kodawari.includes('製法') || kodawari.includes('調理')) {
    return '伝統的な製法・調理技術';
  } else if (kodawari.includes('自家製') || kodawari.includes('手作り')) {
    return '自家製へのこだわり';
  } else if (kodawari.includes('監修') || kodawari.includes('プロデュース')) {
    return '専門家監修のレシピ';
  } else if (kodawari.includes('技術') || kodawari.includes('技法')) {
    return '高度な技術力';
  } else if (kodawari.includes('設備') || kodawari.includes('機械')) {
    return '最新設備の導入';
  } else if (kodawari.includes('接客') || kodawari.includes('サービス')) {
    return '質の高い接客・サービス';
  } else {
    return '商品・サービスの品質';
  }
}

/**
 * 公式サイト要約から専門性を抽出
 * @param {string} summary - 公式サイトの要約
 * @returns {string|null} 専門性の説明文
 */
export function extractExpertise(summary) {
  if (!summary) return null;

  // 専門性に関連するキーワード
  const expertiseKeywords = [
    '修行', '経験', '資格', '免許', '認定', '監修',
    'プロデュース', '受賞', '実績', '専門', '熟練'
  ];

  // 専門性キーワードを含む文を抽出
  const sentences = summary.split('。');
  const expertiseSentences = sentences.filter(sentence =>
    expertiseKeywords.some(keyword => sentence.includes(keyword))
  );

  if (expertiseSentences.length > 0) {
    return expertiseSentences.join('。') + '。';
  }

  return null;
}

/**
 * 口コミ情報を活用した「自社の強み」セクションを生成
 * @param {Object} answers - 全ての回答データ
 * @returns {string} 自社の強みセクションのテキスト
 */
export function generateStrengthsWithReviews(answers) {
  const tabelog = answers['Q1-0-tabelog'];
  const websiteSummary = answers['Q1-0-website-summary'];
  const kodawari = answers['Q1-NEW-3'];

  let section = '';

  // 第一の強み: Q1-NEW-3のこだわり
  if (kodawari && kodawari !== '特になし') {
    const title = extractStrengthTitle(kodawari);
    section += `#### （1）${title}\n\n`;
    section += `${kodawari}\n\n`;
  }

  // 第二の強み: Tabelogキーワードから生成
  if (tabelog?.keywords && tabelog.keywords.length > 0) {
    const keywords = extractTopKeywords(tabelog.keywords, 5);
    if (keywords.length > 0) {
      section += `#### （2）お客様からの高い評価\n\n`;
      section += `お客様からは「${keywords.join('」「')}」といった評価をいただいており、`;
      section += `味・品質ともに高く評価されています。`;

      // Google Maps評価も追加
      const googleMaps = answers['Q1-0'];
      if (googleMaps?.rating >= 4.0) {
        section += `Google Mapsの口コミ評価も${googleMaps.rating}（${googleMaps.user_ratings_total}件）と高く、`;
        section += `リピーター率も高い水準を維持しています。`;
      }

      section += `\n\n`;
    }
  }

  // 第三の強み: 公式サイト要約から専門性を抽出
  if (websiteSummary?.summary) {
    const expertise = extractExpertise(websiteSummary.summary);
    if (expertise) {
      section += `#### （3）専門性と経験\n\n`;
      section += `${expertise}\n\n`;
    }
  }

  return section;
}

/**
 * 業種別の平均評価を取得（目安）
 * @param {string} businessType - 業種
 * @returns {number} 平均評価
 */
export function getAverageRating(businessType) {
  const avgRatingMap = {
    '飲食業': 3.8,
    '小売業': 4.0,
    'サービス業（美容・理容業）': 4.2,
    'サービス業（その他）': 4.0,
    '宿泊業・娯楽業': 3.9,
    '製造業その他': 4.0
  };

  return avgRatingMap[businessType] || 3.8;
}
