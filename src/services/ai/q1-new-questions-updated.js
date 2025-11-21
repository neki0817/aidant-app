// Q1-NEW-4〜Q1-NEW-6の更新版
// Q1-NEW-1〜Q1-NEW-3はq1-new-questions.jsに既に実装済み

export const Q1_NEW_QUESTIONS_PART2 = [
  // Q1-NEW-4-age: 顧客の年齢層
  {
    id: 'Q1-NEW-4-age',
    priority: 5.9,
    text: '主な顧客の年齢層を教えてください（複数選択可）',
    type: 'multi_select',
    options: [
      { value: '10代', label: '10代' },
      { value: '20代', label: '20代' },
      { value: '30代', label: '30代' },
      { value: '40代', label: '40代' },
      { value: '50代', label: '50代' },
      { value: '60代以上', label: '60代以上' }
    ],
    required: true,
    dependencies: ['Q1-NEW-3'],
    aiEnhance: false,
    helpText: '💡 当てはまるものを全て選択してください'
  },

  // Q1-NEW-4-persona: 顧客層の特徴
  {
    id: 'Q1-NEW-4-persona',
    priority: 5.91,
    text: '主な顧客層の特徴を教えてください（複数選択可）',
    type: 'multi_select',
    options: [
      { value: '男性が多い', label: '男性が多い' },
      { value: '女性が多い', label: '女性が多い' },
      { value: 'カップル・デート利用', label: 'カップル・デート利用' },
      { value: 'ファミリー層', label: 'ファミリー層' },
      { value: '一人客', label: '一人客' },
      { value: 'ビジネスパーソン', label: 'ビジネスパーソン' },
      { value: '学生', label: '学生' },
      { value: '観光客', label: '観光客' },
      { value: 'その他', label: 'その他（自由入力）' }
    ],
    required: true,
    dependencies: ['Q1-NEW-4-age'],
    aiEnhance: false,
    helpText: '💡 当てはまるものを全て選択してください'
  },

  // Q1-NEW-4-persona-other: その他の詳細（条件付き）
  {
    id: 'Q1-NEW-4-persona-other',
    priority: 5.92,
    text: '「その他」の内容を教えてください',
    type: 'text',
    placeholder: '',
    required: true,
    dependencies: ['Q1-NEW-4-persona'],
    condition: (answers) => {
      const persona = answers['Q1-NEW-4-persona'];
      return persona && persona.includes('その他');
    },
    aiEnhance: false,
    helpText: ''
  },

  // Q1-NEW-5-busyday: 来客が多い日
  {
    id: 'Q1-NEW-5-busyday',
    priority: 5.93,
    text: '来客が多いのはいつですか？（複数選択可）',
    type: 'multi_select',
    options: [
      { value: '平日', label: '平日' },
      { value: '週末（土日）', label: '週末（土日）' },
      { value: '祝日', label: '祝日' },
      { value: '特定の曜日', label: '特定の曜日（自由入力）' }
    ],
    required: true,
    dependencies: ['Q1-NEW-4-persona'],
    condition: (answers) => {
      // その他が選択されていない、または入力済みの場合に表示
      const persona = answers['Q1-NEW-4-persona'];
      if (!persona || !persona.includes('その他')) return true;
      return answers['Q1-NEW-4-persona-other'];
    },
    aiEnhance: false,
    helpText: '💡 当てはまるものを全て選択してください'
  },

  // Q1-NEW-5-busytime: 来客が多い時間帯
  {
    id: 'Q1-NEW-5-busytime',
    priority: 5.94,
    text: '来客が多い時間帯はいつですか？（複数選択可）',
    type: 'multi_select',
    options: [
      { value: '午前中（開店〜12時）', label: '午前中（開店〜12時）' },
      { value: 'ランチタイム（12時〜14時）', label: 'ランチタイム（12時〜14時）' },
      { value: '午後（14時〜17時）', label: '午後（14時〜17時）' },
      { value: '夕方以降（17時〜閉店）', label: '夕方以降（17時〜閉店）' }
    ],
    required: true,
    dependencies: ['Q1-NEW-5-busyday'],
    aiEnhance: false,
    helpText: '💡 当てはまるものを全て選択してください'
  },

  // Q1-NEW-5-season: 季節による変動
  {
    id: 'Q1-NEW-5-season',
    priority: 5.95,
    text: '季節による変動はありますか？',
    type: 'single_select',
    options: [
      { value: '特に変動なし', label: '特に変動なし' },
      { value: '夏に増える', label: '夏に増える' },
      { value: '冬に増える', label: '冬に増える' },
      { value: 'その他', label: 'その他（自由入力）' }
    ],
    required: true,
    dependencies: ['Q1-NEW-5-busytime'],
    aiEnhance: false,
    helpText: '💡 一つ選択してください'
  },

  // Q1-NEW-6-1: 1番人気の商品名
  {
    id: 'Q1-NEW-6-1',
    priority: 5.96,
    text: '一番人気の商品名を教えてください',
    type: 'text',
    placeholder: '例：BBQバーガー',
    required: true,
    dependencies: ['Q1-NEW-5-season'],
    aiEnhance: false,
    helpText: '💡 最も売れている商品・メニューを教えてください'
  },

  // Q1-NEW-6-1-price: 1番人気の商品価格
  {
    id: 'Q1-NEW-6-1-price',
    priority: 5.961,
    text: 'その商品の価格はいくらですか？',
    type: 'number',
    placeholder: '1650',
    required: true,
    dependencies: ['Q1-NEW-6-1'],
    aiEnhance: false,
    helpText: '単位：円（税込）'
  },

  // Q1-NEW-6-2: 2番人気の商品名（任意）
  {
    id: 'Q1-NEW-6-2',
    priority: 5.97,
    text: '2番目に人気の商品名を教えてください（任意）',
    type: 'text',
    placeholder: '例：コーディアルドリンク',
    required: false,
    dependencies: ['Q1-NEW-6-1-price'],
    aiEnhance: false,
    helpText: '💡 入力しない場合は空欄のまま次へ進んでください'
  },

  // Q1-NEW-6-2-price: 2番人気の商品価格（条件付き）
  {
    id: 'Q1-NEW-6-2-price',
    priority: 5.971,
    text: 'その商品の価格はいくらですか？',
    type: 'number',
    placeholder: '600',
    required: true,
    dependencies: ['Q1-NEW-6-2'],
    condition: (answers) => answers['Q1-NEW-6-2'] && answers['Q1-NEW-6-2'].trim() !== '',
    aiEnhance: false,
    helpText: '単位：円（税込）'
  },

  // Q1-NEW-6-3: 3番人気の商品名（任意）
  {
    id: 'Q1-NEW-6-3',
    priority: 5.98,
    text: '3番目に人気の商品名を教えてください（任意）',
    type: 'text',
    placeholder: '例：限定ジビエバーガー',
    required: false,
    dependencies: ['Q1-NEW-6-2'],
    condition: (answers) => {
      // Q1-NEW-6-2が入力されていない場合でも表示
      // または Q1-NEW-6-2-priceが入力済みの場合に表示
      if (!answers['Q1-NEW-6-2'] || answers['Q1-NEW-6-2'].trim() === '') return true;
      return answers['Q1-NEW-6-2-price'];
    },
    aiEnhance: false,
    helpText: '💡 入力しない場合は空欄のまま次へ進んでください'
  },

  // Q1-NEW-6-3-price: 3番人気の商品価格（条件付き）
  {
    id: 'Q1-NEW-6-3-price',
    priority: 5.981,
    text: 'その商品の価格はいくらですか？',
    type: 'number',
    placeholder: '2600',
    required: true,
    dependencies: ['Q1-NEW-6-3'],
    condition: (answers) => answers['Q1-NEW-6-3'] && answers['Q1-NEW-6-3'].trim() !== '',
    aiEnhance: false,
    helpText: '単位：円（税込）'
  }
];
