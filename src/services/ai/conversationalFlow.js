/**
 * 対話型質問フローエンジン
 *
 * 一問一答式で、簡単な質問から複雑な質問へと段階的に進める
 * Google Maps情報を最大限活用
 *
 * @version 1.0.0
 * @created 2025-01-19
 */

/**
 * 質問の定義
 * priority: 質問の優先度（低い数字ほど先に聞く）
 * type: 質問タイプ
 * dependencies: この質問をするために必要な前提質問
 */
export const CONVERSATIONAL_QUESTIONS = [
  // ========================================
  // フェーズ1: Google Maps情報取得（最優先）
  // ========================================
  {
    id: 'place_search',
    priority: 1,
    phase: 'google_maps',
    text: 'お店や会社の名前を教えてください',
    type: 'place_search',
    helpText: 'Google Mapsで検索して、営業時間や口コミ情報を自動取得します',
    required: true,
    extractFromMaps: [
      'name',
      'address',
      'phone',
      'opening_hours',
      'rating',
      'reviews',
      'photos'
    ]
  },
  {
    id: 'place_confirm',
    priority: 2,
    phase: 'google_maps',
    text: 'この情報で合っていますか？',
    type: 'place_confirm',
    required: true,
    dependencies: ['place_search']
  },

  // ========================================
  // フェーズ2: 基本情報（簡単な質問）
  // ========================================
  {
    id: 'owner_name',
    priority: 10,
    phase: 'basic_info',
    text: '代表者のお名前を教えてください',
    type: 'text',
    placeholder: '例：山田太郎',
    required: true,
    aiEnhance: false // 補完不要
  },
  {
    id: 'employee_count',
    priority: 11,
    phase: 'basic_info',
    text: '従業員は何名いますか？（パート・アルバイトを含む）',
    type: 'number',
    placeholder: '例：5',
    helpText: '⚠️ 飲食業は常時雇用が5名以下である必要があります',
    required: true,
    aiEnhance: false,
    validation: {
      max: 5,
      errorMessage: '飲食業の場合、常時雇用従業員は5名以下である必要があります。6名以上の場合は他の補助金制度をご検討ください。'
    }
  },

  // ========================================
  // フェーズ3: 売上情報（一問一答）
  // ========================================
  {
    id: 'top1_menu',
    priority: 20,
    phase: 'sales',
    text: '1番人気のメニューは何ですか？',
    type: 'text',
    placeholder: '例：ランチコース',
    required: true,
    aiEnhance: false
  },
  {
    id: 'top1_price',
    priority: 21,
    phase: 'sales',
    text: 'その価格はいくらですか？',
    type: 'number',
    placeholder: '例：1200',
    suffix: '円',
    required: true,
    dependencies: ['top1_menu'],
    aiEnhance: false
  },
  {
    id: 'top2_menu',
    priority: 22,
    phase: 'sales',
    text: '2番目に人気のメニューは何ですか？',
    type: 'text',
    placeholder: '例：単品パスタ',
    required: true,
    dependencies: ['top1_price'],
    aiEnhance: false
  },
  {
    id: 'top2_price',
    priority: 23,
    phase: 'sales',
    text: 'その価格はいくらですか？',
    type: 'number',
    placeholder: '例：980',
    suffix: '円',
    required: true,
    dependencies: ['top2_menu'],
    aiEnhance: false
  },
  {
    id: 'top3_menu',
    priority: 24,
    phase: 'sales',
    text: '3番目に人気のメニューは何ですか？',
    type: 'text',
    placeholder: '例：デザートセット',
    required: true,
    dependencies: ['top2_price'],
    aiEnhance: false
  },
  {
    id: 'top3_price',
    priority: 25,
    phase: 'sales',
    text: 'その価格はいくらですか？',
    type: 'number',
    placeholder: '例：500',
    suffix: '円',
    required: true,
    dependencies: ['top3_menu'],
    aiEnhance: false
  },

  // ========================================
  // フェーズ4: 営業状況（Google Maps情報を活用）
  // ========================================
  {
    id: 'lunch_or_dinner',
    priority: 30,
    phase: 'business_hours',
    text: 'ランチとディナー、どちらの売上が多いですか？',
    type: 'single_select',
    options: [
      { value: 'lunch', label: 'ランチ' },
      { value: 'dinner', label: 'ディナー' },
      { value: 'equal', label: 'だいたい同じ' }
    ],
    required: true,
    dependencies: ['place_confirm'],
    useMapData: 'opening_hours' // Google Mapsの営業時間を参照
  },
  {
    id: 'sales_ratio',
    priority: 31,
    phase: 'business_hours',
    text: 'だいたい何割くらいですか？',
    type: 'single_select',
    options: [
      { value: '60', label: '6割' },
      { value: '70', label: '7割' },
      { value: '80', label: '8割' },
      { value: '90', label: '9割以上' }
    ],
    required: true,
    dependencies: ['lunch_or_dinner'],
    condition: (answers) => answers['lunch_or_dinner'] !== 'equal'
  },
  {
    id: 'daily_customers',
    priority: 32,
    phase: 'business_hours',
    text: '1日の平均来客数を教えてください',
    type: 'text',
    placeholder: '例：平日30名、休日50名',
    helpText: '平日と休日で分けて記載してください',
    required: true,
    aiEnhance: true // ここからAI補完を使う
  },

  // ========================================
  // フェーズ5: 課題と目標（AI支援）
  // ========================================
  {
    id: 'current_challenge',
    priority: 40,
    phase: 'goals',
    text: '今、一番困っていることは何ですか？',
    type: 'textarea',
    placeholder: '例：ディナーの客が少ない、新規顧客が増えない、リピート率が低い など',
    helpText: 'どんなことでも結構です。率直に教えてください',
    required: true,
    aiEnhance: true,
    aiAnalysis: {
      enabled: true,
      action: 'suggest_solutions' // AIが解決策を提案
    }
  }
];

/**
 * 次に聞くべき質問を決定
 * @param {Object} answers - これまでの回答
 * @returns {Object} 次の質問
 */
export const getNextQuestion = (answers) => {
  // 回答済みの質問IDリスト
  const answeredIds = Object.keys(answers);

  // 未回答の質問を優先度順に並べる
  const unanswered = CONVERSATIONAL_QUESTIONS.filter(q => {
    // 既に回答済みならスキップ
    if (answeredIds.includes(q.id)) return false;

    // 依存関係チェック
    if (q.dependencies) {
      const allDependenciesMet = q.dependencies.every(depId => answeredIds.includes(depId));
      if (!allDependenciesMet) return false;
    }

    // 条件チェック
    if (q.condition && !q.condition(answers)) {
      return false;
    }

    return true;
  }).sort((a, b) => a.priority - b.priority);

  // 最優先の質問を返す
  return unanswered[0] || null;
};

/**
 * Google Maps情報から自動回答を生成
 * @param {Object} placeData - Google Mapsから取得したデータ
 * @returns {Object} 自動生成された回答
 */
export const extractAnswersFromMaps = (placeData) => {
  const autoAnswers = {};

  if (placeData.opening_hours?.weekday_text) {
    // 営業時間から自動判定
    const hours = placeData.opening_hours.weekday_text.join(' ');
    const hasLunch = /11:?00|12:?00|13:?00/.test(hours);
    const hasDinner = /17:?00|18:?00|19:?00|20:?00/.test(hours);

    if (hasLunch && hasDinner) {
      // ランチとディナー両方あり
      // 口コミから傾向を分析できればベター
    }
  }

  if (placeData.reviews && placeData.reviews.length > 0) {
    // 口コミから人気メニューを推測
    const reviewTexts = placeData.reviews.map(r => r.text).join(' ');
    // 「ランチ」「パスタ」「デザート」などのキーワード頻度分析
    // → AIに渡して分析させる
  }

  return autoAnswers;
};

/**
 * ユーザーの質問を検出
 * @param {String} input - ユーザー入力
 * @returns {Boolean} 質問かどうか
 */
/**
 * 相槌や肯定的な回答かどうかを判定
 * @param {string} input - ユーザー入力
 * @returns {boolean} - 相槌ならtrue
 */
export const isAcknowledgment = (input) => {
  if (!input || input.trim().length < 2) {
    return false;
  }

  const acknowledgmentPatterns = [
    /^はい$/,
    /^うん$/,
    /^ええ$/,
    /^そうです$/,
    /^そうだと思います$/,
    /^そう思います$/,
    /^そうですね$/,
    /^その通り$/,
    /^そのとおり$/,
    /^おっしゃる通り$/,
    /^おっしゃるとおり$/,
    /^たぶん$/,
    /^おそらく$/,
    /^多分$/,
    /^恐らく$/,
    /^そうかも$/,
    /^そうかもしれません$/,
    /^かもしれません$/,
    /^だと思います$/,
    /^と思います$/
  ];

  const trimmed = input.trim();
  return acknowledgmentPatterns.some(pattern => pattern.test(trimmed));
};

export const isUserQuestion = (input) => {
  // 空または短すぎる入力は質問として扱わない
  if (!input || input.trim().length < 2) {
    return false;
  }

  // 相槌の場合は質問として扱わない
  if (isAcknowledgment(input)) {
    return false;
  }

  const questionPatterns = [
    /^[?？]/,
    /どういう意味/,
    /わからない/,
    /わかりません/,
    /必要ですか/,
    /必須ですか/,
    /教えて/,
    /何ですか/,
    /なんですか/,
    /どうして/,
    /なぜ/,
    /どう/,
    /どのように/,
    /いつ/,
    /どこ/,
    /だれ/,
    /[?？]$/,  // 末尾に?がある
    /できますか/,
    /してもいい/,
    /どうすれば/,
    /方法/,
    /やり方/,
    /ありますか/,  // 「口コミがありますか？」など
    /あるんですか/,
    /見せて/,
    /教えて/
  ];

  return questionPatterns.some(pattern => pattern.test(input));
};

/**
 * ユーザーの質問に回答
 * @param {Object} currentQuestion - 現在の質問
 * @param {String} userQuestion - ユーザーの質問
 * @param {Object} context - 文脈情報
 * @returns {Promise<String>} AI回答
 */
export const answerUserQuestion = async (currentQuestion, userQuestion, context = {}) => {
  const lowerQuestion = userQuestion.toLowerCase();
  const { answers = {} } = context;

  // Google Maps情報を取得
  const placeInfo = answers['Q1-0'] || {};
  const reviews = placeInfo.reviews || [];
  const rating = placeInfo.rating || 0;
  const userRatingsTotal = placeInfo.userRatingsTotal || 0;

  // 口コミ関連の質問
  if (lowerQuestion.includes('口コミ') || lowerQuestion.includes('レビュー') || lowerQuestion.includes('評価')) {
    if (lowerQuestion.includes('ありますか') || lowerQuestion.includes('あるんですか')) {
      if (reviews.length > 0) {
        const topReviews = reviews.slice(0, 3);
        let reviewText = `はい、Google Mapsに${userRatingsTotal}件の口コミがあります（評価: ${rating}）\n\n【最新の口コミ】\n`;
        topReviews.forEach((review, index) => {
          reviewText += `\n${index + 1}. ⭐${review.rating} - ${review.text.substring(0, 100)}${review.text.length > 100 ? '...' : ''}\n`;
        });
        reviewText += `\nこれらの口コミから、お客様に評価されているポイントが見えてきますね。`;
        return reviewText;
      } else {
        return 'Google Mapsの口コミ情報が見つかりませんでした。口コミがない場合でも、実際のお客様の声や反応を思い出して答えてください。';
      }
    }

    if (lowerQuestion.includes('見せて') || lowerQuestion.includes('教えて') || lowerQuestion.includes('確認')) {
      if (reviews.length > 0) {
        const topReviews = reviews.slice(0, 5);
        let reviewText = `Google Mapsの口コミ（評価: ${rating}、${userRatingsTotal}件）\n\n`;
        topReviews.forEach((review, index) => {
          reviewText += `【口コミ ${index + 1}】\n⭐ ${review.rating}\n${review.text}\n投稿者: ${review.author_name}\n\n`;
        });
        return reviewText;
      } else {
        return 'Google Mapsの口コミ情報がありません。';
      }
    }
  }

  // 例を教えてほしい
  if (lowerQuestion.includes('例') && (lowerQuestion.includes('教えて') || lowerQuestion.includes('見せて') || lowerQuestion.includes('ください'))) {
    if (currentQuestion.placeholder) {
      return `例として、以下のような回答が考えられます：\n\n${currentQuestion.placeholder}\n\nこのような形で、あなたのお店に当てはめて答えてください。`;
    } else {
      return '申し訳ありません。この質問には例がありません。わかる範囲で具体的に答えてください。';
    }
  }

  // もっと詳しく教えて
  if (lowerQuestion.includes('詳しく') || lowerQuestion.includes('もっと')) {
    return `「${currentQuestion.text}」について詳しく説明しますね。\n\n${currentQuestion.helpText || '補助金審査では、この情報が重要な評価ポイントになります。'}\n\n${currentQuestion.placeholder ? `例：${currentQuestion.placeholder}` : ''}\n\nこのような情報を教えていただけると助かります。`;
  }

  // 質問のタイプ別に回答を生成
  const quickAnswers = {
    '必要ですか': `はい、「${currentQuestion.text}」は補助金審査で重要な評価ポイントです。${currentQuestion.helpText || ''}`,
    '必須ですか': currentQuestion.required
      ? 'はい、この質問は必須です。'
      : 'いいえ、任意です。ただし、回答いただくと審査で有利になります。',
    'わからない': `大丈夫です！${currentQuestion.placeholder || '例を参考に'}、わかる範囲で教えてください。正確な数字でなくても構いません。`,
    'どう答えれば': `${currentQuestion.placeholder || '例を参考に'}のように答えてください。${currentQuestion.helpText || ''}`,
    'スキップ': currentQuestion.required
      ? 'この質問は必須なので、スキップできません。わかる範囲で答えてください。'
      : 'スキップしたい場合は、「スキップ」と入力してください。',
    '後で': 'わかりました。では次の質問に進みます。後で戻って回答することもできます。',
    '意味': `「${currentQuestion.text}」というのは、${currentQuestion.helpText || '補助金申請に必要な情報'}のことです。`,
    '税込': '価格は税込でも税別でも構いません。お客様に提示している価格（税込）で答えていただくのが一般的です。',
    '税別': '価格は税込でも税別でも構いません。お客様に提示している価格（税込）で答えていただくのが一般的です。',
    '税抜': '価格は税込でも税別でも構いません。お客様に提示している価格（税込）で答えていただくのが一般的です。',
    'どっち': currentQuestion.type === 'number' && currentQuestion.suffix === '円'
      ? '価格の場合は、お客様に提示している価格（通常は税込）で答えてください。税込・税別どちらでも構いませんが、統一してください。'
      : `${currentQuestion.placeholder || '例を参考に'}のように答えてください。`
  };

  // キーワードマッチング
  for (const [key, answer] of Object.entries(quickAnswers)) {
    if (lowerQuestion.includes(key)) {
      return answer;
    }
  }

  // 一般的な会話パターン
  if (lowerQuestion.includes('こんにちは') || lowerQuestion.includes('はじめまして')) {
    return 'こんにちは！補助金申請のお手伝いをさせていただきます。わからないことがあれば、いつでも質問してくださいね。';
  }

  if (lowerQuestion.includes('ありがとう')) {
    return 'どういたしまして！一緒に頑張りましょう。';
  }

  if (lowerQuestion.includes('難しい') || lowerQuestion.includes('むずかしい')) {
    return '難しく感じるかもしれませんが、一問ずつ答えていけば大丈夫です。わかる範囲で構いませんので、気軽に答えてください。';
  }

  if (lowerQuestion.includes('時間') || lowerQuestion.includes('どれくらい')) {
    return '全体で約20分程度で完了します。今は少しずつ進めていきましょう。';
  }

  // デフォルト回答
  return `ご質問ありがとうございます。\n\n現在は「${currentQuestion.text}」についてお聞きしています。${currentQuestion.helpText || ''}\n\n具体的にどの点がわかりませんか？`;
};
