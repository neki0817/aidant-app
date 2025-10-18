// アプリケーション定数定義

// ===========================================
// ポイント関連定数
// ===========================================
export const POINT_CONSTANTS = {
  INITIAL_POINTS: 5000, // 新規登録時の初期ポイント
  DOWNLOAD_COST: 2980, // 申請書ダウンロード時のポイント消費
  PURCHASE_RATE: 1, // ポイント購入レート（1円 = 1ポイント）
  
  // 質問別ポイント消費
  QUESTION_COSTS: {
    'Q1-1': 0, 'Q1-2': 0, 'Q1-3': 0, // Step1は無料
    'Q2-0': 0, 'Q2-1': 0, 'Q2-2': 10, 'Q2-3': 10, 'Q2-4': 10, 'Q2-5': 10,
    'Q2-6': 10, 'Q2-7-1': 10, 'Q2-7-2': 10, 'Q2-7-3': 10, 'Q2-8': 10, 'Q2-9': 10,
    'Q3-1': 20, 'Q3-2': 20, 'Q3-3': 10, 'Q3-4': 10, 'Q3-5': 20, 'Q3-6': 20, 'Q3-7': 10,
    'Q4-1': 10, 'Q4-2': 10, 'Q4-3': 10, 'Q4-4': 10, 'Q4-5': 10,
    'Q4-6': 10, 'Q4-7': 10, 'Q4-8': 20, 'Q4-9': 20, 'Q4-10': 10, 'Q4-11': 10,
    'Q5-1': 20, 'Q5-2': 20, 'Q5-3': 15, 'Q5-4': 15, 'Q5-5': 15, 'Q5-6': 30,
    'Q5-7': 20, 'Q5-8': 10, 'Q5-9': 10, 'Q5-10': 20, 'Q5-11': 10, 'Q5-12': 10, 'Q5-13': 10, 'Q5-14': 10
  }
};

// ===========================================
// 申請書ステータス
// ===========================================
export const APPLICATION_STATUS = {
  DRAFT: 'draft',
  COMPLETED: 'completed',
  DOWNLOADED: 'downloaded'
};

// ===========================================
// ポイントトランザクションタイプ
// ===========================================
export const TRANSACTION_TYPES = {
  GRANT: 'grant',      // 付与
  CONSUME: 'consume',  // 消費
  PURCHASE: 'purchase' // 購入
};

// ===========================================
// 決済ステータス
// ===========================================
export const PAYMENT_STATUS = {
  SUCCEEDED: 'succeeded',
  PENDING: 'pending',
  FAILED: 'failed'
};

// ===========================================
// バリデーションタイプ
// ===========================================
export const VALIDATION_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  DATE: 'date',
  NUMBER: 'number',
  REQUIRED: 'required',
  MAX_LENGTH: 'maxLength',
  MIN_LENGTH: 'minLength',
  PATTERN: 'pattern'
};

// ===========================================
// 業種定数
// ===========================================
export const INDUSTRIES = {
  RESTAURANT: '飲食',
  SALON: 'サロン',
  HOTEL: '宿泊'
};

// ===========================================
// 補助金制約
// ===========================================
export const SUBSIDY_CONSTRAINTS = {
  MAX_EMPLOYEES: 5, // 最大従業員数
  WEBSITE_MAX_RATIO: 0.25, // ウェブサイト関連費の最大割合
  WEBSITE_MAX_AMOUNT: 500000, // ウェブサイト関連費の最大金額（円）
  EQUIPMENT_QUOTE_THRESHOLD: 1000000, // 相見積もり必要金額（円）
  EQUIPMENT_DISPOSAL_THRESHOLD: 500000 // 処分制限財産金額（円）
};

// ===========================================
// 補助率
// ===========================================
export const SUBSIDY_RATES = {
  NORMAL: 2/3, // 通常枠（黒字）
  SPECIAL: 3/4 // 賃金引上げ特例（赤字）
};

// ===========================================
// 質問カテゴリ
// ===========================================
export const QUESTION_CATEGORIES = {
  STEP1: '業種選択・目的確認',
  STEP2: '基本情報・企業概要',
  STEP3: '店舗情報取得',
  STEP4: '課題・ニーズ詳細分析',
  STEP5: '補助事業詳細設計'
};

// ===========================================
// 経費カテゴリ
// ===========================================
export const EXPENSE_CATEGORIES = {
  WEBSITE: 'ウェブサイト関連費',
  ADVERTISING: '広報費',
  EQUIPMENT: '機械装置等費',
  EXHIBITION: '展示会等出展費',
  TRAVEL: '旅費',
  DEVELOPMENT: '新商品開発費',
  RENTAL: '借料',
  OUTSOURCING: '委託・外注費'
};

// ===========================================
// エラーメッセージ
// ===========================================
export const ERROR_MESSAGES = {
  INSUFFICIENT_POINTS: 'ポイントが不足しています',
  INVALID_ANSWER: '無効な回答です',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  AUTHENTICATION_ERROR: '認証エラーが発生しました',
  VALIDATION_ERROR: '入力内容に誤りがあります',
  SERVER_ERROR: 'サーバーエラーが発生しました'
};

// ===========================================
// 成功メッセージ
// ===========================================
export const SUCCESS_MESSAGES = {
  POINTS_PURCHASED: 'ポイントを購入しました',
  APPLICATION_SAVED: '申請書を保存しました',
  APPLICATION_COMPLETED: '申請書が完成しました',
  DOWNLOAD_READY: 'ダウンロードの準備ができました'
};

// ===========================================
// API設定
// ===========================================
export const API_CONFIG = {
  GEMINI_MAX_TOKENS: 4000,
  GEMINI_TEMPERATURE: 0.7,
  GOOGLE_MAPS_RADIUS: 1000, // 最寄り駅検索半径（メートル）
  WALK_SPEED: 80 // 徒歩速度（メートル/分）
};

// ===========================================
// UI設定
// ===========================================
export const UI_CONFIG = {
  MAX_TEXTAREA_LENGTH: 300,
  MAX_SELECT_OPTIONS: 3,
  CHAT_MESSAGE_DELAY: 1000, // チャットメッセージ表示遅延（ミリ秒）
  PROGRESS_BAR_ANIMATION: 500 // プログレスバーアニメーション時間（ミリ秒）
};

// ===========================================
// ファイル形式
// ===========================================
export const FILE_FORMATS = {
  PDF: 'pdf',
  WORD: 'docx',
  EXCEL: 'xlsx'
};

// ===========================================
// 日付フォーマット
// ===========================================
export const DATE_FORMATS = {
  DISPLAY: 'YYYY年MM月DD日',
  INPUT: 'YYYY-MM-DD',
  MONTH_YEAR: 'YYYY-MM'
};

// ===========================================
// 通貨フォーマット
// ===========================================
export const CURRENCY_FORMAT = {
  SYMBOL: '¥',
  DECIMAL_PLACES: 0,
  THOUSAND_SEPARATOR: ','
};
