/**
 * Phase 2: 市場・顧客分析
 * 様式2「顧客ニーズと市場の動向」セクションのための質問
 * 中小企業診断士のように丁寧に聞いていく形式
 */

import { getDynamicPlaceholder, getDynamicHelpText } from './industryExamples';

export const conversationalQuestionsPhase2 = [
  // === ターゲット顧客の特定 ===
  {
    id: 'P2-1',
    text: 'まず、お客様について教えてください。\n\n主なお客様は、どのような方々ですか？',
    type: 'text',
    placeholder: (answers) => getDynamicPlaceholder('P2-1', answers) || '例：30代の女性',
    helpText: (answers) => getDynamicHelpText('P2-1', answers) || '💡 年齢層、性別、職業など、簡潔に教えてください',
    priority: 1,
    section: 'customer_analysis',
    formMapping: '様式2 - 顧客ニーズと市場の動向 - ターゲット顧客',
    validation: {
      required: false,
      minLength: 3,
      errorMessage: 'お客様の特徴を簡潔に教えてください'
    }
  },

  {
    id: 'P2-2',
    text: 'お客様があなたのお店を選んでくれている理由は何ですか？',
    type: 'multi_select',
    options: [
      { value: '価格が手頃', label: '価格が手頃' },
      { value: '品質が良い', label: '品質が良い' },
      { value: '雰囲気が良い', label: '雰囲気が良い' },
      { value: '接客が良い', label: '接客が良い' },
      { value: '立地が便利', label: '立地が便利' },
      { value: '商品の種類が豊富', label: '商品の種類が豊富' },
      { value: 'その他', label: 'その他（下の欄に記入）' }
    ],
    placeholder: (answers) => getDynamicPlaceholder('P2-2', answers) || '「その他」を選んだ場合は、ここに理由を書いてください',
    helpText: (answers) => {
      // Google Maps口コミから参考情報を生成
      if (answers['Q1-0'] && answers['Q1-0'].reviews && answers['Q1-0'].reviews.length > 0) {
        const topKeywords = extractTopReviewKeywords(answers['Q1-0'].reviews);
        return `💡 Google Maps口コミより：${topKeywords}\n\n上記を参考に、当てはまるものを選んでください（複数選択可）`;
      }
      return '💡 お客様の声や口コミを参考に、当てはまるものを選んでください（複数選択可）';
    },
    priority: 1,
    section: 'customer_analysis',
    formMapping: '様式2 - 顧客ニーズと市場の動向 - 選ばれる理由',
    validation: (answer) => {
      // multi_selectの場合、answerは配列
      if (!Array.isArray(answer) || answer.length === 0) {
        return {
          isValid: false,
          message: '最低1つは選択してください'
        };
      }
      return { isValid: true };
    }
  },

  {
    id: 'P2-3',
    text: 'お客様は、どんなことを求めて来店されていますか？',
    type: 'text',
    placeholder: (answers) => getDynamicPlaceholder('P2-3', answers) || '例：美味しいコーヒーとゆっくりできる空間',
    helpText: '💡 お客様が求めているものを簡潔に',
    priority: 1,
    section: 'customer_analysis',
    formMapping: '様式2 - 顧客ニーズと市場の動向 - 顧客ニーズ',
    validation: {
      required: false,
      minLength: 5
    }
  },

  // === 顧客ニーズの変化 ===
  {
    id: 'P2-4',
    text: 'お客様のニーズは、最近変化していますか？',
    type: 'text',
    placeholder: (answers) => getDynamicPlaceholder('P2-4', answers) || '例：コロナ後、テイクアウトの需要が増えた',
    helpText: '💡 特に変化を感じていなければ「変化なし」とご回答ください',
    priority: 2,
    section: 'customer_analysis',
    formMapping: '様式2 - 顧客ニーズと市場の動向 - ニーズの変化',
    validation: {
      required: false
    }
  },

  // === 市場環境・動向 ===
  {
    id: 'P2-5',
    text: 'あなたのお店がある地域や業界で、どんなトレンドや変化がありますか？',
    type: 'text',
    placeholder: (answers) => getDynamicPlaceholder('P2-5', answers) || '例：駅前の再開発で人通りが増えた',
    helpText: '💡 市場環境や競合状況の変化について',
    priority: 1,
    section: 'market_trends',
    formMapping: '様式2 - 顧客ニーズと市場の動向 - 市場の動向',
    validation: {
      required: false,
      minLength: 5
    }
  },

  // === 競合との比較 ===
  {
    id: 'P2-6',
    text: '競合他社（ライバル店）と比べて、お客様の反応はいかがですか？',
    type: 'text',
    placeholder: (answers) => getDynamicPlaceholder('P2-6', answers) || '例：リピーターが多い',
    helpText: '💡 Google口コミや実際のお客様の声を参考に',
    priority: 2,
    section: 'market_trends',
    formMapping: '様式2 - 顧客ニーズと市場の動向 - 競合比較',
    validation: {
      required: false
    }
  }
];

/**
 * Phase 2のカテゴリ定義
 */
export const phase2Categories = {
  customer_analysis: {
    title: '顧客分析',
    description: 'ターゲット顧客とそのニーズ'
  },
  market_trends: {
    title: '市場の動向',
    description: '業界トレンドと競合状況'
  }
};

/**
 * Google Maps口コミから主要キーワードを抽出
 * @param {Array} reviews - 口コミ配列
 * @returns {string} - 抽出されたキーワード
 */
const extractTopReviewKeywords = (reviews) => {
  if (!reviews || reviews.length === 0) {
    return '';
  }

  // 口コミテキストから頻出キーワードを抽出
  const keywords = {
    '価格が手頃': ['安い', '手頃', 'コスパ', 'リーズナブル', '良心的'],
    '品質が良い': ['美味しい', '質が良い', '新鮮', '高品質', 'こだわり'],
    '雰囲気が良い': ['雰囲気', '落ち着く', 'おしゃれ', '居心地', '空間'],
    '接客が良い': ['接客', '親切', '丁寧', '優しい', '対応'],
    '立地が便利': ['アクセス', '駅近', '便利', '行きやすい', '近い'],
    '商品の種類が豊富': ['種類', '豊富', 'メニュー', 'バリエーション', '選択肢']
  };

  const matchedReasons = [];
  const allText = reviews.map(r => r.text || '').join(' ').toLowerCase();

  Object.keys(keywords).forEach(reason => {
    const found = keywords[reason].some(kw => allText.includes(kw));
    if (found) {
      matchedReasons.push(reason);
    }
  });

  if (matchedReasons.length > 0) {
    return `「${matchedReasons.join('」「')}」という声が多いようです`;
  }

  return '口コミから具体的な理由を抽出できませんでした';
};

export default conversationalQuestionsPhase2;
