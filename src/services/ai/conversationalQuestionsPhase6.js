/**
 * Phase 6: 文章生成スタイルの確認
 * ユーザーの年代・性別・個性に合わせた自然な文章スタイルで様式2を生成するための質問
 * Phase 5完了後に実施
 */

export const conversationalQuestionsPhase6 = [
  // P6-1: 文章のトーン
  {
    id: 'P6-1',
    text: 'それでは最後に、申請書の文章スタイルについてお伺いします。\n\nどのような印象の文章がお好みですか？',
    type: 'single_select',
    options: [
      '堅実で信頼感のある文章',
      '情熱的でやる気が伝わる文章',
      '柔らかく親しみやすい文章',
      '簡潔で論理的な文章',
      'わかりません。おまかせします'
    ],
    placeholder: '番号を入力（例: 1）',
    helpText: '💡 50代以上の方には「1」、30-40代の方には「2」または「4」、20-30代の女性の方には「3」がおすすめです',
    priority: 1,
    section: 'writing_style',
    formMapping: '様式2 - 文章スタイル設定',
    validation: {
      required: false,
      errorMessage: '文章のトーンを選択してください'
    }
  },

  // P6-2: 文章の詳細度
  {
    id: 'P6-2',
    text: '文章の詳細さについて、どちらがお好みですか？',
    type: 'single_select',
    options: [
      '具体的な数値やデータを多く盛り込む',
      'ストーリー性を重視して、背景や想いも伝える',
      'バランス良く'
    ],
    placeholder: '番号を入力（例: 1）',
    helpText: '💡 「1」はデータ重視型、「2」はストーリー重視型、「3」は標準的なバランス型です',
    priority: 1,
    section: 'writing_style',
    formMapping: '様式2 - 文章詳細度設定',
    validation: {
      required: false,
      errorMessage: '文章の詳細度を選択してください'
    }
  },

  // P6-3: 表現の個性（任意）
  {
    id: 'P6-3',
    text: '特に強調したいことや、文章に入れたいキーワードはありますか？（任意）',
    type: 'text',
    placeholder: '例：地域密着、職人気質、おもてなしの心、革新的、伝統を守る',
    helpText: '💡 ここで入力されたキーワードを申請書の適切な箇所に自然に組み込みます。未記入でもOKです。',
    priority: 0,
    section: 'writing_style',
    formMapping: '様式2 - キーワード設定',
    validation: {
      required: false,
      maxLength: 100,
      errorMessage: 'キーワードは100文字以内で入力してください'
    }
  }
];

/**
 * Phase 6のセクション情報
 */
export const phase6Sections = {
  writing_style: {
    title: '文章生成スタイル',
    description: 'ユーザーの個性に合わせた文章スタイル設定'
  }
};

/**
 * 文章スタイルの特徴（OpenAI APIに渡すプロンプト生成用）
 */
export const getWritingStylePrompt = (answers) => {
  const tone = answers['P6-1'];
  const detail = answers['P6-2'];
  const keywords = answers['P6-3'] || '';

  let stylePrompt = '\n\n【文章スタイル指定】\n';

  // トーンの設定
  switch (tone) {
    case 1:
      stylePrompt += '- 堅実で信頼感のある表現を使用する\n';
      stylePrompt += '- 落ち着いた語調で、実績と信頼性を重視する\n';
      stylePrompt += '- 数値データを重視し、長年の経験を強調する\n';
      break;
    case 2:
      stylePrompt += '- 情熱的でやる気が伝わる表現を使用する\n';
      stylePrompt += '- ビジョンと目標達成への強い意志を示す\n';
      stylePrompt += '- 前向きで挑戦的な姿勢を強調する\n';
      break;
    case 3:
      stylePrompt += '- 柔らかく親しみやすい表現を使用する\n';
      stylePrompt += '- お客様目線を重視し、共感を呼ぶストーリーを含める\n';
      stylePrompt += '- 温かみのある語調で、人との関係性を大切にする姿勢を示す\n';
      break;
    case 4:
      stylePrompt += '- 簡潔で論理的な表現を使用する\n';
      stylePrompt += '- データと戦略を重視し、目標達成への道筋を明確に示す\n';
      stylePrompt += '- 効率性と合理性を強調する\n';
      break;
    case 5:
    default:
      stylePrompt += '- バランスの取れた標準的な表現を使用する\n';
      stylePrompt += '- 実績とビジョンの両方を適度に盛り込む\n';
      break;
  }

  // 詳細度の設定
  switch (detail) {
    case 1:
      stylePrompt += '- 具体的な数値、データ、表を多用する\n';
      stylePrompt += '- 定量的な根拠を明確に示す\n';
      break;
    case 2:
      stylePrompt += '- ストーリー性を重視し、創業の経緯や顧客とのエピソードを盛り込む\n';
      stylePrompt += '- 想いや背景を丁寧に説明する\n';
      break;
    case 3:
    default:
      stylePrompt += '- 数値データとストーリーをバランス良く配置する\n';
      break;
  }

  // キーワードの設定
  if (keywords) {
    stylePrompt += `- 以下のキーワードを適切な箇所に自然に組み込む：「${keywords}」\n`;
  }

  return stylePrompt;
};

export default conversationalQuestionsPhase6;
