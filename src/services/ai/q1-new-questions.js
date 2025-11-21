// Q1-NEW-1〜Q1-NEW-5: 事業の特徴・強み（セクション1-1）
// これらの質問をconversationalQuestionsStep1.jsのQ1-3-multiの後に追加する

export const Q1_NEW_QUESTIONS = [
  // Q1-NEW-1: コンセプトの回答方法を選択
  {
    id: 'Q1-NEW-1',
    priority: 5.6,
    text: '事業のコンセプトについて、どのように回答しますか？',
    type: 'single_select',
    options: [
      { value: 'ai-assisted', label: 'AIに質問に答えて、コンセプト文を自動生成してもらう' },
      { value: 'manual', label: '自分で直接コンセプトを入力する' }
    ],
    required: false,
    dependencies: ['Q1-3-multi'],
    aiEnhance: false,
    helpText: '💡 文章作成が苦手な方は「AI自動生成」、独自のコンセプトがある方は「直接入力」をお選びください'
  },

  // Q1-NEW-1-manual: 手動でコンセプトを入力（条件付き）
  {
    id: 'Q1-NEW-1-manual',
    priority: 5.61,
    text: 'あなたの事業のコンセプトや特徴を教えてください',
    type: 'textarea',
    placeholder: '例：本格的なイタリア料理を手頃な価格で提供することをコンセプトに、地域のお客様を中心に営業しています',
    required: false,
    dependencies: ['Q1-NEW-1'],
    condition: (answers) => answers['Q1-NEW-1'] === 'manual',
    aiEnhance: false,
    maxLength: 200,
    helpText: '💡 あなたの事業が「何を大切にしているか」「どんな価値を提供しているか」を自由に書いてください'
  },

  // Q1-NEW-1-ai-1: 価格帯（AI自動生成パス・条件付き）
  {
    id: 'Q1-NEW-1-ai-1',
    priority: 5.62,
    text: 'あなたの事業の価格帯はどれに当てはまりますか？',
    type: 'single_select',
    options: [
      { value: 'high', label: '高級（特別な日向け、こだわりの価格帯）' },
      { value: 'medium', label: '中価格（手頃な価格、利用しやすい）' },
      { value: 'low', label: '低価格（気軽に利用できる、リーズナブル）' }
    ],
    required: false,
    dependencies: ['Q1-NEW-1'],
    condition: (answers) => answers['Q1-NEW-1'] === 'ai-assisted',
    aiEnhance: false,
    helpText: '💡 お客様が感じる価格帯のイメージを選択してください'
  },

  // Q1-NEW-1-ai-2: 雰囲気（AI自動生成パス・条件付き）
  {
    id: 'Q1-NEW-1-ai-2',
    priority: 5.63,
    text: 'どのような雰囲気を大切にしていますか？',
    type: 'single_select',
    options: [
      { value: 'casual', label: 'カジュアル・気軽' },
      { value: 'elegant', label: '落ち着いた・上質' },
      { value: 'modern', label: 'モダン・おしゃれ' },
      { value: 'homely', label: 'アットホーム・親しみやすい' }
    ],
    required: false,
    dependencies: ['Q1-NEW-1-ai-1'],
    aiEnhance: false,
    helpText: '💡 店舗や事業の雰囲気・イメージを選択してください'
  },

  // Q1-NEW-1-ai-3: こだわり（AI自動生成パス・条件付き）
  {
    id: 'Q1-NEW-1-ai-3',
    priority: 5.64,
    text: '商品・サービスの一番のこだわりは何ですか？',
    type: 'single_select',
    options: [
      { value: 'quality', label: '本格的な味・高品質' },
      { value: 'price', label: '手頃な価格・コスパ' },
      { value: 'speed', label: 'スピード・利便性' },
      { value: 'unique', label: '独自性・オリジナリティ' }
    ],
    required: false,
    dependencies: ['Q1-NEW-1-ai-2'],
    aiEnhance: false,
    helpText: '💡 お客様に一番アピールしたいポイントを選択してください'
  },

  // Q1-NEW-1-generated: AI生成されたコンセプト（編集可能）
  {
    id: 'Q1-NEW-1-generated',
    priority: 5.65,
    text: 'AIが生成したコンセプト文です。そのまま使用するか、修正してください',
    type: 'textarea',
    required: false,
    dependencies: ['Q1-NEW-1-ai-3'],
    aiEnhance: false,
    maxLength: 200,
    helpText: '💡 下の吹き出しのコンセプト文をコピーして、必要に応じて修正してください',
    generateSuggestion: (answers) => {
      const priceLevel = answers['Q1-NEW-1-ai-1'];
      const atmosphere = answers['Q1-NEW-1-ai-2'];
      const focus = answers['Q1-NEW-1-ai-3'];
      const businessType = answers['Q1-3']; // 具体的な業態

      // 雰囲気の表現
      const atmosphereMap = {
        'casual': '気軽に楽しめる',
        'elegant': '落ち着いた雰囲気の',
        'modern': 'モダンでおしゃれな',
        'homely': 'アットホームで親しみやすい'
      };

      // こだわりの表現
      const focusMap = {
        'quality': '本格的な',
        'price': '手頃な価格の',
        'speed': '利便性の高い',
        'unique': '独自性のある'
      };

      // 価格帯の表現
      const priceLevelMap = {
        'high': 'こだわりの',
        'medium': '手頃な価格で',
        'low': '気軽に利用できる価格で'
      };

      // 文章を自然に組み立てる
      const atmosphereText = atmosphereMap[atmosphere] || '';
      const focusText = focusMap[focus] || '';
      const priceText = priceLevelMap[priceLevel] || '';

      // パターン1: 雰囲気 + こだわり + 業態 + 価格
      if (priceLevel === 'medium' || priceLevel === 'low') {
        return `${atmosphereText}${focusText}${businessType || 'サービス'}を${priceText}提供しています`;
      } else {
        // パターン2: 高級の場合
        return `${atmosphereText}${priceText}${focusText}${businessType || 'サービス'}を提供しています`;
      }
    }
  },

  // Q1-NEW-2: 経営者の経歴・専門性
  {
    id: 'Q1-NEW-2',
    priority: 5.7,
    text: '経営者（あなた）の経歴や専門性を教えてください',
    type: 'textarea',
    placeholder: '例：イタリア・トスカーナ地方で5年間修行し、現地のリストランテで料理長を務めた経験があります',
    required: false,
    dependencies: ['Q1-NEW-1'], // どちらのパスでも、Q1-NEW-1の回答後に表示される
    condition: (answers) => {
      // 手動入力パス: Q1-NEW-1-manualが回答済み
      // AI生成パス: Q1-NEW-1-generatedが存在（autoProgressで自動的に設定される）
      return answers['Q1-NEW-1-manual'] || answers['Q1-NEW-1-generated'];
    },
    aiEnhance: false,
    maxLength: 300,
    helpText: '💡 この事業に関連する経験や資格、修行期間などを教えてください。\n\n例：\n- 飲食店：「〇〇で5年間修行」「料理長として勤務」\n- 美容室：「美容師免許取得後、〇年勤務」「〇〇サロンで独立」\n- 小売業：「業界で〇年の販売経験」\n\n特にない場合は「特になし」と入力してください'
  },

  // Q1-NEW-3: こだわりポイント
  {
    id: 'Q1-NEW-3',
    priority: 5.8,
    text: '商品・サービスの「こだわり」を教えてください',
    type: 'textarea',
    placeholder: '例：食材は信頼できるイタリアの生産者から直輸入しており、他店では味わえない本格的な料理を提供しています',
    required: false,
    dependencies: ['Q1-NEW-2'],
    aiEnhance: false,
    maxLength: 200,
    helpText: '💡 原材料、製法、技術、設備など、品質を支える「こだわり」を具体的に書いてください。\n\n例：\n- 飲食店：「〇〇産の食材を使用」「自家製の〇〇」「伝統的な製法」\n- 美容室：「最新の〇〇技術」「オーガニック薬剤使用」\n- 小売業：「厳選した仕入れ先」「品質チェック体制」\n\n特にない場合は「特になし」と入力してください'
  },

  // Q1-NEW-4: ターゲット顧客層
  {
    id: 'Q1-NEW-4',
    priority: 5.9,
    text: '主な顧客層を教えてください',
    type: 'text',
    placeholder: '例：30代〜50代の女性、ファミリー層',
    required: false,
    dependencies: ['Q1-NEW-3'],
    aiEnhance: true,
    helpText: '💡 年齢層、性別、家族構成、職業など、わかる範囲で教えてください'
  },

  // Q1-NEW-5: 顧客の利用パターン
  {
    id: 'Q1-NEW-5',
    priority: 5.95,
    text: '顧客の利用パターンを教えてください',
    type: 'text',
    placeholder: '例：平日はランチ利用、週末はディナー利用が中心',
    required: false,
    dependencies: ['Q1-NEW-4'],
    aiEnhance: true,
    helpText: '💡 平日/週末、昼/夜、季節変動など、利用の傾向を教えてください'
  },

  // =============================================
  // セクション1-4: 業務状況と課題
  // =============================================

  // Q1-NEW-10: 従業員・人員体制
  {
    id: 'Q1-NEW-10',
    priority: 10.0,
    text: '現在の従業員・人員体制について教えてください',
    type: 'structured_input',
    fields: [
      {
        id: 'owner_role',
        label: '代表者（あなた）の役割',
        type: 'checkboxes',
        options: [
          { value: '接客・販売', label: '接客・販売' },
          { value: '製造・調理', label: '製造・調理' },
          { value: '経理・事務', label: '経理・事務' },
          { value: '仕入れ・在庫管理', label: '仕入れ・在庫管理' },
          { value: 'Web管理・SNS運用', label: 'Web管理・SNS運用' },
          { value: 'その他', label: 'その他' }
        ]
      },
      {
        id: 'employee_count',
        label: '従業員数（あなたを除く）',
        type: 'number',
        placeholder: '例: 2',
        unit: '人',
        helpText: '正社員・パート・アルバイト全て含む'
      },
      {
        id: 'fulltime_count',
        label: 'うち正社員（フルタイム）',
        type: 'number',
        placeholder: '例: 1',
        unit: '人',
        optional: true
      },
      {
        id: 'parttime_count',
        label: 'うちパート・アルバイト',
        type: 'number',
        placeholder: '例: 1',
        unit: '人',
        optional: true
      },
      {
        id: 'family_workers',
        label: '家族従業員',
        type: 'number',
        placeholder: '例: 1',
        unit: '人',
        optional: true,
        helpText: '給与を支払っている家族従業員'
      }
    ],
    required: false,
    dependencies: ['Q1-3'],
    aiEnhance: false,
    helpText: '💡 従業員数は概数で構いません'
  },

  // Q1-NEW-11（旧Q1-NEW-12）: 特に時間を取られている業務
  {
    id: 'Q1-NEW-11',
    priority: 10.1,
    text: '日々の業務のうち、特に時間を取られている業務はどれですか？（最大3つ）',
    type: 'checkboxes',
    maxSelections: 3,
    options: (answers) => {
      const businessType = answers['Q1-1'] || '';
      const businessDetail = answers['Q1-3'] || '';

      // 業種判定
      const isRestaurant = businessType.includes('飲食') || businessDetail.includes('カフェ') || businessDetail.includes('レストラン') || businessDetail.includes('居酒屋');
      const isRetail = businessType.includes('小売') || businessDetail.includes('雑貨') || businessDetail.includes('アパレル') || businessDetail.includes('販売');
      const isBeauty = businessType.includes('美容') || businessType.includes('理容') || businessDetail.includes('サロン') || businessDetail.includes('エステ');
      const isOnline = businessDetail.includes('EC') || businessDetail.includes('オンライン') || businessDetail.includes('ネットショップ');

      // 飲食店
      if (isRestaurant) {
        return [
          { value: '接客・ホール業務', label: '接客・ホール業務' },
          { value: '調理・仕込み', label: '調理・仕込み' },
          { value: '食材の仕入れ', label: '食材の仕入れ' },
          { value: '清掃・衛生管理', label: '清掃・衛生管理' },
          { value: 'レジ・会計', label: 'レジ・会計' },
          { value: 'メニュー開発', label: 'メニュー開発' },
          { value: 'SNS・Web更新', label: 'SNS・Web更新' },
          { value: '経理・帳簿管理', label: '経理・帳簿管理' },
          { value: 'その他', label: 'その他' }
        ];
      }

      // 小売店
      if (isRetail) {
        return [
          { value: '接客・販売', label: '接客・販売' },
          { value: '商品陳列・ディスプレイ', label: '商品陳列・ディスプレイ' },
          { value: '仕入れ・発注', label: '仕入れ・発注' },
          { value: '在庫管理', label: '在庫管理' },
          { value: 'レジ・会計', label: 'レジ・会計' },
          { value: '清掃・店舗管理', label: '清掃・店舗管理' },
          { value: 'SNS・Web更新', label: 'SNS・Web更新' },
          { value: '経理・帳簿管理', label: '経理・帳簿管理' },
          { value: 'その他', label: 'その他' }
        ];
      }

      // 美容・サロン系
      if (isBeauty) {
        return [
          { value: '施術業務', label: '施術業務' },
          { value: '受付・予約管理', label: '受付・予約管理' },
          { value: 'カウンセリング', label: 'カウンセリング' },
          { value: '材料・備品の仕入れ', label: '材料・備品の仕入れ' },
          { value: '清掃・衛生管理', label: '清掃・衛生管理' },
          { value: 'SNS・Web更新', label: 'SNS・Web更新' },
          { value: '経理・帳簿管理', label: '経理・帳簿管理' },
          { value: 'その他', label: 'その他' }
        ];
      }

      // オンライン販売
      if (isOnline) {
        return [
          { value: '商品企画・開発', label: '商品企画・開発' },
          { value: '仕入れ・製造', label: '仕入れ・製造' },
          { value: '受注管理', label: '受注管理' },
          { value: '梱包・発送', label: '梱包・発送' },
          { value: '在庫管理', label: '在庫管理' },
          { value: '顧客対応（メール・電話）', label: '顧客対応（メール・電話）' },
          { value: 'Web運営・更新', label: 'Web運営・更新' },
          { value: 'SNS運用・広告', label: 'SNS運用・広告' },
          { value: '経理・帳簿管理', label: '経理・帳簿管理' },
          { value: 'その他', label: 'その他' }
        ];
      }

      // デフォルト（サービス業等）
      return [
        { value: '接客・顧客対応', label: '接客・顧客対応' },
        { value: 'サービス提供', label: 'サービス提供' },
        { value: '仕入れ・発注', label: '仕入れ・発注' },
        { value: '清掃・管理', label: '清掃・管理' },
        { value: 'SNS・Web更新', label: 'SNS・Web更新' },
        { value: '経理・帳簿管理', label: '経理・帳簿管理' },
        { value: 'その他', label: 'その他' }
      ];
    },
    required: false,
    dependencies: ['Q1-NEW-10'],
    aiEnhance: false,
    helpText: '💡 特に手間がかかっている業務、時間を取られている業務を3つまで選んでください'
  },

  // Q1-NEW-13: 人員面での課題
  {
    id: 'Q1-NEW-13',
    priority: 10.3,
    text: '人員面での課題について、当てはまるものを選んでください（複数選択可）',
    type: 'checkboxes',
    options: [
      { value: '人手が足りない', label: '人手が足りない' },
      { value: '特定の業務に負担が集中している', label: '特定の業務に負担が集中している' },
      { value: '繁忙期に対応しきれない', label: '繁忙期に対応しきれない' },
      { value: '休みが取りにくい', label: '休みが取りにくい' },
      { value: '従業員の教育・育成が難しい', label: '従業員の教育・育成が難しい' },
      { value: '人を雇いたいが人件費が賄えない', label: '人を雇いたいが人件費が賄えない' },
      { value: '従業員の採用が難しい', label: '従業員の採用が難しい' },
      { value: '従業員の定着率が低い', label: '従業員の定着率が低い（すぐ辞めてしまう）' },
      { value: '特に課題はない', label: '特に課題はない' }
    ],
    required: false,
    dependencies: ['Q1-3'],
    aiEnhance: false,
    helpText: '💡 当てはまるものをすべて選択してください'
  },

  // Q1-NEW-14: 財務状況（借入金の有無）
  {
    id: 'Q1-NEW-14',
    priority: 10.4,
    text: '現在の財務状況について教えてください',
    type: 'single_select',
    options: [
      { value: '借入金がある', label: '銀行等からの借入金がある' },
      { value: '借入金はない', label: '借入金はない' },
      { value: '答えたくない', label: '答えたくない' }
    ],
    required: false,
    dependencies: ['Q1-3'],
    aiEnhance: false,
    helpText: '💡 創業時や設備投資のための借入金、新型コロナウイルス関連の融資等を含みます'
  },

  // Q1-NEW-14-detail: 借入金の詳細（条件付き）
  {
    id: 'Q1-NEW-14-detail',
    priority: 10.41,
    text: '借入金について、差し支えない範囲で教えてください',
    type: 'structured_input',
    fields: [
      {
        id: 'loan_amount',
        label: '借入総額（概算）',
        type: 'number',
        placeholder: '例: 5000000',
        unit: '円',
        optional: true,
        helpText: '複数ある場合は合計額。概算で構いません。'
      },
      {
        id: 'monthly_repayment',
        label: '毎月の返済額（概算）',
        type: 'number',
        placeholder: '例: 100000',
        unit: '円',
        optional: true,
        helpText: '概算で構いません。'
      },
      {
        id: 'repayment_burden',
        label: '返済の負担感',
        type: 'single_select',
        options: [
          { value: 'heavy', label: '重い負担になっている' },
          { value: 'moderate', label: 'やや負担だが何とか返済できている' },
          { value: 'light', label: 'それほど負担ではない' }
        ]
      }
    ],
    required: false,
    dependencies: ['Q1-NEW-14'],
    condition: (answers) => answers['Q1-NEW-14'] === '借入金がある',
    aiEnhance: false
  },

  // Q1-NEW-15: 財務面での課題の詳細（条件付き）
  {
    id: 'Q1-NEW-15',
    priority: 10.42,
    text: '借入金の返済による経営への影響について教えてください',
    type: 'single_select',
    options: [
      { value: 'blocking_growth', label: '返済負担が重く、新しい投資ができない' },
      { value: 'cannot_hire', label: '返済があるため、人を雇う余裕がない' },
      { value: 'tight_cashflow', label: '毎月の資金繰りが厳しい' },
      { value: 'manageable', label: '何とか返済できているが、余裕はない' },
      { value: 'no_impact', label: 'それほど負担ではない' }
    ],
    required: false,
    dependencies: ['Q1-NEW-14'],
    condition: (answers) => answers['Q1-NEW-14'] === '借入金がある',
    aiEnhance: false,
    helpText: '💡 借入金の返済が経営にどのような影響を与えているかを選んでください'
  },

  // Q1-NEW-16: 売上・利益面での課題
  {
    id: 'Q1-NEW-16',
    priority: 10.5,
    text: '売上や利益について、現在の課題を教えてください（複数選択可）',
    type: 'checkboxes',
    options: [
      { value: '新規顧客不足', label: '新規顧客が増えない' },
      { value: 'リピート率低下', label: 'リピート率が低い・既存客が減っている' },
      { value: '認知度不足', label: 'お店・サービスの認知度が低い' },
      { value: '客単価低下', label: '客単価が上がらない・下がっている' },
      { value: '来客数減少', label: '来客数が減っている' },
      { value: '季節変動大', label: '季節によって売上の変動が大きい' },
      { value: 'コスト増加', label: '仕入れ・光熱費等のコストが上昇している' },
      { value: '粗利率低下', label: '粗利率が低い・下がっている' },
      { value: '販路限定', label: '販路が限られている（店舗のみ、地域限定等）' },
      { value: '特に課題なし', label: '特に大きな課題はない' }
    ],
    required: false,
    dependencies: ['Q1-8', 'Q1-9'],
    aiEnhance: false,
    helpText: '💡 当てはまるものをすべて選択してください'
  },

  // Q1-NEW-17: 営業・マーケティング面での課題
  {
    id: 'Q1-NEW-17',
    priority: 10.6,
    text: '営業・集客について、現在の課題を教えてください（複数選択可）',
    type: 'checkboxes',
    options: [
      { value: 'Web未整備', label: '公式サイトがない、または古くて使いにくい' },
      { value: 'SNS未活用', label: 'SNS（Instagram、Facebook等）を活用できていない' },
      { value: '広告不足', label: '広告宣伝をほとんどしていない' },
      { value: 'オンライン販売未対応', label: 'オンライン販売に対応していない' },
      { value: 'キャッシュレス未対応', label: 'キャッシュレス決済に対応していない' },
      { value: '予約システムなし', label: 'オンライン予約システムがない' },
      { value: '口コミ少ない', label: 'Google Maps・食べログ等の口コミが少ない' },
      { value: '地域外未開拓', label: '地域外への販路開拓ができていない' },
      { value: '特に課題なし', label: '特に大きな課題はない' }
    ],
    required: false,
    dependencies: ['Q1-3'],
    aiEnhance: false,
    helpText: '💡 当てはまるものをすべて選択してください。補助金で解決したい課題を中心に選んでください'
  },

  // Q1-NEW-18: 業務効率・設備面での課題
  {
    id: 'Q1-NEW-18',
    priority: 10.7,
    text: '業務効率や設備について、現在の課題を教えてください（複数選択可）',
    type: 'checkboxes',
    options: [
      { value: '設備老朽化', label: '設備・機器が古くなっている' },
      { value: '設備不足', label: 'ピーク時に設備・機器が足りない' },
      { value: 'IT化遅れ', label: 'IT化・デジタル化が遅れている' },
      { value: '在庫管理困難', label: '在庫管理がうまくいっていない' },
      { value: '手作業多い', label: '手作業が多く、効率が悪い' },
      { value: '業務ソフトなし', label: '業務管理ソフト・システムを導入していない' },
      { value: 'データ活用不足', label: '売上データ・顧客データを活用できていない' },
      { value: '特に課題なし', label: '特に大きな課題はない' }
    ],
    required: false,
    dependencies: ['Q1-3'],
    aiEnhance: false,
    helpText: '💡 当てはまるものをすべて選択してください'
  },

  // Q1-NEW-19: 最も解決したい課題
  {
    id: 'Q1-NEW-19',
    priority: 10.8,
    text: '上記の課題の中で、最も解決したい課題は何ですか？',
    type: 'single_select',
    options: (answers) => {
      // 全ての課題から選択肢を生成
      const q13 = Array.isArray(answers['Q1-NEW-13']) ? answers['Q1-NEW-13'] : [];
      const q16 = Array.isArray(answers['Q1-NEW-16']) ? answers['Q1-NEW-16'] : [];
      const q17 = Array.isArray(answers['Q1-NEW-17']) ? answers['Q1-NEW-17'] : [];
      const q18 = Array.isArray(answers['Q1-NEW-18']) ? answers['Q1-NEW-18'] : [];

      const allIssues = [
        ...q13,
        ...q16,
        ...q17,
        ...q18
      ].filter(issue => issue !== '特に課題はない' && issue !== '特に課題なし' && issue !== '特に大きな課題はない');

      // 課題が選択されていない場合のデフォルト
      if (allIssues.length === 0) {
        return [
          { value: '課題なし', label: '課題が選択されていません' }
        ];
      }

      return allIssues.map(issue => ({
        value: issue,
        label: issue
      }));
    },
    required: false,
    dependencies: ['Q1-NEW-13', 'Q1-NEW-16', 'Q1-NEW-17', 'Q1-NEW-18'],
    aiEnhance: false,
    helpText: '💡 補助金を活用して最も解決したい課題を1つ選んでください'
  },

  // Q1-NEW-20: 課題を解決できていない理由
  {
    id: 'Q1-NEW-20',
    priority: 10.9,
    text: 'その課題をこれまで解決できていなかった理由を教えてください（複数選択可）',
    type: 'checkboxes',
    options: [
      { value: '資金不足', label: '資金が足りなかった' },
      { value: '時間不足', label: '時間がなかった' },
      { value: '知識不足', label: 'どうすればいいかわからなかった' },
      { value: '人手不足', label: '人手が足りず、手が回らなかった' },
      { value: '優先度低い', label: '他に優先すべきことがあった' },
      { value: '投資効果不明', label: '投資しても効果があるか不安だった' },
      { value: 'その他', label: 'その他' }
    ],
    required: false,
    dependencies: ['Q1-NEW-19'],
    aiEnhance: false,
    helpText: '💡 当てはまるものをすべて選択してください'
  }
];
