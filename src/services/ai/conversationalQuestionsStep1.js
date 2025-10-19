/**
 * Step 1: 対話型質問定義
 *
 * Google Maps検索から基本情報収集まで
 */

export const STEP1_QUESTIONS = [
  {
    id: 'Q1-0',
    priority: 1,
    text: 'お店や会社の名前を教えてください',
    type: 'place_search',
    helpText: 'Google Mapsで検索して、営業時間や口コミ情報を自動取得します',
    required: true,
    aiEnhance: false
  },
  {
    id: 'Q1-0-confirm',
    priority: 2,
    text: 'この情報で合っていますか？',
    type: 'place_confirm',
    required: true,
    dependencies: ['Q1-0'],
    aiEnhance: false
  },
  {
    id: 'Q1-1',
    priority: 3,
    text: '業種を選択してください',
    type: 'single_select',
    options: [
      '🍴 飲食店（レストラン・カフェ・居酒屋等）',
      '🛍️ 小売業（アパレル・雑貨・食品販売等）',
      '💇 美容・理容業（美容室・理容室・エステ・ネイル等）',
      '🔧 サービス業（清掃・修理・クリーニング等）',
      '🏗️ 建設業・製造業',
      'その他'
    ],
    required: true,
    dependencies: ['Q1-0-confirm'],
    aiEnhance: false
  },
  {
    id: 'Q1-2',
    priority: 4,
    text: '代表者のお名前を教えてください',
    type: 'text',
    placeholder: '例：山田太郎',
    required: true,
    dependencies: ['Q1-1'],
    aiEnhance: false,
    helpText: '補助金申請書に記載される代表者名です'
  },
  {
    id: 'Q1-3',
    priority: 5,
    text: 'どんな商品・サービスを提供していますか？',
    type: 'text',
    placeholder: '例：イタリア料理、ワイン販売',
    helpText: '💡 Google Mapsの情報を確認しますので、少々お待ちください...',
    required: true,
    dependencies: ['Q1-2'],
    aiEnhance: false,
    // Google Maps情報から自動提案がある場合は、それをplaceholderに表示
    dynamicPlaceholder: true
  },
  {
    id: 'Q1-3-multi',
    priority: 5.5,
    text: '他にも事業を行っていますか？',
    type: 'single_select',
    options: [
      'いいえ、これだけです',
      'はい、他にもあります'
    ],
    required: true,
    dependencies: ['Q1-3'],
    aiEnhance: false
  },
  {
    id: 'Q1-3-other',
    priority: 5.6,
    text: '他にどんな事業を行っていますか？',
    type: 'text',
    placeholder: '例：ケータリング、オンライン販売',
    helpText: '💡 追加の事業内容を簡潔に記入してください',
    required: true,
    dependencies: ['Q1-3-multi'],
    aiEnhance: false,
    // Q1-3-multiで「はい、他にもあります」を選んだ場合のみ表示
    condition: (answers) => answers['Q1-3-multi'] === 'はい、他にもあります'
  },
  {
    id: 'Q1-4',
    priority: 6,
    text: '常時雇用している従業員は何名いますか？',
    type: 'number',
    placeholder: '例：3',
    suffix: '名',
    helpText: '【常時雇用従業員とは】\n' +
      '✅ 含む：フルタイム勤務の正社員（週30時間以上）\n' +
      '❌ 含まない：\n' +
      '  • 経営者本人\n' +
      '  • 経営者と同居している家族従業員\n' +
      '  • パート・アルバイト（週30時間未満）\n' +
      '  • 派遣社員\n\n' +
      '⚠️ 飲食業・小売業・サービス業は5名以下、宿泊業・娯楽業は20名以下が対象です。',
    required: true,
    dependencies: ['Q1-3'],
    aiEnhance: false,
    validation: (value, answers) => {
      const businessType = answers['Q1-1'];
      const employeeCount = parseInt(value);

      // 業種別の上限判定
      if (businessType?.includes('飲食店') ||
          businessType?.includes('小売業') ||
          businessType?.includes('美容・理容業') ||
          businessType?.includes('サービス業')) {
        if (employeeCount > 5) {
          return {
            isValid: false,
            message: `⚠️ ${businessType}の場合、常時雇用従業員は5名以下である必要があります。\n\n` +
              '現在の従業員数では、この補助金の対象外となります。\n\n' +
              '▸ 6名以上の場合は「ものづくり補助金」など他の補助金制度をご検討ください。\n' +
              '▸ または、パート・アルバイト（週30時間未満）を除外して再度カウントしてください。'
          };
        }
      }

      if (businessType?.includes('宿泊業') || businessType?.includes('娯楽業')) {
        if (employeeCount > 20) {
          return {
            isValid: false,
            message: `⚠️ ${businessType}の場合、常時雇用従業員は20名以下である必要があります。\n\n` +
              '現在の従業員数では、この補助金の対象外となります。\n\n' +
              '▸ 21名以上の場合は「ものづくり補助金」など他の補助金制度をご検討ください。'
          };
        }
      }

      return { isValid: true };
    }
  },
  {
    id: 'Q1-5',
    priority: 7,
    text: '開業日を教えてください',
    type: 'date',
    placeholder: '例：2020-04-01',
    helpText: '⚠️ 申請時点で開業済みである必要があります',
    required: true,
    dependencies: ['Q1-4'],
    aiEnhance: false,
    validation: (value) => {
      const openingDate = new Date(value);
      const today = new Date();
      if (openingDate > today) {
        return {
          isValid: false,
          message: '開業日が未来の日付です。補助金申請は開業後にのみ可能です。'
        };
      }
      return { isValid: true };
    }
  },
  {
    id: 'Q1-6',
    priority: 8,
    text: '法人ですか、それとも個人事業主ですか？',
    type: 'single_select',
    options: [
      '個人事業主',
      '法人'
    ],
    required: true,
    dependencies: ['Q1-5'],
    aiEnhance: false
  },
  {
    id: 'Q1-7',
    priority: 9,
    text: '最近の月間売上はどのくらいですか？',
    type: 'number',
    placeholder: '例：80',
    suffix: '万円',
    helpText: '【入力方法】\n' +
      '• 単位：万円で入力してください\n' +
      '• 例：月間売上が80万円の場合 → 「80」と入力\n' +
      '• 例：月間売上が350万円の場合 → 「350」と入力\n\n' +
      '💡 おおよその金額で構いません。販路開拓の目標設定に使用します。',
    required: true,
    dependencies: ['Q1-6'],
    aiEnhance: false
  },
  {
    id: 'Q1-8',
    priority: 10,
    text: '週に何日営業していますか？',
    type: 'single_select',
    options: [
      '毎日（7日）',
      '週6日',
      '週5日',
      '週4日以下'
    ],
    required: true,
    dependencies: ['Q1-7'],
    aiEnhance: false,
    // Google Mapsから営業時間を取得できていない場合のみ質問
    condition: (answers) => {
      const placeInfo = answers['Q1-0'];
      if (!placeInfo || !placeInfo.openingHours || !placeInfo.openingHours.weekdayText) {
        return true; // 営業時間情報がない → 質問する
      }

      // 営業時間から営業日数を計算して自動回答
      const weekdayText = placeInfo.openingHours.weekdayText;
      const operatingDays = calculateOperatingDays(weekdayText);

      if (operatingDays !== null) {
        // 自動的に回答をセット (この処理は別途実装が必要)
        return false; // 営業時間情報がある → 質問スキップ
      }

      return true; // 計算できなかった → 質問する
    }
  },
  {
    id: 'Q1-9',
    priority: 11,
    text: '補助金を使って何を実行したいですか?（複数選択可）',
    type: 'multi_select',
    options: [
      '新しい設備・機械の購入',
      '店舗の改装・内装工事',
      '広告・チラシ・看板の制作',
      'ウェブサイトの制作・改修',
      'SNS広告・ネット広告',
      'Web予約システム・オンライン決済システム',
      '無人チェックインシステム・POSレジシステム',
      '新商品・新サービスの開発',
      '研修・人材育成',
      'その他'
    ],
    required: true,
    dependencies: ['Q1-8'],
    aiEnhance: false,
    helpText: '💡 複数ある場合は番号をカンマ区切りで入力してください（例：1,3,4）',
    validation: (value, answers) => {
      // valueは配列で渡される
      const selectedItems = Array.isArray(value) ? value : [value];

      // 明らかにWeb関連費のみ（ハードウェアなし）
      const pureWebItems = [
        'ウェブサイトの制作・改修',
        'SNS広告・ネット広告'
      ];

      // グレーゾーン（ハードウェア有無で経費区分が変わる）
      const ambiguousItems = [
        'Web予約システム・オンライン決済システム',
        '無人チェックインシステム・POSレジシステム'
      ];

      // Web関連費のみの申請は不可
      const onlyPureWeb = selectedItems.length > 0 &&
        selectedItems.every(item => pureWebItems.includes(item));

      if (onlyPureWeb) {
        return {
          isValid: false,
          message: '⚠️ ウェブサイト関連費のみでの申請はできません\n\n' +
            '小規模事業者持続化補助金では、ウェブ関連費は補助対象経費の1/4以内（最大50万円）という制限があります。\n\n' +
            'ウェブサイト制作に加えて、以下のような取組も併せてご検討ください：\n' +
            '• 新しい設備・機械の購入\n' +
            '• 店舗改装・内装工事\n' +
            '• 広告・チラシ・看板の制作'
        };
      }

      // グレーゾーンの項目がある場合は警告を表示
      const hasAmbiguous = selectedItems.some(item => ambiguousItems.includes(item));

      if (hasAmbiguous) {
        const ambiguousSelected = selectedItems.filter(item => ambiguousItems.includes(item));

        return {
          isValid: true,
          warning: '💡 経費区分の確認が必要な項目があります\n\n' +
            '【確認が必要な取組】\n' +
            ambiguousSelected.map(item => `• ${item}`).join('\n') +
            '\n\n' +
            '📌 判断基準：\n' +
            '▸ ハードウェア（機器・端末など）が含まれる場合\n' +
            '  → 「①機械装置等費」として申請可能\n' +
            '  例：タブレット、カードリーダー、自動精算機など\n\n' +
            '▸ ソフトウェアのみの場合\n' +
            '  → 「③ウェブサイト関連費」（総額の1/4以内、最大50万円）\n' +
            '  例：クラウド型システム、月額課金サービスなど\n\n' +
            '⚠️ 詳細な経費区分については、申請前に必ず商工会議所にご確認ください。'
        };
      }

      return { isValid: true };
    }
  },
  {
    id: 'Q1-10',
    priority: 12,
    text: '現在、実際に事業を行っていますか？',
    type: 'single_select',
    options: [
      'はい、営業中です',
      'いいえ、これから開業予定です',
      '休業中です'
    ],
    required: true,
    dependencies: ['Q1-9'],
    aiEnhance: false,
    helpText: '⚠️ 申請時点で実際に事業を行っている必要があります。\n' +
      '• 開業前、休業中の場合は申請できません。\n' +
      '• Google Mapsに登録されていても、実際に営業していない場合は対象外です。',
    validation: (value) => {
      if (value !== 'はい、営業中です') {
        return {
          isValid: false,
          message: '⚠️ この補助金は、申請時点で実際に事業を営んでいる事業者が対象です。\n\n' +
            '開業前や休業中の場合は申請できません。\n\n' +
            '開業後、または営業再開後に改めてご申請ください。'
        };
      }
      return { isValid: true };
    }
  },
  {
    id: 'Q1-11',
    priority: 13,
    text: '過去に「小規模事業者持続化補助金」を受給したことはありますか？',
    type: 'single_select',
    options: [
      'いいえ、初めて申請します',
      'はい、1回受給したことがあります',
      'はい、2回受給したことがあります',
      'はい、3回以上受給したことがあります'
    ],
    required: true,
    dependencies: ['Q1-10'],
    aiEnhance: false,
    helpText: '⚠️ 同一事業者が受給できる回数には制限があります。\n' +
      '• 過去に3回以上受給している場合、原則として申請できません。\n' +
      '• 前回の補助事業が完了していない場合も申請できません。',
    validation: (value) => {
      if (value === 'はい、3回以上受給したことがあります') {
        return {
          isValid: false,
          message: '⚠️ この補助金は、同一事業者による受給回数に上限があります。\n\n' +
            '過去に3回以上受給している場合、原則として申請できません。\n\n' +
            '詳細については商工会議所にご相談ください。'
        };
      }
      return { isValid: true };
    }
  },
  {
    id: 'Q1-12',
    priority: 14,
    text: '直近の確定申告（または決算）は完了していますか？',
    type: 'single_select',
    options: [
      'はい、確定申告済みです',
      'いいえ、まだ1期目で確定申告していません',
      'いいえ、確定申告していません'
    ],
    required: true,
    dependencies: ['Q1-11'],
    aiEnhance: false,
    helpText: '💡 申請には直近の確定申告書類の提出が必要な場合があります。\n' +
      '• 開業1年未満の場合は確定申告不要です。\n' +
      '• 確定申告をしていない場合は、申請前に税理士にご相談ください。',
    validation: (value, answers) => {
      const openingDate = new Date(answers['Q1-5']);
      const today = new Date();
      const monthsSinceOpening = (today - openingDate) / (1000 * 60 * 60 * 24 * 30);

      // 開業1年未満の場合は確定申告不要
      if (monthsSinceOpening < 12) {
        return { isValid: true };
      }

      if (value === 'いいえ、確定申告していません') {
        return {
          isValid: false,
          message: '⚠️ 開業から1年以上経過している場合、直近の確定申告が必要です。\n\n' +
            '確定申告をしていない場合は、まず税理士にご相談の上、確定申告を完了させてから申請してください。'
        };
      }

      return { isValid: true };
    }
  }
];

/**
 * Google Mapsの営業時間テキストから営業日数を計算
 * @param {Array} weekdayText - ["月曜日: 11:00~22:00", "火曜日: 定休日", ...]
 * @returns {string|null} - "毎日（7日）", "週6日", "週5日", "週4日以下", or null
 */
const calculateOperatingDays = (weekdayText) => {
  if (!weekdayText || weekdayText.length === 0) return null;

  // 営業している曜日をカウント
  let operatingDays = 0;

  for (const dayText of weekdayText) {
    // "定休日" や "Closed" が含まれていない = 営業日
    if (!dayText.includes('定休日') && !dayText.includes('Closed') && !dayText.includes('closed')) {
      operatingDays++;
    }
  }

  // 営業日数に応じて選択肢を返す
  if (operatingDays === 7) return '毎日（7日）';
  if (operatingDays === 6) return '週6日';
  if (operatingDays === 5) return '週5日';
  if (operatingDays <= 4) return '週4日以下';

  return null;
};

/**
 * 次に聞くべき質問を取得
 */
export const getNextStep1Question = (answers) => {
  const answeredIds = Object.keys(answers);

  const unanswered = STEP1_QUESTIONS.filter(q => {
    // 既に回答済み
    if (answeredIds.includes(q.id)) return false;

    // 依存関係チェック
    if (q.dependencies) {
      const allMet = q.dependencies.every(depId => answeredIds.includes(depId));
      if (!allMet) return false;
    }

    // 条件付き質問のチェック
    if (q.condition && typeof q.condition === 'function') {
      if (!q.condition(answers)) return false;
    }

    return true;
  }).sort((a, b) => a.priority - b.priority);

  return unanswered[0] || null;
};

/**
 * Google Mapsから自動回答できる情報を取得
 * @param {Object} answers - 現在の回答
 * @returns {Object|null} - { questionId, answer } or null
 */
export const getAutoAnswerFromGoogleMaps = (answers) => {
  const placeInfo = answers['Q1-0'];
  if (!placeInfo) return null;

  // Q1-8: 営業日数を自動回答
  if (!answers['Q1-8'] && answers['Q1-7']) {
    if (placeInfo.openingHours && placeInfo.openingHours.weekdayText) {
      const operatingDays = calculateOperatingDays(placeInfo.openingHours.weekdayText);
      if (operatingDays) {
        return {
          questionId: 'Q1-8',
          answer: operatingDays,
          source: 'Google Maps'
        };
      }
    }
  }

  return null;
};

/**
 * Step 1が完了したかチェック
 */
export const isStep1Complete = (answers) => {
  const requiredQuestions = STEP1_QUESTIONS.filter(q => {
    if (!q.required) return false;

    // 条件付き質問は、条件を満たす場合のみチェック
    if (q.condition && typeof q.condition === 'function') {
      return q.condition(answers);
    }

    return true;
  });

  return requiredQuestions.every(q => {
    const answer = answers[q.id];
    return answer !== null && answer !== undefined && answer !== '';
  });
};
