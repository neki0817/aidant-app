/**
 * Phase 4: 経営方針・目標と今後のプラン
 * 様式2「経営方針・目標と今後のプラン」セクションのための質問
 * 中小企業診断士のように丁寧に聞いていく形式
 */

export const conversationalQuestionsPhase4 = [
  // === 経営方針・ビジョン ===
  {
    id: 'P4-1',
    text: 'これまでのお話を踏まえて、今後どのような方向に進んでいきたいとお考えですか？\n\nあなたの事業のビジョンを教えてください。',
    type: 'textarea',
    placeholder: '例：\n・地域で一番愛される○○店になりたい\n・もっと多くのお客様に来てもらいたい\n・専門性を高めてブランド力を向上させたい\n・事業を拡大して2店舗目を出したい',
    helpText: '💡 将来のビジョンや目指す姿を自由に教えてください',
    priority: 1,
    section: 'vision_goals',
    formMapping: '様式2 - 経営方針・目標と今後のプラン - 経営ビジョン',
    validation: {
      required: false,
      minLength: 15,
      errorMessage: '今後の方向性を具体的に教えてください（15文字以上）'
    }
  },

  // === 具体的な経営目標 ===
  {
    id: 'P4-2',
    text: 'そのビジョンを実現するために、具体的にどのような目標を立てていますか？',
    type: 'textarea',
    placeholder: '例：\n・3年後に売上を1.5倍にする\n・客単価を20%アップさせる\n・新規顧客を月30名獲得する\n・リピーター率を80%以上にする\n・従業員を2名増やす',
    helpText: '💡 数値目標があれば、より具体的に書いてください',
    priority: 1,
    section: 'vision_goals',
    formMapping: '様式2 - 経営方針・目標と今後のプラン - 経営目標',
    validation: {
      required: false,
      minLength: 10
    }
  },

  // === 目標達成のための取り組み ===
  {
    id: 'P4-3',
    text: 'その目標を達成するために、今後どのような取り組みを行う予定ですか？',
    type: 'textarea',
    placeholder: '例：\n・新メニュー・新商品の開発\n・Web・SNSでの情報発信強化\n・店舗改装で雰囲気を改善\n・新しい設備を導入して生産性向上\n・スタッフ教育でサービス品質向上',
    helpText: '💡 具体的な施策や計画を教えてください',
    priority: 1,
    section: 'vision_goals',
    formMapping: '様式2 - 経営方針・目標と今後のプラン - 具体的取り組み',
    validation: {
      required: false,
      minLength: 20
    }
  },

  // === タイムライン・スケジュール ===
  {
    id: 'P4-4',
    text: 'それらの取り組みは、いつ頃実施する予定ですか？',
    type: 'textarea',
    placeholder: '例：\n・今すぐ始めたい\n・半年以内に開始\n・1年以内に段階的に実施\n・2〜3年かけて計画的に進める',
    helpText: '💡 おおよそのスケジュール感を教えてください',
    priority: 2,
    section: 'vision_goals',
    formMapping: '様式2 - 経営方針・目標と今後のプラン - 実施時期',
    validation: {
      required: false
    }
  },

  // === 重点課題 ===
  {
    id: 'P4-5',
    text: '目標達成のために、最も重要だと考えている課題は何ですか？',
    type: 'textarea',
    placeholder: '例：\n・新規顧客の獲得\n・リピーター率の向上\n・客単価の向上\n・認知度の向上\n・人手不足の解消\n・業務効率化',
    helpText: '💡 優先的に取り組むべき課題を教えてください',
    priority: 1,
    section: 'challenges',
    formMapping: '様式2 - 経営方針・目標と今後のプラン - 重点課題',
    validation: {
      required: false,
      minLength: 10
    }
  },

  // === 課題解決の方向性 ===
  {
    id: 'P4-6',
    text: 'その課題を解決するために、どのようなアプローチを考えていますか？',
    type: 'textarea',
    placeholder: '例：\n・Webサイトやsnsを活用した集客強化\n・メニュー・サービスの見直しでリピート率向上\n・セット販売や関連商品提案で客単価アップ\n・設備投資で業務効率化と品質向上',
    helpText: '💡 具体的な解決策を教えてください',
    priority: 1,
    section: 'challenges',
    formMapping: '様式2 - 経営方針・目標と今後のプラン - 課題解決策',
    validation: {
      required: false,
      minLength: 15
    }
  },

  // === 必要な投資・資源 ===
  {
    id: 'P4-7',
    text: '目標を達成するために、どのような投資や資源が必要だと考えていますか？',
    type: 'textarea',
    placeholder: '例：\n・新しい設備・機器の導入\n・店舗の改装・リニューアル\n・Webサイト・システムの構築\n・広告宣伝費の投入\n・スタッフの採用・教育',
    helpText: '💡 必要な設備投資、システム、人材など',
    priority: 2,
    section: 'challenges',
    formMapping: '様式2 - 経営方針・目標と今後のプラン - 必要な投資',
    validation: {
      required: false
    }
  },

  // === 期待する効果 ===
  {
    id: 'P4-8',
    text: 'これらの取り組みを実施することで、どのような効果を期待していますか？',
    type: 'textarea',
    placeholder: '例：\n・売上が年間○○万円増加する見込み\n・新規顧客が月○○名増える\n・作業時間が○○%削減できる\n・客単価が○○円アップする\n・顧客満足度が向上する',
    helpText: '💡 できるだけ具体的な数値で効果を示してください',
    priority: 1,
    section: 'expected_results',
    formMapping: '様式2 - 経営方針・目標と今後のプラン - 期待効果',
    validation: {
      required: false,
      minLength: 15
    }
  },

  // =============================================
  // SWOT分析（様式2_補助事業計画書の要件に基づく）
  // =============================================

  // === 強み（Strengths） ===
  {
    id: 'P4-SWOT-S',
    text: 'あなたの事業の「強み」を3つ挙げてください',
    type: 'textarea',
    placeholder: '例：\n1. 地域で20年の実績と信頼\n2. 独自のレシピ・技術\n3. リピーター率80%以上',
    helpText: '💡 Phase 3で答えた強みを簡潔にまとめてください',
    priority: 2,
    section: 'swot_analysis',
    formMapping: '様式2 - SWOT分析 - 強み',
    validation: {
      required: false,
      minLength: 10
    }
  },

  // === 弱み（Weaknesses） ===
  {
    id: 'P4-SWOT-W',
    text: 'あなたの事業の「弱み」を3つ挙げてください',
    type: 'textarea',
    placeholder: '例：\n1. 認知度が低い\n2. 設備が古い\n3. Webでの情報発信が不足',
    helpText: '💡 改善すべき点を正直に書いてください',
    priority: 2,
    section: 'swot_analysis',
    formMapping: '様式2 - SWOT分析 - 弱み',
    validation: {
      required: false,
      minLength: 10
    }
  },

  // === 機会（Opportunities） ===
  {
    id: 'P4-SWOT-O',
    text: 'あなたの事業にとって「機会（チャンス）」となる外部環境の変化を3つ挙げてください',
    type: 'textarea',
    placeholder: '例：\n1. 駅前の再開発で人通りが増加\n2. 健康志向の高まり\n3. SNSでの口コミ拡散',
    helpText: '💡 地域の変化、業界トレンド、社会の動きなど',
    priority: 2,
    section: 'swot_analysis',
    formMapping: '様式2 - SWOT分析 - 機会',
    validation: {
      required: false,
      minLength: 10
    }
  },

  // === 脅威（Threats） ===
  {
    id: 'P4-SWOT-T',
    text: 'あなたの事業にとって「脅威（リスク）」となる外部環境の変化を3つ挙げてください',
    type: 'textarea',
    placeholder: '例：\n1. 近隣に競合店が増加\n2. 人口減少・少子高齢化\n3. 原材料費の高騰',
    helpText: '💡 競合、経済環境、法規制の変化など',
    priority: 2,
    section: 'swot_analysis',
    formMapping: '様式2 - SWOT分析 - 脅威',
    validation: {
      required: false,
      minLength: 10
    }
  }
];

/**
 * Phase 4のカテゴリ定義
 */
export const phase4Categories = {
  vision_goals: {
    title: '経営ビジョンと目標',
    description: '将来の方向性と具体的目標'
  },
  challenges: {
    title: '重点課題と解決策',
    description: '優先課題とアプローチ'
  },
  expected_results: {
    title: '期待する効果',
    description: '取り組みによる成果'
  },
  swot_analysis: {
    title: 'SWOT分析',
    description: '強み・弱み・機会・脅威の分析'
  }
};

export default conversationalQuestionsPhase4;
