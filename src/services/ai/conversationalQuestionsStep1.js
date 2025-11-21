/**
 * Step 1: 対話型質問定義（完全版）
 *
 * 設計ドキュメント「セクション1-1_事業の概要_最終版.md」に基づく実装
 */

import {
  isPastFiscalMonth,
  getFiscalPeriodLabel,
  getQuestionPeriodLabel,
  getFiscalMonthExplanation
} from './fiscalYearHelper';

export const STEP1_QUESTIONS = [
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
    required: false,
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
    required: false,
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
    required: false,
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
    required: false,
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

  // ❹ Q1-5-corporate: 法人設立日（条件付き：法人の場合のみ）
  {
    id: 'Q1-5-corporate',
    priority: 4.5,
    text: '法人の設立日を教えてください',
    type: 'date',
    placeholder: '例：2018-04-01',
    required: false,
    dependencies: ['Q1-6'],
    condition: (answers) => answers['Q1-6'] === 'corporate',
    aiEnhance: false,
    helpText: '💡 登記簿に記載されている会社の設立年月日を入力してください'
  },

  // ❺-2 Q1-5-fiscal: 決算月（全員必須）
  {
    id: 'Q1-5-fiscal',
    priority: 4.6,
    text: '決算月を教えてください（数字で入力）',
    type: 'number',
    placeholder: '例：3',
    required: false,
    dependencies: ['Q1-5'],
    aiEnhance: false,
    helpText: '💡 会計年度の締め月を数字で入力してください（1〜12）\n\n例：3月決算の場合は「3」、12月決算の場合は「12」\n\n個人事業主の場合は通常「12」です',
    validation: (value) => {
      const month = parseInt(value);
      if (isNaN(month) || month < 1 || month > 12) {
        return {
          isValid: false,
          message: '1〜12の数字を入力してください'
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
    required: false,
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

  // ❼-1 Q1-0-website-check: 追加URL入力の確認
  {
    id: 'Q1-0-website-check',
    priority: 6.5,
    text: '他にもWebページ（食べログ、ホットペッパー等）のURLを追加しますか？\n\nホームページの情報から、より精度の高い質問を自動生成できます',
    type: 'single_select',
    options: [
      { value: 'はい', label: 'はい（URLを追加する）' },
      { value: 'いいえ', label: 'いいえ（このまま進む）' }
    ],
    required: false,
    dependencies: ['Q1-0-analysis'],
    aiEnhance: false,
    helpText: '💡 食べログ、ホットペッパーなどの口コミサイトや公式HPのURLがあると、より詳細な情報を取得できます'
  },

  // ❽ Q1-0-website: 追加WebサイトURL（条件付き：URLを追加すると選んだ場合のみ）
  {
    id: 'Q1-0-website',
    priority: 7,
    text: 'WebページのURLを教えてください',
    type: 'text',
    placeholder: '例：https://tabelog.com/〇〇、https://beauty.hotpepper.jp/〇〇',
    required: false,
    dependencies: ['Q1-0-website-check'],
    condition: (answers) => answers['Q1-0-website-check'] === 'はい',
    aiEnhance: false
  },

  // ❿ Q1-1: 業種大分類の確認（AI自動判定）
  {
    id: 'Q1-1',
    priority: 8,
    prependMessage: '✅ 市場調査が完了しました。Phase 2の質問生成に活用します。',
    text: (answers) => {
      // Google MapsとTabelogのデータから業種を自動判定
      const placeData = answers['Q1-0'];
      const tabelogData = answers['Q1-0-tabelog'];

      let detectedCategory = '飲食業';

      // Tabelogキーワードから判定
      if (tabelogData?.keywords) {
        const keywords = tabelogData.keywords.join(',');
        if (keywords.includes('美容') || keywords.includes('理容') || keywords.includes('エステ') || keywords.includes('ネイル')) {
          detectedCategory = 'サービス業（美容・理容業）';
        } else if (keywords.includes('小売') || keywords.includes('雑貨') || keywords.includes('アパレル') || keywords.includes('販売')) {
          detectedCategory = '小売業';
        } else if (keywords.includes('宿泊') || keywords.includes('ホテル') || keywords.includes('旅館')) {
          detectedCategory = '宿泊業・娯楽業';
        } else if (keywords.includes('レストラン') || keywords.includes('カフェ') || keywords.includes('飲食') || keywords.includes('料理') || keywords.includes('バー') || keywords.includes('居酒屋')) {
          detectedCategory = '飲食業';
        }
      }

      // Google Maps typesからも判定
      if (placeData?.types) {
        const types = placeData.types;
        if (types.includes('restaurant') || types.includes('cafe') || types.includes('bar') || types.includes('bakery') || types.includes('meal_takeaway')) {
          detectedCategory = '飲食業';
        } else if (types.includes('beauty_salon') || types.includes('hair_care') || types.includes('spa')) {
          detectedCategory = 'サービス業（美容・理容業）';
        } else if (types.includes('store') || types.includes('clothing_store') || types.includes('supermarket')) {
          detectedCategory = '小売業';
        } else if (types.includes('lodging')) {
          detectedCategory = '宿泊業・娯楽業';
        }
      }

      return `AIの分析結果では「${detectedCategory}」に該当すると思われます。\n\nこれで合っていますか？`;
    },
    type: 'single_select',
    options: (answers) => {
      // 自動判定された業種を取得
      const placeData = answers['Q1-0'];
      const tabelogData = answers['Q1-0-tabelog'];

      let detectedCategory = '飲食業';

      if (tabelogData?.keywords) {
        const keywords = tabelogData.keywords.join(',');
        if (keywords.includes('美容') || keywords.includes('理容') || keywords.includes('エステ') || keywords.includes('ネイル')) {
          detectedCategory = 'サービス業（美容・理容業）';
        } else if (keywords.includes('小売') || keywords.includes('雑貨') || keywords.includes('アパレル') || keywords.includes('販売')) {
          detectedCategory = '小売業';
        } else if (keywords.includes('宿泊') || keywords.includes('ホテル') || keywords.includes('旅館')) {
          detectedCategory = '宿泊業・娯楽業';
        } else if (keywords.includes('レストラン') || keywords.includes('カフェ') || keywords.includes('飲食') || keywords.includes('料理') || keywords.includes('バー') || keywords.includes('居酒屋')) {
          detectedCategory = '飲食業';
        }
      }

      if (placeData?.types) {
        const types = placeData.types;
        if (types.includes('restaurant') || types.includes('cafe') || types.includes('bar') || types.includes('bakery') || types.includes('meal_takeaway')) {
          detectedCategory = '飲食業';
        } else if (types.includes('beauty_salon') || types.includes('hair_care') || types.includes('spa')) {
          detectedCategory = 'サービス業（美容・理容業）';
        } else if (types.includes('store') || types.includes('clothing_store') || types.includes('supermarket')) {
          detectedCategory = '小売業';
        } else if (types.includes('lodging')) {
          detectedCategory = '宿泊業・娯楽業';
        }
      }

      return [
        { value: detectedCategory, label: `はい、${detectedCategory}です` },
        { value: 'manual', label: 'いいえ、違います（手動で選択）' }
      ];
    },
    required: false,
    dependencies: ['Q1-0-website-check'],
    aiEnhance: false,
    helpText: '💡 AIが自動で業種を判定しました。間違っている場合は「いいえ」を選択してください'
  },

  // Q1-1-manual: 業種の手動選択（条件付き：AIの判定が間違っている場合）
  {
    id: 'Q1-1-manual',
    priority: 8.5,
    text: '業種を選択してください',
    type: 'single_select',
    options: [
      { value: '飲食業', label: '飲食業（レストラン、カフェ、居酒屋など）' },
      { value: '小売業', label: '小売業（雑貨店、アパレル、スーパーなど）' },
      { value: 'サービス業（美容・理容業）', label: 'サービス業（美容・理容業）' },
      { value: 'サービス業（その他）', label: 'サービス業（その他）' },
      { value: '宿泊業・娯楽業', label: '宿泊業・娯楽業' },
      { value: '製造業その他', label: '製造業その他' }
    ],
    required: false,
    dependencies: ['Q1-1'],
    condition: (answers) => answers['Q1-1'] === 'manual',
    aiEnhance: false,
    helpText: '💡 補助金申請における業種分類です。従業員数の要件がこれによって決まります'
  },

  // ⓫ Q1-3: 具体的な業態
  {
    id: 'Q1-3',
    priority: 9,
    text: '具体的にどのような業態ですか？',
    type: 'text',
    placeholder: '例：ハンバーガーショップ、イタリアンレストラン、美容室',
    required: false,
    dependencies: ['Q1-1'],
    aiEnhance: false,
    helpText: '💡 「レストラン」「美容室」などの具体的な業態を教えてください'
  },

  // Q1-3-multi: 追加事業
  {
    id: 'Q1-3-multi',
    priority: 10,
    text: '他にも事業を行っていますか？\n\n例えば、「ケータリング」や「オンライン販売」などあれば教えてください。なければ「なし」と入力してください',
    type: 'text',
    placeholder: '例：ケータリング、オンライン販売、通販、なし',
    required: false,
    dependencies: ['Q1-3'],
    aiEnhance: true,
    helpText: '💡 追加の事業がない場合は「なし」「ありません」などと入力してください'
  },

  // =============================================
  // セクション1-2: 売上データ（最小限）
  // =============================================

  // Q1-8: 年間売上
  {
    id: 'Q1-8',
    priority: 13,
    text: (answers) => {
      const fiscalMonth = parseInt(answers['Q1-5-fiscal']);
      const { label } = getFiscalPeriodLabel(fiscalMonth, 0);

      return `${label}の年間売上を教えてください`;
    },
    type: 'number',
    placeholder: '例：1200',
    suffix: '万円',
    helpText: (answers) => {
      const fiscalMonth = parseInt(answers['Q1-5-fiscal']);

      return '【入力方法】\n' +
        '• 単位：万円で入力してください\n' +
        '• 例：年間売上が1,200万円の場合 → 「1200」と入力\n\n' +
        `💡 ${getFiscalMonthExplanation(fiscalMonth)}`;
    },
    required: false,
    dependencies: ['Q1-3-multi'],
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
    required: false,
    dependencies: ['Q1-8'],
    aiEnhance: false
  },

  // Q1-9: 経常利益
  {
    id: 'Q1-9',
    priority: 15,
    text: (answers) => {
      // getFiscalPeriodLabel is imported at the top
      const fiscalMonth = parseInt(answers['Q1-5-fiscal']);
      const { label } = getFiscalPeriodLabel(fiscalMonth, 0);

      return `${label}の経常利益（または営業利益）を教えてください\n\nわからない場合は「0」と入力してください`;
    },
    type: 'number',
    placeholder: '例：120',
    suffix: '万円',
    helpText: (answers) => {
      // isPastFiscalMonth is imported at the top
      const fiscalMonth = parseInt(answers['Q1-5-fiscal']);
      const isPast = isPastFiscalMonth(fiscalMonth);

      return '【経常利益とは】\n' +
        '売上から全ての経費を引いた利益です\n\n' +
        '【入力方法】\n' +
        '• 単位：万円で入力してください\n' +
        '• 黒字の場合：そのまま入力（例：150万円 → 「150」）\n' +
        '• 赤字の場合：マイナスを付けて入力（例：-50万円 → 「-50」）\n\n' +
        `💡 ${isPast ? '赤字の場合は補助率が3/4（通常2/3）になります' : '今期の予想値を入力してください'}`;
    },
    required: false,
    dependencies: ['Q1-8-trend'],
    aiEnhance: false
  },

  // =============================================
  // セクション1-3: 販売費及び一般管理費の内訳
  // =============================================

  // Q1-14-method: 販売費及び一般管理費の入力方法選択
  {
    id: 'Q1-14-method',
    priority: 16,
    text: '販売費及び一般管理費の内訳について、どのように入力しますか？\n\n様式2の経費内訳表に必要な情報です。',
    type: 'single_select',
    options: [
      {
        value: 'upload',
        label: '📄 決算書をアップロードする（最も正確・簡単）'
      },
      {
        value: 'manual',
        label: '✍️ 手動で入力する（ファイルなし）'
      },
      {
        value: 'ai_estimate',
        label: '🤖 AIに推定してもらう（最も簡単）'
      }
    ],
    required: false,
    dependencies: ['Q1-9'],
    aiEnhance: false,
    helpText: '💡 【各方法の説明】\n\n📄 決算書アップロード：スクリーンショットでOK。個人情報は黒塗り推奨。最も正確です。\n\n✍️ 手動入力：項目ごとに金額を入力します。10分程度かかります。\n\n🤖 AI推定：業種・売上から自動推定。精度は下がりますが、プライバシー保護。後で修正可能です。'
  },

  // Q1-14-upload: ファイルアップロード（条件付き：uploadを選択した場合のみ）
  {
    id: 'Q1-14-upload',
    priority: 16.1,
    text: '決算書の「販売費及び一般管理費内訳書」のページをアップロードしてください\n\nスクリーンショットでも構いません。',
    type: 'file_upload',
    accept: 'image/*,application/pdf',
    required: false,
    dependencies: ['Q1-14-method'],
    condition: (answers) => answers['Q1-14-method'] === 'upload',
    aiEnhance: false,
    helpText: '💡 【プライバシー保護】\n• 個人情報（代表者名、住所など）は黒塗りしてください\n• アップロードしたファイルは暗号化して保存します\n• 処理後30日で自動削除されます\n\n対応形式：JPG, PNG, PDF'
  },

  // Q1-14-upload-consent: プライバシー同意（条件付き：uploadを選択した場合のみ）
  {
    id: 'Q1-14-upload-consent',
    priority: 16.2,
    text: 'アップロードしたファイルは暗号化して保存し、30日後に自動削除されます。\n\nこの内容に同意しますか？',
    type: 'single_select',
    options: [
      { value: 'agree', label: '同意します' },
      { value: 'disagree', label: '同意しません（他の方法を選択します）' }
    ],
    required: false,
    dependencies: ['Q1-14-upload'],
    condition: (answers) => answers['Q1-14-method'] === 'upload' && answers['Q1-14-upload'],
    aiEnhance: false,
    helpText: ''
  },

  // Q1-14-manual: 手動入力（条件付き：manualを選択した場合のみ）
  {
    id: 'Q1-14-manual',
    priority: 16.3,
    text: '販売費及び一般管理費の内訳を入力してください',
    type: 'expense_manual_input',
    required: false,
    dependencies: ['Q1-14-method'],
    condition: (answers) => answers['Q1-14-method'] === 'manual',
    aiEnhance: false,
    helpText: '💡 必須項目のみ入力すればOKです。わからない項目は空欄で構いません。\n\n【必須項目】\n• 人件費（役員報酬＋給料手当）\n• 地代家賃\n\n【任意項目】\n• 広告宣伝費\n• 水道光熱費\n• 通信費\n• 減価償却費\n• その他'
  },

  // Q1-14-ai: AI推定（条件付き：ai_estimateを選択した場合のみ）
  {
    id: 'Q1-14-ai',
    priority: 16.4,
    text: 'AIが業種と売上から販売費及び一般管理費を推定しています...',
    type: 'ai_expense_estimation',
    required: false,
    dependencies: ['Q1-14-method'],
    condition: (answers) => answers['Q1-14-method'] === 'ai_estimate',
    aiEnhance: false,
    autoProgress: true,
    helpText: '💡 推定結果は後で修正できます。\n\n推定方法：業種別の平均値と売上規模から自動計算します。'
  },

  // Phase 1完了
  {
    id: 'Q1-COMPLETE',
    priority: 18,
    text: '✅ Phase 1（基本情報）の質問が完了しました！\n\nお疲れ様でした。\n\n次はPhase 2（顧客ニーズと市場の動向）の質問に進みます。',
    type: 'completion',
    required: false,
    dependencies: ['Q1-9'],
    aiEnhance: false,
    autoProgress: true  // 自動的に次のPhaseに進む
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

/**
 * Google Mapsの営業時間テキストから営業日数を計算
 * 注意: 現在は使用していません（将来の機能拡張のため保持）
 */
// eslint-disable-next-line no-unused-vars
const calculateOperatingDays = (weekdayText) => {
  if (!weekdayText || weekdayText.length === 0) return null;

  const openDays = weekdayText.filter(text => !text.includes('定休日') && !text.includes('休業日')).length;

  if (openDays === 7) return '毎日（7日）';
  if (openDays === 6) return '週6日';
  if (openDays === 5) return '週5日';
  return '週4日以下';
};

/**
 * Google Mapsから自動回答できる情報を取得
 *
 * 注意: Q1-8は「年間売上」の質問に変更されたため、
 * 営業日数の自動入力機能は無効化されています
 */
export const getAutoAnswerFromGoogleMaps = (answers) => {
  // 自動回答機能は現在無効化
  // Q1-8は「年間売上」なので、Google Mapsから自動取得できない
  return null;
};

/**
 * 次に聞くべき質問を取得（getNextQuestionのエイリアス）
 */
export const getNextStep1Question = (answers) => {
  const answeredIds = Object.keys(answers);

  const unanswered = STEP1_QUESTIONS.filter(q => {
    if (answeredIds.includes(q.id)) return false;

    if (q.dependencies) {
      const allMet = q.dependencies.every(depId => answeredIds.includes(depId));
      if (!allMet) return false;
    }

    if (q.condition && typeof q.condition === 'function') {
      if (!q.condition(answers)) return false;
    }

    return true;
  }).sort((a, b) => a.priority - b.priority);

  if (unanswered.length === 0) return null;

  const question = { ...unanswered[0] };

  if (question.generateMessage && typeof question.generateMessage === 'function') {
    const placeData = answers['Q1-0'] || answers['Q1-0-confirm'];
    if (placeData) {
      question.text = question.generateMessage(placeData);
    }
  }

  if (typeof question.text === 'function') {
    question.text = question.text(answers);
  }

  if (typeof question.options === 'function') {
    question.options = question.options(answers);
  }

  if (typeof question.helpText === 'function') {
    question.helpText = question.helpText(answers);
  }

  return question;
};
