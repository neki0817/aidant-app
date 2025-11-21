/**
 * Phase 5: 補助事業の具体的内容
 * 様式2「補助事業で行う事業名」「販路開拓等の取組内容」セクションのための質問
 * 中小企業診断士のように丁寧に聞いていく形式
 */

export const conversationalQuestionsPhase5 = [
  // === P5-1: 購入・導入するもの（費用は別質問） ===
  {
    id: 'P5-1',
    text: '補助金で何を購入・導入する予定ですか？',
    type: 'textarea',
    placeholder: '例：\n・POSレジシステム\n・ホームページ制作\n・チラシ印刷\n・看板制作',
    helpText: '💡 購入・導入するものを列挙してください（費用は次の質問で聞きます）',
    priority: 1,
    section: 'project_overview',
    formMapping: '様式2 - 販路開拓等の取組内容',
    validation: {
      required: false,
      minLength: 5,
      errorMessage: '購入・導入するものを教えてください'
    }
  },

  // === P5-2: それぞれの費用 ===
  {
    id: 'P5-2',
    text: 'それぞれの費用を教えてください。',
    type: 'textarea',
    placeholder: '例：\n・POSレジシステム：30万円\n・ホームページ制作：50万円\n・チラシ印刷：5万円\n・看板制作：15万円',
    suffix: '',
    aiEnhance: false,
    helpText: '💡 概算で構いません。見積もりがあれば見積額を入力してください',
    priority: 1,
    section: 'equipment_investment',
    formMapping: '様式2 - 販路開拓等の取組内容 - 経費明細',
    validation: {
      required: false,
      minLength: 5,
      errorMessage: 'それぞれの費用を教えてください'
    }
  },

  // === P5-3: 実施時期（開始） ===
  {
    id: 'P5-3',
    text: 'いつ頃から事業を開始する予定ですか？',
    type: 'text',
    placeholder: '例：2025年6月、来月、3ヶ月後',
    helpText: '💡 おおよその時期で構いません',
    priority: 1,
    section: 'schedule',
    formMapping: '様式2 - 販路開拓等の取組内容 - 開始時期',
    validation: {
      required: false,
      minLength: 3,
      errorMessage: '開始時期を教えてください'
    }
  },

  // === P5-4: 実施時期（完了） ===
  {
    id: 'P5-4',
    text: 'いつ頃までに完了する予定ですか？',
    type: 'text',
    placeholder: '例：2025年12月、半年後、1年後',
    helpText: '💡 おおよその時期で構いません',
    priority: 1,
    section: 'schedule',
    formMapping: '様式2 - 販路開拓等の取組内容 - 完了時期',
    validation: {
      required: false,
      minLength: 3,
      errorMessage: '完了時期を教えてください'
    }
  },

  // === P5-5: 新規顧客数の見込み（事実ベース） ===
  {
    id: 'P5-5',
    text: 'この事業で、新規のお客様は月に何組（何人）くらい増えると思いますか？',
    type: 'number',
    placeholder: '例：20',
    suffix: '組（人）',
    helpText: '💡 おおよその見込みで構いません',
    priority: 1,
    section: 'expected_results',
    formMapping: '様式2 - 販路開拓等の取組内容 - 新規顧客増加見込み',
    validation: {
      required: false,
      min: 0,
      max: 10000
    }
  },

  // === P5-6: リピート率の見込み（事実ベース） ===
  {
    id: 'P5-6',
    text: '新しく来たお客様のうち、何割くらいがリピーターになると思いますか？',
    type: 'number',
    placeholder: '例：30',
    suffix: '%',
    helpText: '💡 これまでの経験から、おおよその割合を教えてください',
    priority: 2,
    section: 'expected_results',
    formMapping: '様式2 - 販路開拓等の取組内容 - リピート率',
    condition: (answers) => {
      return answers['P5-5'] && answers['P5-5'] > 0;
    },
    validation: {
      required: false,
      min: 0,
      max: 100
    }
  },

  // === P5-7: 補助金が必要な理由（簡潔に） ===
  {
    id: 'P5-7',
    text: 'なぜこの補助金が必要ですか？',
    type: 'single_select',
    options: [
      { value: '自己資金だけでは投資が難しい', label: '自己資金だけでは投資が難しい' },
      { value: '売上減少で資金繰りが厳しい', label: '売上減少で資金繰りが厳しい' },
      { value: '早期に実施したい', label: '早期に実施したい' },
      { value: '投資リスクを軽減したい', label: '投資リスクを軽減したい' },
      { value: 'その他', label: 'その他' }
    ],
    helpText: '💡 最も近い理由を選んでください',
    priority: 2,
    section: 'subsidy_necessity',
    formMapping: '様式2 - 販路開拓等の取組内容 - 補助金の必要性',
    validation: {
      required: false
    }
  },

  // =============================================
  // 仕入先・購入先情報（経費明細表の詳細情報）
  // =============================================

  // === P5-8: 仕入先情報の入力方法 ===
  {
    id: 'P5-8',
    text: '購入予定のものについて、仕入先（購入先）の情報を入力してください。\n\n見積書がある場合は、その情報を入力してください。',
    type: 'supplier_table_input',
    required: false,
    dependencies: ['P5-2'],
    aiEnhance: false,
    helpText: '💡 【入力項目】\n\n各購入予定のものについて：\n• 仕入先名（会社名）\n• 商品・サービス名\n• 単価\n• 数量\n• 合計金額\n\n見積書がある場合は、その内容を入力してください。\n見積書がない場合は、おおよその金額で構いません。',
    priority: 3,
    section: 'supplier_info',
    formMapping: '様式2 - 経費明細表 - 仕入先情報'
  }
];

/**
 * Phase 5のカテゴリ定義
 */
export const phase5Categories = {
  project_overview: {
    title: '事業の概要',
    description: '補助事業の名称と実施内容'
  },
  equipment_investment: {
    title: '設備投資',
    description: '導入する設備・システム'
  },
  promotion: {
    title: '広告宣伝',
    description: 'プロモーション活動'
  },
  other_costs: {
    title: 'その他経費',
    description: '専門家費用、研修費など'
  },
  schedule: {
    title: '実施スケジュール',
    description: '事業の実施時期'
  },
  expected_results: {
    title: '期待する効果',
    description: '売上増加見込みと根拠'
  },
  subsidy_necessity: {
    title: '補助金の必要性',
    description: 'なぜ補助金が必要か'
  },
  supplier_info: {
    title: '仕入先・購入先情報',
    description: '経費明細表の詳細情報'
  },
  future_development: {
    title: '事業の発展性',
    description: '将来的な展望'
  }
};

export default conversationalQuestionsPhase5;
