/**
 * Step 2: 会社概要・事業内容の質問フロー
 *
 * 【設計方針】
 * - 利益率の質問は削除（参考資料分析の結果、小規模事業者には負担が大きいため）
 * - 売上構成比のみを確認（実際の申請書フォーマットに合致）
 * - Google Maps APIのデータを活用して自動分析
 * - 顧客属性、競合分析、強み、経営課題、販売拡大計画を体系的に収集
 * - 業種に応じて「販売先」「顧客層」の質問を切り替え
 */

import { getCustomerQuestion, getProductCategoryExamples } from './industryClassifier';

export const conversationalQuestionsStep2 = [
  // ===== 商品・サービス情報 =====
  // 1位の製品・サービス
  {
    id: 'Q2-1',
    question: 'まず、御社が提供している主要な製品・サービスについて教えてください。\n\n売上構成で1番大きい製品・サービスのカテゴリーは何ですか？',
    type: 'text',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      minLength: 2,
      maxLength: 100,
      errorMessage: '製品・サービスのカテゴリーを2文字以上100文字以内で入力してください'
    },
    helpText: '例：「ランチ定食」ではなく「定食類」、「カット＋カラー」ではなく「美容施術」のようにカテゴリーで入力してください',
    examples: (answers) => getProductCategoryExamples(answers),
    nextQuestion: (answer, answers) => 'Q2-2'
  },

  {
    id: 'Q2-2',
    question: (answers) => `「${answers['Q2-1']}」の年間売上高はいくらですか？\n\n※ 直近1年間の概算で構いません`,
    type: 'number',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      min: 1,
      max: 100000,
      isInteger: true,
      errorMessage: '1〜100000の整数で入力してください（万円単位）'
    },
    inputHint: '例：500（万円）',
    helpText: '万円単位で入力してください。例：年間売上が500万円の場合は「500」と入力',
    nextQuestion: (answer, answers) => 'Q2-3'
  },

  {
    id: 'Q2-3',
    question: (answers) => `「${answers['Q2-1']}」の売上構成比は何%ですか？\n\n※ 全体売上に占める割合の目安で構いません`,
    type: 'number',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      min: 1,
      max: 100,
      isInteger: true,
      errorMessage: '1〜100の整数で入力してください'
    },
    inputHint: '例：35（%）',
    nextQuestion: (answer, answers) => 'Q2-4'
  },

  {
    id: 'Q2-4',
    question: (answers) => {
      const customerQ = getCustomerQuestion(answers, answers['Q2-1']);
      return customerQ.question;
    },
    type: 'text',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      minLength: 2,
      maxLength: 200,
      errorMessage: '2文字以上200文字以内で入力してください'
    },
    examples: (answers) => {
      const customerQ = getCustomerQuestion(answers, answers['Q2-1']);
      return customerQ.examples;
    },
    inputHint: (answers) => {
      const customerQ = getCustomerQuestion(answers, answers['Q2-1']);
      return customerQ.inputHint;
    },
    nextQuestion: (answer, answers) => 'Q2-5'
  },

  // 2位の製品・サービス
  {
    id: 'Q2-5',
    question: '売上構成で2番目に大きい製品・サービスのカテゴリーは何ですか？\n\n※ ない場合は「なし」と入力してください',
    type: 'text',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      maxLength: 100,
      errorMessage: '100文字以内で入力してください'
    },
    examples: [
      'テイクアウト類',
      'カラーリング',
      'リフォーム工事',
      'なし'
    ],
    nextQuestion: (answer, answers) => {
      if (answer === 'なし' || answer === 'ない') {
        return 'Q2-13'; // 顧客層の質問へスキップ
      }
      return 'Q2-6';
    }
  },

  {
    id: 'Q2-6',
    question: (answers) => `「${answers['Q2-5']}」の年間売上高はいくらですか？（万円）`,
    type: 'number',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      min: 1,
      max: 100000,
      isInteger: true,
      errorMessage: '1〜100000の整数で入力してください（万円単位）'
    },
    inputHint: '例：300（万円）',
    nextQuestion: (answer, answers) => 'Q2-7'
  },

  {
    id: 'Q2-7',
    question: (answers) => `「${answers['Q2-5']}」の売上構成比は何%ですか？`,
    type: 'number',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      min: 1,
      max: 100,
      isInteger: true,
      errorMessage: '1〜100の整数で入力してください'
    },
    inputHint: '例：25（%）',
    nextQuestion: (answer, answers) => 'Q2-8'
  },

  {
    id: 'Q2-8',
    question: (answers) => {
      const customerQ = getCustomerQuestion(answers, answers['Q2-5']);
      return customerQ.question;
    },
    type: 'text',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      minLength: 2,
      maxLength: 200,
      errorMessage: '2文字以上200文字以内で入力してください'
    },
    examples: (answers) => {
      const customerQ = getCustomerQuestion(answers, answers['Q2-5']);
      return customerQ.examples;
    },
    inputHint: (answers) => {
      const customerQ = getCustomerQuestion(answers, answers['Q2-5']);
      return customerQ.inputHint;
    },
    nextQuestion: (answer, answers) => 'Q2-9'
  },

  // 3位の製品・サービス
  {
    id: 'Q2-9',
    question: '売上構成で3番目に大きい製品・サービスのカテゴリーは何ですか？\n\n※ ない場合は「なし」と入力してください',
    type: 'text',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      maxLength: 100,
      errorMessage: '100文字以内で入力してください'
    },
    examples: [
      'ドリンク類',
      'トリートメント',
      '小物製品',
      'なし'
    ],
    nextQuestion: (answer, answers) => {
      if (answer === 'なし' || answer === 'ない') {
        return 'Q2-13'; // 顧客層の質問へ
      }
      return 'Q2-10';
    }
  },

  {
    id: 'Q2-10',
    question: (answers) => `「${answers['Q2-9']}」の年間売上高はいくらですか？（万円）`,
    type: 'number',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      min: 1,
      max: 100000,
      isInteger: true,
      errorMessage: '1〜100000の整数で入力してください（万円単位）'
    },
    inputHint: '例：200（万円）',
    nextQuestion: (answer, answers) => 'Q2-11'
  },

  {
    id: 'Q2-11',
    question: (answers) => `「${answers['Q2-9']}」の売上構成比は何%ですか？`,
    type: 'number',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      min: 1,
      max: 100,
      isInteger: true,
      errorMessage: '1〜100の整数で入力してください'
    },
    inputHint: '例：15（%）',
    nextQuestion: (answer, answers) => 'Q2-12'
  },

  {
    id: 'Q2-12',
    question: (answers) => {
      const customerQ = getCustomerQuestion(answers, answers['Q2-9']);
      return customerQ.question;
    },
    type: 'text',
    priority: 1,
    category: '商品・サービス',
    validation: {
      required: true,
      minLength: 2,
      maxLength: 200,
      errorMessage: '2文字以上200文字以内で入力してください'
    },
    examples: (answers) => {
      const customerQ = getCustomerQuestion(answers, answers['Q2-9']);
      return customerQ.examples;
    },
    inputHint: (answers) => {
      const customerQ = getCustomerQuestion(answers, answers['Q2-9']);
      return customerQ.inputHint;
    },
    nextQuestion: (answer, answers) => 'Q2-13'
  },

  // ===== 顧客属性分析 =====
  {
    id: 'Q2-13',
    question: '次に、お客様の属性について教えてください。\n\n主な顧客層の年齢層はどれですか？（複数選択可）',
    type: 'multi_select',
    priority: 1,
    category: '顧客属性',
    options: [
      { value: '10代', label: '10代' },
      { value: '20代', label: '20代' },
      { value: '30代', label: '30代' },
      { value: '40代', label: '40代' },
      { value: '50代', label: '50代' },
      { value: '60代以上', label: '60代以上' }
    ],
    validation: {
      required: true,
      minSelections: 1,
      errorMessage: '少なくとも1つ選択してください'
    },
    nextQuestion: (answer, answers) => 'Q2-14'
  },

  {
    id: 'Q2-14',
    question: '顧客の特性を教えてください。（複数選択可）',
    type: 'multi_select',
    priority: 1,
    category: '顧客属性',
    options: [
      { value: '法人顧客', label: '法人顧客（B2B）' },
      { value: '個人顧客', label: '個人顧客（B2C）' },
      { value: '地域住民', label: '地域住民' },
      { value: '観光客', label: '観光客' },
      { value: '女性', label: '女性が多い' },
      { value: '男性', label: '男性が多い' },
      { value: 'ファミリー層', label: 'ファミリー層' },
      { value: '高所得層', label: '高所得層' },
      { value: 'リピーター', label: 'リピーターが多い' },
      { value: '新規顧客', label: '新規顧客が多い' }
    ],
    validation: {
      required: true,
      minSelections: 1,
      errorMessage: '少なくとも1つ選択してください'
    },
    nextQuestion: (answer, answers) => 'Q2-15'
  },

  {
    id: 'Q2-15',
    question: '顧客層について、補足があれば自由に教えてください。\n\n※ ない場合は「なし」と入力してください',
    type: 'textarea',
    priority: 2,
    category: '顧客属性',
    validation: {
      required: false,
      maxLength: 500,
      errorMessage: '500文字以内で入力してください'
    },
    examples: [
      '平日はビジネスマン、休日はファミリー層が中心',
      '近隣の企業からのリピーターが多い',
      'SNSで知った若年層が増加中'
    ],
    nextQuestion: (answer, answers) => 'Q2-16'
  },

  // ===== 競合分析（Google Maps活用） =====
  {
    id: 'Q2-16',
    question: '競合について伺います。\n\nGoogle Mapsで検索した周辺の同業他社を分析しますか？\n\n※ AIが自動で競合店舗を分析します',
    type: 'single_select',
    priority: 1,
    category: '競合分析',
    options: [
      { value: 'yes', label: 'はい、分析してほしい' },
      { value: 'no', label: 'いいえ、自分で入力する' }
    ],
    validation: {
      required: true
    },
    nextQuestion: (answer, answers) => {
      if (answer === 'yes') {
        return 'Q2-16-analyzing'; // 分析中表示
      } else {
        return 'Q2-16-manual'; // 手動入力フロー
      }
    }
  },

  // 分析中の表示（自動的にスキップ）
  {
    id: 'Q2-16-analyzing',
    question: 'Google Mapsで周辺の競合を分析しています...\n\n少々お待ちください。',
    type: 'auto_analyze_competitors', // カスタムタイプ
    priority: 1,
    category: '競合分析',
    autoExecute: true,
    nextQuestion: (answer, answers) => 'Q2-16-result'
  },

  // 分析結果の表示
  {
    id: 'Q2-16-result',
    question: (answers) => {
      const result = answers['Q2-16-analyzing'] || {};
      const competitors = result.competitors || [];

      if (competitors.length === 0) {
        return '周辺に競合店舗が見つかりませんでした。\n\n手動で入力しますか？';
      }

      return `周辺の競合を${competitors.length}件見つけました。\n\n主な競合:\n${competitors.slice(0, 3).map((c, i) => `${i + 1}. ${c.name} (評価: ${c.rating}/5.0, 口コミ: ${c.user_ratings_total}件)`).join('\n')}\n\nこの情報で問題ありませんか？`;
    },
    type: 'single_select',
    priority: 1,
    category: '競合分析',
    options: [
      { value: 'ok', label: 'はい、この情報で良い' },
      { value: 'manual', label: 'いいえ、自分で入力する' }
    ],
    validation: {
      required: true
    },
    nextQuestion: (answer, answers) => {
      if (answer === 'manual') {
        return 'Q2-16-manual';
      }
      return 'Q2-17';
    }
  },

  // 手動入力フロー
  {
    id: 'Q2-16-manual',
    question: '主な競合他社を教えてください。（複数ある場合はカンマ区切り）',
    type: 'text',
    priority: 1,
    category: '競合分析',
    validation: {
      required: true,
      maxLength: 200,
      errorMessage: '200文字以内で入力してください'
    },
    examples: [
      'A店、B店、C店',
      '駅前のカフェチェーン店',
      '同じ商店街の理容店3店舗'
    ],
    inputHint: '例：○○カフェ、△△喫茶店',
    nextQuestion: (answer, answers) => 'Q2-17'
  },

  // ===== 自社の強み・差別化要因 =====
  {
    id: 'Q2-17',
    question: '次に、御社の強みについて伺います。\n\nGoogle Mapsの口コミから強みを分析しますか？\n\n※ AIがお客様の声を分析します',
    type: 'single_select',
    priority: 1,
    category: '強み・差別化',
    options: [
      { value: 'yes', label: 'はい、分析してほしい' },
      { value: 'no', label: 'いいえ、自分で入力する' }
    ],
    validation: {
      required: true
    },
    nextQuestion: (answer, answers) => {
      if (answer === 'yes') {
        return 'Q2-17-analyzing';
      } else {
        return 'Q2-17-manual';
      }
    }
  },

  // 口コミ分析中の表示
  {
    id: 'Q2-17-analyzing',
    question: 'Google Mapsの口コミを分析しています...\n\n少々お待ちください。',
    type: 'auto_analyze_reviews', // カスタムタイプ
    priority: 1,
    category: '強み・差別化',
    autoExecute: true,
    nextQuestion: (answer, answers) => 'Q2-17-result'
  },

  // 分析結果の表示
  {
    id: 'Q2-17-result',
    question: (answers) => {
      const result = answers['Q2-17-analyzing'] || {};
      const keywords = result.keywords || [];
      const strengthsText = result.strengthsText || '';

      if (keywords.length === 0) {
        return '口コミから特徴的なキーワードは見つかりませんでした。\n\n手動で入力しますか？';
      }

      return `口コミ分析の結果、以下の強みが見つかりました:\n\n${keywords.slice(0, 5).map((k, i) => `${i + 1}. 「${k.keyword}」 (${k.count}件の言及)`).join('\n')}\n\n${strengthsText}\n\nこの情報で問題ありませんか？`;
    },
    type: 'single_select',
    priority: 1,
    category: '強み・差別化',
    options: [
      { value: 'ok', label: 'はい、この情報で良い' },
      { value: 'add', label: '追加で入力したい' },
      { value: 'manual', label: 'いいえ、自分で入力し直す' }
    ],
    validation: {
      required: true
    },
    nextQuestion: (answer, answers) => {
      if (answer === 'add') {
        return 'Q2-17-manual-add';
      } else if (answer === 'manual') {
        return 'Q2-17-manual';
      }
      return 'Q2-18';
    }
  },

  // 追加入力
  {
    id: 'Q2-17-manual-add',
    question: '追加で強みを入力してください。',
    type: 'textarea',
    priority: 1,
    category: '強み・差別化',
    validation: {
      required: true,
      maxLength: 500,
      errorMessage: '500文字以内で入力してください'
    },
    nextQuestion: (answer, answers) => 'Q2-18'
  },

  // 手動入力フロー
  {
    id: 'Q2-17-manual',
    question: '競合他社と比較した際の、御社の強みや差別化要因を教えてください。',
    type: 'textarea',
    priority: 1,
    category: '強み・差別化',
    validation: {
      required: true,
      minLength: 20,
      maxLength: 500,
      errorMessage: '20文字以上500文字以内で入力してください'
    },
    examples: [
      '地元食材を使った手作りメニュー、アットホームな雰囲気、常連客が多い',
      '最新設備を導入した技術力、短納期対応、細かなカスタマイズ対応',
      '経験豊富なスタッフ、丁寧なカウンセリング、アフターフォロー'
    ],
    inputHint: '例：地元食材を使った手作り料理が評判です',
    nextQuestion: (answer, answers) => 'Q2-18'
  },
  // ===== 経営課題 =====
  {
    id: 'Q2-18',
    question: '現在の経営課題について教えてください。（複数選択可）',
    type: 'multi_select',
    priority: 1,
    category: '経営課題',
    options: [
      { value: '新規顧客獲得', label: '新規顧客の獲得が難しい' },
      { value: 'リピーター増加', label: 'リピーターが増えない' },
      { value: '客単価向上', label: '客単価を上げたい' },
      { value: '認知度向上', label: '認知度が低い' },
      { value: '人手不足', label: '人手不足' },
      { value: '業務効率化', label: '業務を効率化したい' },
      { value: '設備老朽化', label: '設備が古くなっている' },
      { value: 'コスト削減', label: 'コストを削減したい' },
      { value: '販路拡大', label: '販路を拡大したい' },
      { value: 'Web活用', label: 'Web・SNSを活用できていない' },
      { value: 'その他', label: 'その他' }
    ],
    validation: {
      required: true,
      minSelections: 1,
      errorMessage: '少なくとも1つ選択してください'
    },
    nextQuestion: (answer, answers) => {
      if (answer.includes('その他')) {
        return 'Q2-18-other';
      }
      return 'Q2-19';
    }
  },

  {
    id: 'Q2-18-other',
    question: 'その他の経営課題を具体的に教えてください。',
    type: 'textarea',
    priority: 2,
    category: '経営課題',
    validation: {
      required: true,
      maxLength: 300,
      errorMessage: '300文字以内で入力してください'
    },
    nextQuestion: (answer, answers) => 'Q2-19'
  },

  // ===== 販売拡大・売上向上の取り組み =====
  {
    id: 'Q2-19',
    question: '最後に、今後の取り組みについて伺います。\n\n販売拡大や売上向上のために、どのような取り組みを考えていますか？（複数選択可）',
    type: 'multi_select',
    priority: 1,
    category: '今後の取り組み',
    options: [
      { value: '新商品開発', label: '新商品・サービスの開発' },
      { value: '既存商品改良', label: '既存商品・サービスの改良' },
      { value: 'Web販売', label: 'Web販売・ECサイト構築' },
      { value: 'SNS活用', label: 'SNS・Webマーケティング' },
      { value: 'チラシ・広告', label: 'チラシ・広告の強化' },
      { value: 'イベント開催', label: 'イベント・キャンペーン開催' },
      { value: '店舗改装', label: '店舗・設備の改装' },
      { value: '設備導入', label: '新設備・システムの導入' },
      { value: '人材育成', label: 'スタッフ教育・人材育成' },
      { value: '業務効率化', label: '業務プロセスの効率化' },
      { value: '品質向上', label: '品質・サービスの向上' },
      { value: '販路開拓', label: '新規販路の開拓' },
      { value: 'その他', label: 'その他' }
    ],
    validation: {
      required: true,
      minSelections: 1,
      errorMessage: '少なくとも1つ選択してください'
    },
    nextQuestion: (answer, answers) => 'Q2-20'
  },

  {
    id: 'Q2-20',
    question: '選択した取り組みについて、具体的な内容を教えてください。',
    type: 'textarea',
    priority: 1,
    category: '今後の取り組み',
    validation: {
      required: true,
      minLength: 30,
      maxLength: 500,
      errorMessage: '30文字以上500文字以内で入力してください'
    },
    examples: [
      'テイクアウト専用メニューを開発し、SNSで宣伝する。店舗改装で待合スペースを拡充する。',
      'Webサイトをリニューアルし、ネット予約システムを導入。Instagram で施術事例を発信。',
      '新型機械を導入して生産性を向上。ECサイトで全国販売を開始。'
    ],
    inputHint: '例：Webサイトをリニューアルし、ネット予約システムを導入したい',
    nextQuestion: (answer, answers) => 'Q2-21-ai-followup'
  },

  // ===== AI補完・修正質問 =====
  {
    id: 'Q2-21-ai-followup',
    question: 'ご回答ありがとうございました。\n\nAIが回答内容を分析し、より良い申請書作成のために追加で質問をさせていただきたいと思います。\n\nよろしいですか？',
    type: 'single_select',
    priority: 1,
    category: 'AI補完',
    options: [
      { value: 'yes', label: 'はい、質問に答えます' },
      { value: 'no', label: 'いいえ、次のステップへ進みます' }
    ],
    validation: {
      required: true
    },
    nextQuestion: (answer, answers) => {
      if (answer === 'yes') {
        return 'Q2-22-ai-analyzing';
      }
      return null; // Step 2完了
    }
  },

  {
    id: 'Q2-22-ai-analyzing',
    question: 'AIが回答内容を分析しています...\n\n少々お待ちください。',
    type: 'ai_followup_analysis',
    priority: 1,
    category: 'AI補完',
    autoExecute: true,
    nextQuestion: (answer, answers) => 'Q2-23-ai-questions'
  },

  {
    id: 'Q2-23-ai-questions',
    question: (answers) => {
      const analysisResult = answers['Q2-22-ai-analyzing'] || {};
      const questions = analysisResult.questions || [];

      if (questions.length === 0) {
        return '回答内容は十分です。次のステップへ進みましょう。';
      }

      return `以下の点について追加でお伺いします:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\n上記について、順番にお答えください。`;
    },
    type: 'textarea',
    priority: 1,
    category: 'AI補完',
    validation: {
      required: true,
      minLength: 10,
      maxLength: 1000,
      errorMessage: '10文字以上1000文字以内で入力してください'
    },
    nextQuestion: (answer, answers) => null // Step 2完了
  }
];

/**
 * Step 2の質問を取得
 */
export const getStep2Question = (questionId) => {
  return conversationalQuestionsStep2.find(q => q.id === questionId);
};

/**
 * Step 2の次の質問を取得
 */
export const getNextStep2Question = (currentQuestionId, answer, answers) => {
  const currentQuestion = getStep2Question(currentQuestionId);
  if (!currentQuestion) return null;

  // nextQuestion が関数の場合は実行
  if (typeof currentQuestion.nextQuestion === 'function') {
    const nextId = currentQuestion.nextQuestion(answer, answers);
    return nextId ? getStep2Question(nextId) : null;
  }

  // nextQuestion が文字列の場合はそのまま返す
  if (typeof currentQuestion.nextQuestion === 'string') {
    return getStep2Question(currentQuestion.nextQuestion);
  }

  return null;
};

/**
 * Step 2の最初の質問を取得
 */
export const getFirstStep2Question = () => {
  return conversationalQuestionsStep2[0];
};

/**
 * Step 2の完了チェック
 */
export const isStep2Complete = (answers) => {
  const requiredQuestions = [
    'Q2-1', 'Q2-2', // 売上1位
    'Q2-6', 'Q2-7', // 顧客属性
    'Q2-9', // 競合分析
    'Q2-10', // 強み
    'Q2-11', // 経営課題
    'Q2-12', 'Q2-13' // 今後の取り組み
  ];

  return requiredQuestions.every(qId =>
    answers[qId] !== null &&
    answers[qId] !== undefined &&
    answers[qId] !== ''
  );
};
