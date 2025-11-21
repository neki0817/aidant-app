/**
 * Phase 2: AI自律質問生成
 *
 * 様式2の記載要件に基づいて、不足情報を特定し、
 * 次に聞くべき質問を動的に生成する
 */

import { FORM2_REQUIREMENTS, identifyMissingData, isSectionComplete } from './form2Requirements';
import { callClaudeAPI } from './claudeAPI'; // Cloud Functions経由でClaude APIを呼び出す

/**
 * Phase 2の次の質問を生成
 * @param {Object} collectedData - 収集済みデータ（Phase 1 + Phase 2の回答）
 * @returns {Promise<Object|null>} - 次の質問 or null（完了時）
 */
export const generateNextPhase2Question = async (collectedData) => {
  try {
    console.log('[AI Phase 2] Generating next question...');
    console.log('[AI Phase 2] Collected data keys:', Object.keys(collectedData));

    // 1. 不足情報を特定
    const missingData = identifyMissingData('section2', collectedData);

    console.log('[AI Phase 2] Missing data items:', missingData.length);

    // 2. 全ての優先度highの情報が揃っていればPhase 2完了
    if (isSectionComplete('section2', collectedData)) {
      console.log('[AI Phase 2] Section 2 is complete!');
      return { complete: true };
    }

    // 3. 不足情報がなくなったら完了
    if (missingData.length === 0) {
      console.log('[AI Phase 2] No missing data!');
      return { complete: true };
    }

    // 4. 業種に適用可能な質問を見つけるまでループ
    const businessType = collectedData['Q1-1'] || '飲食業';

    for (const dataItem of missingData) {
      console.log('[AI Phase 2] Checking data item:', dataItem.id);

      // 5. AIに質問を生成させる
      const question = await generateQuestionForDataItem(dataItem, collectedData);

      // 6. nullが返された場合はスキップして次へ
      if (question === null) {
        console.log(`[AI Phase 2] Question ${dataItem.id} skipped for ${businessType}`);
        continue;
      }

      console.log('[AI Phase 2] Generated question:', question.text);
      return question;
    }

    // 7. 全てスキップされた場合は完了
    console.log('[AI Phase 2] All remaining questions skipped - marking as complete');
    return { complete: true };

  } catch (error) {
    console.error('[AI Phase 2] Error generating question:', error);

    // エラー時はフォールバック質問を返す
    return generateFallbackQuestion(collectedData);
  }
};

/**
 * 業種の分類を判定
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
 * 業種別の回答例を生成
 */
const getIndustrySpecificExamples = (questionType, businessType) => {
  const category = getBusinessCategory(businessType);

  const examples = {
    target_customers: {
      restaurant: '例：30代女性（ランチ）、50代夫婦（ディナー）',
      retail: '例：20-40代女性、ファミリー層',
      online: '例：30代働く女性、全国の健康志向の方',
      service: '例：30-50代女性、近隣在住の方',
      btob: '例：中小企業の経営者、飲食店オーナー',
      other: '例：30代女性'
    },
    customer_needs: {
      restaurant: '例：美味しい料理とゆっくりできる空間',
      retail: '例：おしゃれで手頃な価格の商品',
      online: '例：自宅で気軽に購入できる品質の良い商品',
      service: '例：丁寧な施術とリラックスできる時間',
      btob: '例：コスト削減と品質の両立',
      other: '例：品質の高い商品・サービス'
    },
    needs_changes: {
      restaurant: '例：コロナ後、テイクアウトの需要が増えた',
      retail: '例：オンライン購入の需要が増加',
      online: '例：配送スピードへの要望が高まった',
      service: '例：予約システムの利便性を求める声が増えた',
      btob: '例：オンライン商談の需要が増加',
      other: '例：特に変化なし'
    },
    market_trends: {
      restaurant: '例：駅前の再開発で人通りが増えた、健康志向メニューの需要増',
      retail: '例：SNS経由の来店が増加、キャッシュレス決済の普及',
      online: '例：ECモール利用者の増加、サブスク型サービスの普及',
      service: '例：高齢化により顧客年齢層が上昇、男性客の増加',
      btob: '例：業界全体のデジタル化、コスト削減ニーズの高まり',
      other: '例：特に大きな変化はない'
    },
    competitive_landscape: {
      restaurant: '例：Google口コミ評価4.5で地域トップクラス、リピーターが多い',
      retail: '例：接客の良さで評判、品揃えが豊富と評価',
      online: '例：配送の速さと梱包の丁寧さで高評価',
      service: '例：技術力と接客の両方で高評価、予約が取りやすい',
      btob: '例：納期の正確さと品質で信頼を得ている',
      other: '例：リピーターが多い'
    },
    untapped_areas: {
      restaurant: '例：隣接市での認知度が低い、若年層へのアプローチ不足',
      retail: '例：オンライン販売未実施、遠方客の開拓余地',
      online: '例：SNS広告未実施、他地域への認知拡大の余地',
      service: '例：新規顧客獲得施策が不足、男性客の開拓余地',
      btob: '例：新規業界への営業不足、Webでの情報発信が弱い',
      other: '例：新規顧客の開拓余地あり'
    }
  };

  return examples[questionType]?.[category] || examples[questionType]?.other || '例：';
};

/**
 * 業種別のヘルプテキストを生成
 */
const getIndustrySpecificHelpText = (questionType, businessType) => {
  const category = getBusinessCategory(businessType);

  const helpTexts = {
    market_trends: {
      restaurant: '💡 地域の再開発、人口動態、競合店の増減、食トレンドの変化など',
      retail: '💡 商圏人口の変化、ECシフト、キャッシュレス化、SNSの影響など',
      online: '💡 ECモール利用者数、配送料金の変化、競合の価格動向など',
      service: '💡 高齢化、ライフスタイルの変化、競合店の増減など',
      btob: '💡 業界全体のデジタル化、法規制の変化、原材料費の動向など',
      other: '💡 市場環境や競合状況の変化について。わからなければ「特に変化なし」でも構いません'
    }
  };

  return helpTexts[questionType]?.[category] || helpTexts[questionType]?.other || '';
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
 * 特定のデータ項目を収集するための質問を生成
 * @param {Object} dataItem - データ項目（FORM2_REQUIREMENTSから）
 * @param {Object} collectedData - 収集済みデータ
 * @returns {Promise<Object>} - 質問オブジェクト
 */
const generateQuestionForDataItem = async (dataItem, collectedData) => {
  // Cloud Functions経由でClaude APIを呼び出す予定
  // 一旦はローカルでルールベースの質問生成

  const businessType = collectedData['Q1-1'] || '飲食業';
  const placeInfo = collectedData['Q1-0'] || {};

  // 業種に適用不可能な質問はスキップ
  if (!isQuestionApplicable(dataItem.id, businessType)) {
    console.log(`[AI Phase 2] Question ${dataItem.id} not applicable for ${businessType}`);
    // この質問をスキップして、次の不足データを取得する必要がある
    // ここでは完了扱いとして、呼び出し元で次の質問を取得させる
    return null;
  }

  // データ項目IDに応じた質問を生成
  const questionTemplates = {
    // ターゲット顧客
    'target_customers': {
      text: 'ターゲット顧客について教えてください',
      type: 'text',
      placeholder: getIndustrySpecificExamples('target_customers', businessType),
      helpText: '💡 主要顧客の年齢層・性別・職業・ライフスタイル',
      required_for: 'target_customers'
    },

    // 地域別顧客分布
    'customer_distribution': {
      text: 'お客様は、どこから来店されていますか？',
      type: 'multi_select',
      options: generateLocationOptions(placeInfo),
      helpText: '💡 複数選択可能です',
      required_for: 'customer_distribution'
    },

    // 客層の構成
    'customer_composition': {
      text: '新規のお客様とリピーターの割合はどれくらいですか？',
      type: 'single_select',
      options: [
        { value: '新規が多い（7:3以上）', label: '新規が多い（新規7割以上）' },
        { value: 'やや新規が多い（6:4）', label: 'やや新規が多い（新規6割）' },
        { value: '半々くらい（5:5）', label: '半々くらい（新規5割）' },
        { value: 'リピーターが多い（4:6以上）', label: 'リピーターが多い（リピーター6割以上）' },
        { value: 'わからない', label: 'わからない' }
      ],
      helpText: '💡 おおよその感覚で構いません',
      required_for: 'customer_composition'
    },

    // 季節変動
    'seasonal_patterns': {
      text: '売上が多い時期はいつですか？',
      type: 'single_select',
      options: [
        { value: '春（3-5月）', label: '春（3-5月）' },
        { value: '夏（6-8月）', label: '夏（6-8月）' },
        { value: '秋（9-11月）', label: '秋（9-11月）' },
        { value: '冬（12-2月）', label: '冬（12-2月）' },
        { value: '特に変動なし', label: '特に変動なし' }
      ],
      helpText: '💡 最も売上が多い季節を選んでください',
      required_for: 'seasonal_patterns'
    },

    // 日次・週次パターン
    'daily_weekly_patterns': {
      text: '1日の平均来客数は何人くらいですか？',
      type: 'number',
      placeholder: '例：50',
      helpText: '💡 平日と休日の平均で構いません',
      required_for: 'daily_weekly_patterns'
    },

    // 未開拓地域
    'untapped_areas': {
      text: 'まだアプローチできていない地域や顧客層はありますか？',
      type: 'text',
      placeholder: getIndustrySpecificExamples('untapped_areas', businessType),
      helpText: '💡 新規開拓の余地について教えてください',
      required_for: 'untapped_areas'
    },

    // 顧客ニーズ
    'customer_needs': {
      text: 'お客様は、どんなことを求めて来店されていますか？',
      type: 'text',
      placeholder: getIndustrySpecificExamples('customer_needs', businessType),
      helpText: '💡 お客様が求めているものを簡潔に',
      required_for: 'customer_needs'
    },

    // ニーズの変化
    'needs_changes': {
      text: 'お客様のニーズは、最近変化していますか？',
      type: 'text',
      placeholder: getIndustrySpecificExamples('needs_changes', businessType),
      helpText: '💡 特に変化を感じていなければ「変化なし」とご回答ください',
      required_for: 'needs_changes'
    },

    // 市場の動向
    'market_trends': {
      text: 'あなたのお店がある地域や業界で、どんなトレンドや変化がありますか？',
      type: 'text',
      placeholder: getIndustrySpecificExamples('market_trends', businessType),
      helpText: getIndustrySpecificHelpText('market_trends', businessType) || '💡 市場環境や競合状況の変化について。わからなければ「特に変化なし」でも構いません',
      required_for: 'market_trends'
    },

    // 競合状況
    'competitive_landscape': {
      text: '競合他社（ライバル店）と比べて、お客様の反応はいかがですか？',
      type: 'text',
      placeholder: getIndustrySpecificExamples('competitive_landscape', businessType),
      helpText: '💡 Google口コミや実際のお客様の声を参考に',
      required_for: 'competitive_landscape'
    }
  };

  // テンプレートがあればそれを使用
  if (questionTemplates[dataItem.id]) {
    return {
      id: `P2-${dataItem.id}`,
      ...questionTemplates[dataItem.id]
    };
  }

  // テンプレートがない場合は汎用質問を生成
  return {
    id: `P2-${dataItem.id}`,
    text: `${dataItem.label}について教えてください`,
    type: 'text',
    placeholder: dataItem.examples && dataItem.examples.length > 0
      ? `例：${dataItem.examples[0]}`
      : '',
    helpText: `💡 ${dataItem.description}`,
    required_for: dataItem.id
  };
};

/**
 * 地域の選択肢を生成（Google Mapsの住所から）
 */
const generateLocationOptions = (placeInfo) => {
  const address = placeInfo.address || '';

  // 住所から都道府県・市区町村を抽出
  const prefectureMatch = address.match(/(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/);
  const cityMatch = address.match(/([^都道府県]{2,}?[市区町村])/);

  const prefecture = prefectureMatch ? prefectureMatch[1] : '';
  const city = cityMatch ? cityMatch[1] : '';

  const options = [
    { value: city || '市内', label: `${city || '市内'}` },
    { value: '隣接市', label: '隣接市・町' },
    { value: '県内遠方', label: `${prefecture}内の遠方` },
    { value: '県外', label: '県外・都外' },
    { value: '観光客', label: '観光客（旅行の途中）' },
    { value: 'わからない', label: 'わからない' }
  ];

  return options;
};

/**
 * エラー時のフォールバック質問
 */
const generateFallbackQuestion = (collectedData) => {
  // Phase 2の基本的な質問に戻る
  return {
    id: 'P2-fallback',
    text: 'お客様について、もう少し詳しく教えてください',
    type: 'text',
    placeholder: '例：どのような方が来店されていますか？',
    helpText: '💡 顧客の特徴を教えてください',
    required_for: 'target_customers'
  };
};

export default generateNextPhase2Question;
