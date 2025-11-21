/**
 * Step 1: 対話型質問定義（完全版）
 *
 * 設計ドキュメント「セクション1-1_事業の概要_最終版.md」に基づく実装
 */

import { Q1_NEW_QUESTIONS } from './q1-new-questions';

export const STEP1_QUESTIONS = [
  // ウェルカムメッセージ
  {
    id: 'Q0-welcome',
    priority: 0,
    text: 'こんにちは！補助金AI申請アシスタントです🤖\n\n小規模事業者持続化補助金の申請書を、私が対話形式でお手伝いします。\n\n所要時間は約20分です。途中で保存もできるので、ご安心ください。\n\nでは、始めましょう！',
    type: 'welcome',
    required: false,
    aiEnhance: false
  },

  // =============================================
  // セクション1-1: 事業の概要
  // =============================================

  // ❶ Q1-6: 法人/個人事業主（最初の質問）
  {
    id: 'Q1-6',
    priority: 1,
    text: '事業形態について教えてください',
    type: 'single_select',
    options: [
      { value: 'corporate', label: '法人（株式会社、合同会社など）' },
      { value: 'individual', label: '個人事業主' }
    ],
    required: true,
    dependencies: [],
    aiEnhance: false,
    helpText: '💡 法人か個人事業主かを選択してください'
  },

  // ❷ Q1-2: 法人名と店舗名の違い（条件付き：法人の場合のみ）
  {
    id: 'Q1-2',
    priority: 2,
    text: '法人名（会社名）は店舗名と異なりますか？',
    type: 'single_select',
    options: [
      { value: 'same', label: '同じです（法人名 = 店舗名）' },
      { value: 'different', label: '異なります（法人名があります）' }
    ],
    required: true,
    dependencies: ['Q1-6'],
    condition: (answers) => answers['Q1-6'] === 'corporate',
    aiEnhance: false,
    helpText: '💡 例：株式会社クレアバッカスが「トラットリア・ベッラ」という店舗を運営している場合は「異なります」を選択'
  },

  // ❸ Q1-2-company: 法人名（条件付き：法人名が店舗名と異なる場合のみ）
  {
    id: 'Q1-2-company',
    priority: 3,
    text: '法人名（会社名）を教えてください',
    type: 'text',
    placeholder: '例：株式会社〇〇',
    required: true,
    dependencies: ['Q1-2'],
    condition: (answers) => answers['Q1-2'] === 'different',
    aiEnhance: false,
    helpText: '💡 正式な法人名を入力してください（株式会社、合同会社などの法人格も含む）'
  },

  // ❺ Q1-5: 店舗開業日
  {
    id: 'Q1-5',
    priority: 4,
    text: '開業日を教えてください',
    type: 'date',
    placeholder: '例：2020-04-01',
    required: true,
    dependencies: ['Q1-6'],
    aiEnhance: false,
    helpText: '⚠️ 申請時点で開業済みである必要があります',
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

  // ❻ Q1-0: Google Maps検索
  {
    id: 'Q1-0',
    priority: 5,
    text: '店舗名や会社名を教えてください\n\n店舗名や住所を入力いただければ、Google Mapsから営業時間や口コミ情報を自動で取得します📍',
    type: 'text',
    placeholder: '例：トラットリア・ベッラ 三軒茶屋',
    required: true,
    dependencies: ['Q1-5'],
    aiEnhance: true,
    googleMapsSearch: true,
    helpText: '💡 店舗名だけでも大丈夫です。AIが自動でGoogle Mapsから情報を検索します'
  },

  // ❼ Q1-0-analysis: Google Maps情報の分析（自動実行）
  {
    id: 'Q1-0-analysis',
    priority: 6,
    text: '',
    type: 'ai_place_analysis',
    required: false,
    dependencies: ['Q1-0'],
    aiEnhance: false,
    autoProgress: true,
    generateMessage: (placeData) => {
      const { rating, userRatingsTotal, types, openingHours, website } = placeData;

      let industryGuess = '店舗';
      if (types && types.includes('restaurant')) industryGuess = 'レストラン';
      else if (types && types.includes('cafe')) industryGuess = 'カフェ';
      else if (types && types.includes('bakery')) industryGuess = 'ベーカリー';
      else if (types && types.includes('beauty_salon')) industryGuess = '美容室';

      let operatingDays = 0;
      if (openingHours && openingHours.periods) {
        const uniqueDays = new Set(openingHours.periods.map(p => p.open?.day));
        operatingDays = uniqueDays.size;
      }

      const websiteInfo = website ? `✅ 公式サイト: 取得済み\n` : '';

      return `ありがとうございます！\n\nGoogle Mapsの情報から、以下のことがわかりました：\n\n✅ ${industryGuess}\n✅ 営業日: 週${operatingDays}日${operatingDays > 0 ? '' : '（情報取得中...）'}\n${rating ? `✅ 口コミ評価: ★${rating.toFixed(1)} (${userRatingsTotal || 0}件)\n` : ''}${websiteInfo}${rating && rating >= 4.0 ? '✅ 高評価ですね👍\n' : ''}\nでは、いくつか質問させてください。`;
    }
  },

  // ❽ Q1-0-website: 追加WebサイトURL（条件付き：Google MapsにWebサイトがない場合のみ）
  {
    id: 'Q1-0-website',
    priority: 7,
    text: 'お店や会社のWebページのURLがあれば教えてください（任意）\n\nホームページの情報から、より精度の高い質問を自動生成できます📍',
    type: 'text',
    placeholder: '例：https://tabelog.com/〇〇、https://beauty.hotpepper.jp/〇〇',
    required: false,
    dependencies: ['Q1-0'],
    condition: (answers) => {
      const placeInfo = answers['Q1-0'];
      return !placeInfo || !placeInfo.website;
    },
    aiEnhance: false,
    helpText: '💡 以下のようなURLが利用できます：\n' +
      '【飲食店】食べログ、ぐるなび、ホットペッパーグルメ、公式HP、Instagram\n' +
      '【美容室】ホットペッパービューティー、楽天ビューティー、公式HP、Instagram\n' +
      '【小売・サービス】公式HP、Instagram、Facebook、ECサイト\n\n' +
      '入力しなくても質問は続けられます。'
  },

  // ❿ Q1-1: 業種確認
  {
    id: 'Q1-1',
    priority: 8,
    text: 'どんな業種ですか？\n\n例えば、「レストラン」「美容室」「雑貨店」のように教えてください',
    type: 'text',
    placeholder: '例：イタリアンレストラン、美容室、アパレルショップ',
    required: true,
    dependencies: ['Q1-0'],
    aiEnhance: true,
    helpText: '💡 具体的な業種名で構いません。AIが自動で業種分類を判定します'
  },

  // ⓫ Q1-3: 商品・サービス
  {
    id: 'Q1-3',
    priority: 9,
    text: 'どんな商品・サービスを提供していますか？',
    type: 'text',
    placeholder: '例：イタリア料理、ワイン販売',
    required: true,
    dependencies: ['Q1-1'],
    aiEnhance: false,
    helpText: '💡 Google Mapsの情報を確認しますので、少々お待ちください...',
    dynamicPlaceholder: true
  },

  // Q1-3-multi: 追加事業
  {
    id: 'Q1-3-multi',
    priority: 10,
    text: '他にも事業を行っていますか？\n\n例えば、「ケータリング」や「オンライン販売」などあれば教えてください。なければ「なし」と入力してください',
    type: 'text',
    placeholder: '例：ケータリング、オンライン販売、通販、なし',
    required: true,
    dependencies: ['Q1-3'],
    aiEnhance: true,
    helpText: '💡 追加の事業がない場合は「なし」「ありません」などと入力してください'
  },

  // Q1-NEW-1〜Q1-NEW-5を展開
  ...Q1_NEW_QUESTIONS,

  // =============================================
  // セクション1-2以降: 従業員、売上等
  // =============================================

  // Q1-4: 従業員数
  {
    id: 'Q1-4',
    priority: 11,
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
    dependencies: ['Q1-NEW-5'],
    aiEnhance: false,
    validation: (value, answers) => {
      const businessType = answers['Q1-1'];
      const employeeCount = parseInt(value);

      if (businessType?.includes('飲食店') ||
          businessType?.includes('小売業') ||
          businessType?.includes('美容・理容業') ||
          businessType?.includes('サービス業')) {
        if (employeeCount > 5) {
          return {
            isValid: false,
            message: `⚠️ ${businessType}の場合、常時雇用従業員は5名以下である必要があります。`
          };
        }
      }

      if (businessType?.includes('宿泊業') || businessType?.includes('娯楽業')) {
        if (employeeCount > 20) {
          return {
            isValid: false,
            message: `⚠️ ${businessType}の場合、常時雇用従業員は20名以下である必要があります。`
          };
        }
      }

      return { isValid: true };
    }
  },

  // Q1-7: 補助金の目的
  {
    id: 'Q1-7',
    priority: 12,
    text: '補助金を活用して、具体的にどのようなことを実現したいですか？\n\nできるだけ詳しく教えてください',
    type: 'textarea',
    placeholder: '例：新規顧客を増やしたい、売上を20%アップさせたい、オンライン販売を始めたい、店舗の認知度を上げたい',
    helpText: '💡 この情報を元に、あなたに最適な質問を自動生成します。\n\n【記入例】\n' +
      '• 新しいホームページを作って、オンラインからの予約を増やしたい\n' +
      '• チラシを配って、近隣住民に店舗を知ってもらいたい\n' +
      '• 新しい設備を導入して、商品の品質を向上させたい',
    required: true,
    dependencies: ['Q1-4'],
    aiEnhance: false
  },

  // Q1-8: 年間売上
  {
    id: 'Q1-8',
    priority: 13,
    text: '直近の決算期（または確定申告）の年間売上を教えてください',
    type: 'number',
    placeholder: '例：1200',
    suffix: '万円',
    helpText: '【入力方法】\n' +
      '• 単位：万円で入力してください\n' +
      '• 例：年間売上が1,200万円の場合 → 「1200」と入力\n' +
      '• 例：年間売上が850万円の場合 → 「850」と入力\n\n' +
      '💡 決算書や確定申告書の数字を参考にしてください。概算で構いません。',
    required: true,
    dependencies: ['Q1-7'],
    aiEnhance: false
  },

  // Q1-8-trend: 売上の傾向
  {
    id: 'Q1-8-trend',
    priority: 14,
    text: 'ここ数年の売上の傾向を教えてください',
    type: 'single_select',
    options: [
      { value: '上昇傾向', label: '上昇傾向（年々増えている）' },
      { value: '横ばい', label: '横ばい（ほぼ変わらない）' },
      { value: '下降傾向', label: '下降傾向（年々減っている）' },
      { value: 'わからない', label: 'わからない' }
    ],
    helpText: '💡 おおよその傾向で構いません。コロナ禍の影響なども考慮してください',
    required: true,
    dependencies: ['Q1-8'],
    aiEnhance: false
  },

  // Q1-9: 経常利益
  {
    id: 'Q1-9',
    priority: 15,
    text: '直近の決算期（または確定申告）の経常利益（または営業利益）を教えてください\n\nわからない場合は「0」と入力してください',
    type: 'number',
    placeholder: '例：120',
    suffix: '万円',
    helpText: '【経常利益とは】\n' +
      '売上から全ての経費を引いた利益です\n\n' +
      '【入力方法】\n' +
      '• 単位：万円で入力してください\n' +
      '• 黒字の場合：そのまま入力（例：150万円 → 「150」）\n' +
      '• 赤字の場合：マイナスを付けて入力（例：-50万円 → 「-50」）\n\n' +
      '💡 赤字の場合は補助率が3/4（通常2/3）になります',
    required: true,
    dependencies: ['Q1-8-trend'],
    aiEnhance: false
  },

  // Q1-10: 粗利益率
  {
    id: 'Q1-10',
    priority: 16,
    text: 'おおよその粗利益率（売上総利益率）を教えてください\n\nわからない場合は「50」と入力してください',
    type: 'number',
    placeholder: '例：60',
    suffix: '%',
    helpText: '【粗利益率とは】\n' +
      '(売上 - 売上原価) ÷ 売上 × 100 で計算します\n\n' +
      '【業種別の目安】\n' +
      '• 飲食店：60-70%\n' +
      '• 小売業：30-40%\n' +
      '• 美容室：70-80%\n' +
      '• サービス業：50-70%\n\n' +
      '💡 おおよその数値で構いません',
    required: true,
    dependencies: ['Q1-9'],
    aiEnhance: false
  },

  // Q1-11: 客単価
  {
    id: 'Q1-11',
    priority: 17,
    text: 'お客様1人あたりの平均的な購入金額（客単価）を教えてください',
    type: 'number',
    placeholder: '例：3500',
    suffix: '円',
    helpText: '【客単価とは】\n' +
      '1人のお客様が1回の来店・購入で使う平均金額です\n\n' +
      '【業種別の目安】\n' +
      '• 小売店：1,000円〜3,000円\n' +
      '• カフェ：800円〜1,500円\n' +
      '• レストラン：2,000円〜5,000円\n' +
      '• 美容室：5,000円〜10,000円\n\n' +
      '💡 おおよその金額で構いません',
    required: true,
    dependencies: ['Q1-10'],
    aiEnhance: false
  },

  // Phase 1完了
  {
    id: 'Q1-COMPLETE',
    priority: 18,
    text: '✅ Phase 1（基本情報）の質問が完了しました！\n\nお疲れ様でした。',
    type: 'completion',
    required: false,
    dependencies: ['Q1-11'],
    aiEnhance: false,
    autoProgress: false
  }
];

/**
 * 次の質問を取得（依存関係と条件を考慮）
 */
export const getNextQuestion = (answers, currentQuestionId = null) => {
  const answeredIds = Object.keys(answers);

  const unansweredQuestions = STEP1_QUESTIONS.filter(q => {
    if (answeredIds.includes(q.id)) return false;

    if (q.dependencies) {
      const allDependenciesMet = q.dependencies.every(depId => answeredIds.includes(depId));
      if (!allDependenciesMet) return false;
    }

    if (q.condition && !q.condition(answers)) return false;

    return true;
  });

  unansweredQuestions.sort((a, b) => a.priority - b.priority);

  return unansweredQuestions[0] || null;
};

/**
 * 質問の進捗率を計算
 */
export const calculateProgress = (answers) => {
  const totalQuestions = STEP1_QUESTIONS.filter(q => q.type !== 'welcome' && q.type !== 'completion').length;
  const answeredQuestions = Object.keys(answers).filter(id => {
    const question = STEP1_QUESTIONS.find(q => q.id === id);
    return question && question.type !== 'welcome' && question.type !== 'completion';
  }).length;

  return Math.round((answeredQuestions / totalQuestions) * 100);
};

/**
 * Step 1が完了したかチェック
 */
export const isStep1Complete = (answers) => {
  const requiredQuestions = STEP1_QUESTIONS.filter(q => {
    if (!q.required) return false;

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
