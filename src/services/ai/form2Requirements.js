/**
 * 様式2（経営計画書兼補助事業計画書）の記載要件
 *
 * 各セクションで必要なデータ項目を定義
 * AIはこの要件に基づいて、不足情報を特定し質問を生成する
 */

export const FORM2_REQUIREMENTS = {
  // Phase 2: 顧客ニーズと市場の動向
  section2: {
    title: '顧客ニーズと市場の動向',
    description: '市場全体の動向と自社事業に関わる市場分析',
    required_data: [
      {
        id: 'target_customers',
        label: 'ターゲット顧客',
        description: '主要顧客の年齢層・性別・職業・ライフスタイル',
        examples: ['30代女性', '40-50代男性', 'ファミリー層', 'ビジネスマン'],
        priority: 'high'
      },
      {
        id: 'customer_distribution',
        label: '地域別顧客分布',
        description: 'どの地域からお客様が来ているか（市町村別）',
        examples: ['〇〇市内60%、隣接市30%、遠方10%'],
        priority: 'high'
      },
      {
        id: 'customer_composition',
        label: '客層の構成',
        description: '新規顧客とリピーターの比率、平日・休日の客層の違い',
        examples: ['新規3割・リピーター7割', '平日はシニア中心、休日はファミリー層'],
        priority: 'medium'
      },
      {
        id: 'customer_needs',
        label: '顧客ニーズ',
        description: '顧客が求めているもの、来店理由',
        examples: ['美味しいコーヒー', 'ゆっくりできる空間', 'SNS映えする商品'],
        priority: 'high'
      },
      {
        id: 'needs_changes',
        label: 'ニーズの変化',
        description: '顧客ニーズの時系列変化（過去→現在→将来）',
        examples: ['コロナ後、テイクアウト需要増加', '健康志向の高まり'],
        priority: 'medium'
      },
      {
        id: 'market_trends',
        label: '市場の動向',
        description: '業界全体のトレンド、地域の変化',
        examples: ['駅前再開発で人通り増加', '高齢化により顧客層変化'],
        priority: 'high'
      },
      {
        id: 'seasonal_patterns',
        label: '季節変動パターン',
        description: '売上が多い時期・少ない時期',
        examples: ['夏が繁忙期', '12月が売上ピーク'],
        priority: 'medium'
      },
      {
        id: 'daily_weekly_patterns',
        label: '日次・週次パターン',
        description: '1日の平均来客数、平日・休日の違い',
        examples: ['平日50人、休日80人', 'ランチタイムが集中'],
        priority: 'low'
      },
      {
        id: 'competitive_landscape',
        label: '競合状況',
        description: '競合他社の数、競合との比較（評価、口コミ数等）',
        examples: ['近隣に3店舗あるが当店の評価が最高', '口コミ数は少ない'],
        priority: 'medium'
      },
      {
        id: 'untapped_areas',
        label: '未開拓地域',
        description: 'まだアプローチできていない地域・顧客層',
        examples: ['隣接市での認知度が低い', '若年層へのアプローチ不足'],
        priority: 'low'
      }
    ]
  },

  // Phase 3: 自社の強み
  section3: {
    title: '自社や自社の提供する商品・サービスの強み',
    description: '競合他社と比較して優れている点',
    required_data: [
      {
        id: 'main_strengths',
        label: '主要な強み',
        description: '商品・サービスの強み（複数）',
        examples: ['高品質な素材', '経験豊富なスタッフ', '立地の良さ'],
        priority: 'high'
      },
      {
        id: 'customer_reviews',
        label: '顧客からの評価',
        description: 'Google Maps口コミ等の具体的評価',
        examples: ['接客が丁寧', '雰囲気が良い', '味が美味しい'],
        priority: 'high'
      },
      {
        id: 'quality_commitment',
        label: '品質・技術のこだわり',
        description: '品質・技術で特にこだわっているポイント',
        examples: ['地元食材を使用', '独自の製法', '最新技術の導入'],
        priority: 'medium'
      },
      {
        id: 'competitive_advantage',
        label: '競合との差別化',
        description: '競合と明確に異なる点',
        examples: ['他店にないメニュー', '唯一の資格保有者', '24時間営業'],
        priority: 'medium'
      }
    ]
  },

  // Phase 4: 経営方針・目標と今後のプラン
  section4: {
    title: '経営方針・目標と今後のプラン',
    description: '現状の課題認識と今後の経営方針・目標',
    required_data: [
      {
        id: 'current_challenges',
        label: '現状の課題',
        description: '経営上の課題（売上、人材、設備等）',
        examples: ['新規顧客獲得が困難', '人手不足', '設備の老朽化'],
        priority: 'high'
      },
      {
        id: 'management_goals',
        label: '経営方針・目標',
        description: '今後の経営方針と具体的な数値目標',
        examples: ['売上30%増', '新規顧客月20名獲得', 'リピート率70%達成'],
        priority: 'high'
      },
      {
        id: 'action_plan',
        label: '具体的プラン',
        description: '目標達成のための具体的行動（時期・内容）',
        examples: ['6月にHP刷新', '7月から広告開始', '8月に新メニュー投入'],
        priority: 'high'
      },
      {
        id: 'priority_measures',
        label: '重点施策',
        description: '特に力を入れる施策',
        examples: ['SNSマーケティング強化', 'リピーター向けサービス'],
        priority: 'medium'
      }
    ]
  },

  // Phase 5: 補助事業の内容
  section5: {
    title: '補助事業の内容',
    description: '補助金で行う具体的な取組内容と効果',
    required_data: [
      {
        id: 'subsidy_purpose',
        label: '補助金の使い道',
        description: '補助金で購入・導入するもの',
        examples: ['ホームページ制作', 'チラシ印刷', '厨房機器'],
        priority: 'high'
      },
      {
        id: 'equipment_details',
        label: '設備・システムの詳細',
        description: '購入予定の設備・システムの具体的内容と費用',
        examples: ['ECサイト構築 50万円', 'POSレジ 30万円'],
        priority: 'high'
      },
      {
        id: 'implementation_schedule',
        label: '実施スケジュール',
        description: '開始時期と完了時期',
        examples: ['2025年6月開始、8月完了'],
        priority: 'high'
      },
      {
        id: 'expected_new_customers',
        label: '新規顧客数の見込み',
        description: '補助事業により獲得できる新規顧客数',
        examples: ['月20名', '年間200名'],
        priority: 'high'
      },
      {
        id: 'repeat_rate',
        label: 'リピート率',
        description: '新規顧客のリピート率の見込み',
        examples: ['50%', '70%'],
        priority: 'high'
      },
      {
        id: 'sales_forecast',
        label: '売上予測',
        description: '補助事業による売上増加の見込み（AIが自動計算）',
        examples: ['新規顧客20名×客単価2,000円×リピート率50% = 月2万円増'],
        priority: 'high',
        auto_calculate: true
      },
      {
        id: 'subsidy_reason',
        label: '補助金が必要な理由',
        description: 'なぜ補助金が必要なのか',
        examples: ['自己資金では設備投資が困難', '早期の売上増加を実現したい'],
        priority: 'medium'
      }
    ]
  }
};

/**
 * 業種の分類を判定（aiQuestionGeneratorPhase2.jsと同じロジック）
 */
const getBusinessCategory = (businessType) => {
  const categories = {
    restaurant: ['飲食業', 'カフェ', 'レストラン', '居酒屋', 'バー', '喫茶店', '焼肉店', 'ラーメン店', '寿司店', '弁当販売'],
    retail: ['小売業', '雑貨店', 'アパレル', '書店', '食品販売', 'スーパー', 'コンビニ', '花屋', '文房具店'],
    online: ['EC', 'オンライン販売', 'ネットショップ', 'Webサービス', 'アプリ開発'],
    service: ['美容室', '理容室', 'エステ', 'ネイルサロン', 'マッサージ', '整体', '鍼灸', '歯科', '動物病院'],
    btob: ['製造業', '卸売業', '印刷業', 'デザイン', 'コンサルティング', 'システム開発', '建設業', '運送業']
  };

  for (const [category, types] of Object.entries(categories)) {
    if (types.some(type => businessType.includes(type))) {
      return category;
    }
  }

  return 'other';
};

/**
 * 質問が業種に適用可能かチェック
 */
const isQuestionApplicable = (questionType, businessType) => {
  const category = getBusinessCategory(businessType);

  // オンライン専業の場合、来店・地域関連の質問をスキップ
  if (category === 'online') {
    const skipForOnline = ['customer_distribution', 'daily_weekly_patterns'];
    if (skipForOnline.includes(questionType)) {
      return false;
    }
  }

  // BtoB事業の場合、来店関連の質問をスキップ
  if (category === 'btob') {
    const skipForBtoB = ['customer_distribution', 'daily_weekly_patterns'];
    if (skipForBtoB.includes(questionType)) {
      return false;
    }
  }

  return true;
};

/**
 * 収集済みデータから不足情報を特定
 * @param {string} section - セクション名（section2, section3等）
 * @param {Object} collectedData - 収集済みデータ
 * @returns {Array} - 不足しているデータ項目のリスト
 */
export const identifyMissingData = (section, collectedData) => {
  const requirements = FORM2_REQUIREMENTS[section];
  if (!requirements) {
    console.error(`[Form2Requirements] Unknown section: ${section}`);
    return [];
  }

  const businessType = collectedData['Q1-1'] || '飲食業';
  const missingData = [];

  requirements.required_data.forEach(item => {
    // 自動計算項目はスキップ
    if (item.auto_calculate) {
      return;
    }

    // 業種に適用不可能な質問はスキップ（不足データとしてカウントしない）
    if (!isQuestionApplicable(item.id, businessType)) {
      console.log(`[Form2Requirements] Skipping ${item.id} for ${businessType}`);
      return;
    }

    // このデータ項目が収集済みかチェック
    const isCollected = checkDataCollected(item.id, collectedData);

    if (!isCollected) {
      missingData.push(item);
    }
  });

  // 優先度順にソート（high → medium → low）
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  missingData.sort((a, b) => {
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return missingData;
};

/**
 * データ項目が収集済みかチェック
 * @param {string} dataId - データ項目ID
 * @param {Object} collectedData - 収集済みデータ
 * @returns {boolean}
 */
const checkDataCollected = (dataId, collectedData) => {
  // データIDに対応する質問IDのマッピング
  const dataToQuestionMapping = {
    // Phase 2（AI自律質問生成）
    'target_customers': ['P2-target_customers'], // AI生成質問
    'customer_distribution': ['P2-customer_distribution'], // AI生成質問
    'customer_composition': ['P2-customer_composition'], // AI生成質問
    'customer_needs': ['P2-customer_needs'], // AI生成質問
    'needs_changes': ['P2-needs_changes'], // AI生成質問
    'market_trends': ['P2-market_trends'], // AI生成質問
    'seasonal_patterns': ['P2-seasonal_patterns'], // AI生成質問
    'daily_weekly_patterns': ['P2-daily_weekly_patterns'], // AI生成質問
    'competitive_landscape': ['P2-competitive_landscape'], // AI生成質問
    'untapped_areas': ['P2-untapped_areas'], // AI生成質問

    // Phase 3
    'main_strengths': ['P3-1', 'P3-1-followup-1'],
    'customer_reviews': ['P2-2', 'Q1-0'], // Google Maps口コミ
    'quality_commitment': ['P3-3'],
    'competitive_advantage': ['P3-4'],

    // Phase 4
    'current_challenges': ['P4-1'],
    'management_goals': ['P4-3'],
    'action_plan': ['P4-2'],
    'priority_measures': ['P4-4'],

    // Phase 5
    'subsidy_purpose': ['P5-1'],
    'equipment_details': ['P5-2'],
    'implementation_schedule': ['P5-3', 'P5-4'],
    'expected_new_customers': ['P5-5'],
    'repeat_rate': ['P5-6'],
    'subsidy_reason': ['P5-7']
  };

  const questionIds = dataToQuestionMapping[dataId] || [];

  // いずれかの質問IDに回答があればOK
  return questionIds.some(qid => {
    const answer = collectedData[qid];
    if (!answer) return false;

    // 空の回答はNG
    if (typeof answer === 'string' && answer.trim() === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;

    return true;
  });
};

/**
 * セクションが完了しているかチェック
 * @param {string} section - セクション名
 * @param {Object} collectedData - 収集済みデータ
 * @returns {boolean}
 */
export const isSectionComplete = (section, collectedData) => {
  const requirements = FORM2_REQUIREMENTS[section];
  if (!requirements) {
    return false;
  }

  const businessType = collectedData['Q1-1'] || '飲食業';

  // 優先度highの項目が全て収集されていればOK
  const highPriorityItems = requirements.required_data.filter(
    item => item.priority === 'high' && !item.auto_calculate
  );

  return highPriorityItems.every(item => {
    // 業種に適用不可能な質問はスキップ（完了扱い）
    if (!isQuestionApplicable(item.id, businessType)) {
      return true;
    }

    return checkDataCollected(item.id, collectedData);
  });
};

export default FORM2_REQUIREMENTS;
