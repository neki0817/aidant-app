/**
 * 深堀りエンジン - 回答を分析して追加質問を自動生成
 *
 * ユーザーの回答の深さ・具体性・論理性を評価し、
 * 必要に応じて自動的に深堀り質問を生成します。
 *
 * @version 2.0.0
 * @updated 2025-01-19 - 業種別深堀り質問テンプレート追加
 */

import OpenAI from 'openai';
import { evaluateAnswerDepth } from './completionTracker';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * 深堀り質問の最大回数
 */
const MAX_DEEP_DIVE_COUNT = 5;

/**
 * 業態・特性確認質問テンプレート（業種別質問の前に挿入）
 */
const BUSINESS_TYPE_DETAIL_QUESTIONS = {
  '飲食店': {
    id: 'restaurant-type',
    question: 'お店の具体的な業態とこだわり・強みを教えてください',
    placeholder: '例：フレンチビストロ。地元の有機野菜を使った季節のコース料理が人気。シェフの修業先はパリの三つ星レストラン。カウンター8席、テーブル16席の小規模店舗で、お客様との会話を大切にしている。',
    helpText: '💡 フレンチ、中華、和食、イタリアン、カフェなど具体的な業態と、お店独自のこだわり・強み・特徴を教えてください。Google Mapsの口コミで評価されているポイントがあれば参考にしてください。',
    googleMapsHint: true
  },
  '小売業': {
    id: 'retail-type',
    question: 'どんな商品を扱っているか、店舗のこだわり・強みを教えてください',
    placeholder: '例：レディースファッション専門店。30-40代向けのナチュラル系カジュアルウェアを中心に、着心地と素材にこだわった国内ブランドを厳選。試着室完備で、スタッフによる丁寧な接客とコーディネート提案が強み。',
    helpText: '💡 取扱商品の種類（ファッション、雑貨、食品等）、ターゲット層、商品選定のこだわり、接客スタイルなど、お店の特徴を具体的に教えてください。',
    googleMapsHint: true
  },
  '美容・理容業': {
    id: 'salon-type',
    question: 'サロンの業態と得意なメニュー・こだわり・強みを教えてください',
    placeholder: '例：美容室。カット・カラー・パーマを中心に、ヘッドスパとトリートメントにも力を入れている。オーガニック薬剤を使用し、髪と頭皮に優しい施術が強み。完全予約制でリラックスできる空間づくりを重視。スタイリスト3名。',
    helpText: '💡 美容室、理容室、ネイルサロン、エステなど具体的な業態と、得意なメニュー、使用する薬剤・機器のこだわり、店舗の雰囲気・強みを教えてください。',
    googleMapsHint: true
  }
};

/**
 * 業種別の深堀り質問テンプレート
 */
const INDUSTRY_SPECIFIC_QUESTIONS = {
  '飲食店': [
    {
      id: 'popular-items',
      question: '売上人気トップ3の商品名と単価を教えてください',
      placeholder: '例：1位 ランチセット 1,200円、2位 コーヒー 500円、3位 ケーキセット 800円',
      helpText: '人気商品を把握することで、強みを活かした販路開拓戦略を立てられます'
    },
    {
      id: 'business-hours',
      question: '営業時間を教えてください（ランチタイム・ディナータイム等）',
      placeholder: '例：ランチ 11:00-15:00、ディナー 17:00-22:00、定休日：月曜日',
      helpText: '営業時間帯ごとの戦略を明確にすることで、説得力が増します'
    },
    {
      id: 'sales-ratio',
      question: '昼（ランチ）と夜（ディナー）の売上比率を教えてください',
      placeholder: '例：ランチ 60%、ディナー 40%',
      helpText: '時間帯別の売上構成を示すことで、どの時間帯を強化すべきか明確になります'
    },
    {
      id: 'customer-difference',
      question: '昼と夜で客層はどう違いますか？',
      placeholder: '例：昼は近隣の会社員・主婦が中心、夜はカップルや接待利用が多い',
      helpText: '時間帯別のターゲット顧客を明確にすることで、施策の具体性が増します'
    },
    {
      id: 'seasonal-variation',
      question: '季節による売上変動はありますか？',
      placeholder: '例：夏は冷製パスタが人気で売上20%増、冬は鍋料理で売上10%増',
      helpText: '季節性を把握することで、年間を通じた販路開拓計画を立てられます'
    }
  ],
  '小売業': [
    {
      id: 'best-sellers',
      question: '売れ筋商品トップ3と単価を教えてください',
      placeholder: '例：1位 Tシャツ 3,000円、2位 ジーンズ 8,000円、3位 アクセサリー 2,000円',
      helpText: '人気商品を把握することで、品揃えの強化戦略を立てられます'
    },
    {
      id: 'customer-flow',
      question: '平日と休日の来客数の違いを教えてください',
      placeholder: '例：平日 1日20人、休日 1日80人',
      helpText: '曜日別の集客状況を示すことで、弱い曜日の強化策を提案できます'
    },
    {
      id: 'purchase-rate',
      question: '来店客のうち何割が購入しますか？',
      placeholder: '例：来店客の約30%が購入、客単価は平均5,000円',
      helpText: '購入率を把握することで、接客改善や販促施策の効果を示せます'
    }
  ],
  '美容・理容業': [
    {
      id: 'popular-menus',
      question: '人気メニュートップ3とその単価を教えてください',
      placeholder: '例：1位 カット+カラー 8,000円、2位 カットのみ 4,000円、3位 パーマ 6,000円',
      helpText: '人気メニューを把握することで、強みを活かした集客戦略を立てられます'
    },
    {
      id: 'repeat-rate',
      question: 'リピート率と来店頻度を教えてください',
      placeholder: '例：リピート率 70%、平均来店頻度 2ヶ月に1回',
      helpText: 'リピート率を示すことで、顧客満足度の高さをアピールできます'
    },
    {
      id: 'booking-method',
      question: '予約方法の内訳を教えてください',
      placeholder: '例：電話予約 50%、Web予約 30%、直接来店 20%',
      helpText: 'Web予約システム導入の必要性を示す根拠になります'
    }
  ]
};

/**
 * 業態・特性確認質問を取得
 * @param {String} businessType - 業種
 * @returns {Object|null} 業態確認質問オブジェクト
 */
export const getBusinessTypeDetailQuestion = (businessType) => {
  if (!businessType) return null;

  // 業種名から該当する確認質問を検索
  for (const [key, question] of Object.entries(BUSINESS_TYPE_DETAIL_QUESTIONS)) {
    if (businessType.includes(key)) {
      return question;
    }
  }

  return null; // 該当なしの場合はnull
};

/**
 * 業種を判定して適切な深堀り質問テンプレートを取得
 * @param {String} businessType - 業種
 * @returns {Array} 深堀り質問テンプレート配列
 */
export const getIndustryQuestions = (businessType) => {
  if (!businessType) return [];

  // 業種名から該当するテンプレートを検索
  for (const [key, questions] of Object.entries(INDUSTRY_SPECIFIC_QUESTIONS)) {
    if (businessType.includes(key)) {
      return questions;
    }
  }

  return []; // 該当なしの場合は空配列
};

/**
 * 回答の不足要素を検出
 * @param {String} questionId - 質問ID
 * @param {String} answer - ユーザーの回答
 * @param {Object} context - コンテキスト情報
 * @returns {Array} 不足要素の配列
 */
export const detectMissingElements = (questionId, answer, context = {}) => {
  const missing = [];

  if (!answer || (typeof answer === 'string' && answer.trim().length < 10)) {
    return ['全体的に情報が不足しています'];
  }

  const answerText = String(answer).toLowerCase();

  // ターゲット顧客関連の質問
  if (questionId.includes('Q3-') || questionId.includes('Q5-1')) {
    // 年齢層の具体性チェック
    if (!answerText.match(/\d+代|10代|20代|30代|40代|50代|60代|70代/)) {
      missing.push('年齢層が不明確');
    }

    // 地域の具体性チェック
    if (!answerText.match(/地域|圏内|駅|市|区|町|県|都道府県/)) {
      missing.push('地域が不明確');
    }

    // 性別・属性チェック
    if (!answerText.match(/男性|女性|ファミリー|カップル|単身|会社員|主婦|学生|シニア/)) {
      missing.push('顧客属性が不明確');
    }
  }

  // 数値目標関連の質問
  if (questionId.includes('Q5-8') || questionId.includes('Q5-9')) {
    // 具体的な数値チェック
    if (!answerText.match(/\d+/)) {
      missing.push('具体的な数値がない');
    }

    // 根拠チェック
    if (!answerText.match(/理由|根拠|なぜなら|〜ため|〜から|見込み|予測|計算/)) {
      missing.push('数値の根拠が不明');
    }

    // 現実性チェック（2倍以上は警告）
    const numbers = answerText.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const ratio = parseInt(numbers[1]) / parseInt(numbers[0]);
      if (ratio >= 2.0) {
        missing.push('目標が非現実的（実績の2倍以上）');
      }
    }
  }

  // 販路開拓計画関連
  if (questionId === 'Q5-1') {
    // 取組内容の具体性
    if (!answerText.match(/導入|制作|実施|開始|運用|活用/)) {
      missing.push('具体的な取組が不明確');
    }

    // 新規顧客獲得とのつながり
    if (!answerText.match(/新規|顧客|獲得|集客|来店|売上|認知/)) {
      missing.push('販路開拓とのつながりが不明確');
    }

    // デジタル活用
    if (!answerText.match(/web|sns|インスタ|google|デジタル|オンライン|ネット|hp|サイト/i)) {
      missing.push('デジタル技術の活用が不明確');
    }
  }

  // 競合分析関連
  if (questionId === 'Q3-5') {
    // 競合の数
    if (!answerText.match(/\d+店|なし|ない|少ない|多い/)) {
      missing.push('競合の数が不明');
    }

    // 差別化ポイント
    if (!answerText.match(/違い|差別|強み|特徴|独自|こだわり|他社にない/)) {
      missing.push('差別化ポイントが不明確');
    }
  }

  return missing;
};

/**
 * 深堀り質問を生成
 * @param {String} questionId - 元の質問ID
 * @param {Object} originalQuestion - 元の質問オブジェクト
 * @param {String} userAnswer - ユーザーの回答
 * @param {Object} context - コンテキスト（placeInfo, answers等）
 * @param {Number} deepDiveCount - 現在の深堀り回数
 * @returns {Object|null} 深堀り質問オブジェクト、または不要ならnull
 */
export const generateDeepDiveQuestion = async (
  questionId,
  originalQuestion,
  userAnswer,
  context = {},
  deepDiveCount = 0
) => {
  // 最大回数チェック
  if (deepDiveCount >= MAX_DEEP_DIVE_COUNT) {
    console.log('[Deep Dive] Max count reached:', deepDiveCount);
    return null;
  }

  // 選択式の質問は深堀り不要
  if (originalQuestion.type === 'single_select' ||
      originalQuestion.type === 'multi_select' ||
      originalQuestion.type === 'place_search' ||
      originalQuestion.type === 'place_confirm') {
    return null;
  }

  // 回答の深さを評価
  const depth = evaluateAnswerDepth(userAnswer, originalQuestion.type);
  console.log('[Deep Dive] Answer depth:', depth, 'for question:', questionId);

  // 深さが4以上なら深堀り不要
  if (depth >= 4) {
    return null;
  }

  // 不足要素を検出
  const missingElements = detectMissingElements(questionId, userAnswer, context);

  if (missingElements.length === 0) {
    return null; // 不足なし
  }

  console.log('[Deep Dive] Missing elements:', missingElements);

  // AIを使って深堀り質問を生成
  try {
    const prompt = `前の質問に対するユーザーの回答を分析し、深堀り質問を1つ生成してください。

【元の質問】
${originalQuestion.text}

【ユーザーの回答】
${userAnswer}

【不足している要素】
${missingElements.join('、')}

【深堀りの目的】
小規模事業者持続化補助金の申請書作成のため、より具体的で説得力のある情報を引き出す。

【深堀り質問生成のポイント】
1. 不足要素を1つに絞って質問する（一度に複数聞かない）
2. 具体的な数値・事例を引き出す質問にする
3. Yes/Noで答えられない質問にする
4. 簡潔で分かりやすい質問にする
5. 回答者が答えやすいように具体例を示す

【出力形式】
JSON形式で以下を返してください：
{
  "needDeepDive": true/false,
  "question": "深堀り質問文",
  "placeholder": "回答例",
  "focusElement": "不足要素の名前",
  "reasoning": "この質問が必要な理由"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは小規模事業者持続化補助金の申請サポート専門家です。
ユーザーの回答を分析し、必要な場合のみ深堀り質問を生成します。

【重要な原則】
- 回答が十分に具体的で詳細な場合は深堀り不要
- 深堀りは最小限にし、ユーザーに負担をかけない
- 質問は1つずつ、簡潔に
- 必ず具体例やヒントを含める`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log('[Deep Dive] AI result:', result);

    if (!result.needDeepDive) {
      return null;
    }

    // 深堀り質問オブジェクトを生成
    return {
      id: `${questionId}-dive-${deepDiveCount + 1}`,
      text: result.question,
      type: 'textarea',
      placeholder: result.placeholder || '例を参考に具体的にご記入ください',
      helpText: `💡 ${result.reasoning}`,
      required: false,
      isDeepDive: true,
      parentQuestionId: questionId,
      focusElement: result.focusElement
    };

  } catch (error) {
    console.error('[Deep Dive] Error generating question:', error);
    return null;
  }
};

/**
 * 複数の深堀り質問を段階的に生成
 * @param {String} questionId - 元の質問ID
 * @param {Object} originalQuestion - 元の質問オブジェクト
 * @param {String} userAnswer - ユーザーの回答
 * @param {Object} context - コンテキスト
 * @returns {Array} 深堀り質問の配列
 */
export const generateMultipleDeepDives = async (
  questionId,
  originalQuestion,
  userAnswer,
  context = {}
) => {
  const deepDiveQuestions = [];
  let currentAnswer = userAnswer;
  let deepDiveCount = 0;

  while (deepDiveCount < MAX_DEEP_DIVE_COUNT) {
    const deepDiveQ = await generateDeepDiveQuestion(
      questionId,
      originalQuestion,
      currentAnswer,
      context,
      deepDiveCount
    );

    if (!deepDiveQ) {
      break; // これ以上深堀り不要
    }

    deepDiveQuestions.push(deepDiveQ);
    deepDiveCount++;

    // 次の深堀りのために、仮の回答を用意（実際はユーザーが回答するまで待つ）
    break;
  }

  return deepDiveQuestions;
};

/**
 * 回答の改善提案を生成
 * @param {String} questionId - 質問ID
 * @param {String} answer - ユーザーの回答
 * @param {Object} context - コンテキスト
 * @returns {String|null} 改善提案テキスト、または不要ならnull
 */
export const generateImprovementSuggestion = (questionId, answer, context = {}) => {
  const missingElements = detectMissingElements(questionId, answer, context);

  if (missingElements.length === 0) {
    return null;
  }

  let suggestion = '💡 回答をさらに充実させるため、以下の情報を追加すると良いでしょう：\n\n';

  missingElements.forEach((element, index) => {
    suggestion += `${index + 1}. ${element}\n`;
  });

  // 質問別の具体的な改善例
  if (questionId === 'Q5-1') {
    suggestion += '\n【例】\n';
    suggestion += 'Web予約システムを導入し、24時間予約可能にすることで、';
    suggestion += '30代女性会社員（平日ランチ利用）を月30組増やし、月売上30万円増を目指す。';
  } else if (questionId.includes('Q5-8') || questionId.includes('Q5-9')) {
    suggestion += '\n【例】\n';
    suggestion += '現状：月20組 → 目標：月50組（+30組）\n';
    suggestion += '根拠：Instagram広告で月100件の問い合わせ、うち30%が来店と予測';
  }

  return suggestion;
};
