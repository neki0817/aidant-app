/**
 * 決算月に関するヘルパー関数
 */

/**
 * 現在日付が決算月を超えているか判定
 * @param {number} fiscalMonth - 決算月（1-12）
 * @param {Date} currentDate - 現在日付（デフォルト: 今日）
 * @returns {boolean} true: 決算月を超えている、false: 決算月前
 */
export function isPastFiscalMonth(fiscalMonth, currentDate = new Date()) {
  const currentMonth = currentDate.getMonth() + 1; // 0-11 → 1-12
  return currentMonth > fiscalMonth;
}

/**
 * 決算年度を計算
 * @param {number} fiscalMonth - 決算月（1-12）
 * @param {Date} currentDate - 現在日付（デフォルト: 今日）
 * @returns {number} 決算年度
 *
 * 例：
 * - 決算月3月、現在2025年10月 → 2025年度（2025年3月期は終了済み）
 * - 決算月3月、現在2025年2月 → 2024年度（2025年3月期はまだ）
 */
export function getCurrentFiscalYear(fiscalMonth, currentDate = new Date()) {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // 決算月を超えている場合、現在年が決算年
  // 決算月前の場合、前年が決算年
  if (currentMonth > fiscalMonth) {
    return currentYear;
  } else {
    return currentYear - 1;
  }
}

/**
 * 期のラベルを生成
 * @param {number} fiscalMonth - 決算月（1-12）
 * @param {number} yearsAgo - 何期前か（0: 直近/今期、1: 1期前、2: 2期前、3: 3期前）
 * @param {Date} currentDate - 現在日付（デフォルト: 今日）
 * @returns {object} { label: '直近1期（2025年3月期）', isForecast: false }
 */
export function getFiscalPeriodLabel(fiscalMonth, yearsAgo = 0, currentDate = new Date()) {
  const isPast = isPastFiscalMonth(fiscalMonth, currentDate);
  const currentFiscalYear = getCurrentFiscalYear(fiscalMonth, currentDate);

  // 決算年を計算
  const fiscalYear = currentFiscalYear - yearsAgo;

  // ラベルを生成
  let label = '';
  let isForecast = false;

  if (yearsAgo === 0) {
    if (isPast) {
      label = `直近1期（${fiscalYear}年${fiscalMonth}月期）`;
    } else {
      label = `今期予想（${fiscalYear + 1}年${fiscalMonth}月期）`;
      isForecast = true;
    }
  } else if (yearsAgo === 1) {
    if (isPast) {
      label = `2期前（${fiscalYear}年${fiscalMonth}月期）`;
    } else {
      label = `1期前（${fiscalYear}年${fiscalMonth}月期）`;
    }
  } else if (yearsAgo === 2) {
    if (isPast) {
      label = `3期前（${fiscalYear}年${fiscalMonth}月期）`;
    } else {
      label = `2期前（${fiscalYear}年${fiscalMonth}月期）`;
    }
  }

  return { label, fiscalYear, isForecast };
}

/**
 * 質問文のラベルを生成（Q1-8-2期前等の質問用）
 * @param {number} fiscalMonth - 決算月（1-12）
 * @param {number} yearsAgo - 何期前か（1, 2）
 * @param {Date} currentDate - 現在日付（デフォルト: 今日）
 * @returns {string} 質問用のラベル
 *
 * 例：
 * - yearsAgo=1, 決算月超過 → "2期前（2024年3月期）"
 * - yearsAgo=1, 決算月前 → "1期前（2024年3月期）"
 */
export function getQuestionPeriodLabel(fiscalMonth, yearsAgo, currentDate = new Date()) {
  const { label } = getFiscalPeriodLabel(fiscalMonth, yearsAgo, currentDate);
  return label;
}

/**
 * テーブル用のラベルを一括生成
 * @param {number} fiscalMonth - 決算月（1-12）
 * @param {boolean} has2PeriodsAgo - 2期前データの有無
 * @param {boolean} has3PeriodsAgo - 3期前データの有無
 * @param {Date} currentDate - 現在日付（デフォルト: 今日）
 * @returns {object} { current: {...}, prev1: {...}, prev2: {...} }
 */
export function getTableLabels(fiscalMonth, has2PeriodsAgo, has3PeriodsAgo, currentDate = new Date()) {
  const current = getFiscalPeriodLabel(fiscalMonth, 0, currentDate);
  const prev1 = has2PeriodsAgo ? getFiscalPeriodLabel(fiscalMonth, 1, currentDate) : null;
  const prev2 = has3PeriodsAgo ? getFiscalPeriodLabel(fiscalMonth, 2, currentDate) : null;

  return { current, prev1, prev2 };
}

/**
 * 決算月超過の説明文を生成
 * @param {number} fiscalMonth - 決算月（1-12）
 * @param {Date} currentDate - 現在日付（デフォルト: 今日）
 * @returns {string} 説明文
 */
export function getFiscalMonthExplanation(fiscalMonth, currentDate = new Date()) {
  const isPast = isPastFiscalMonth(fiscalMonth, currentDate);
  const monthNames = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  if (isPast) {
    return `決算月（${monthNames[fiscalMonth]}）は既に過ぎているため、直近の決算期の実績値を入力してください。`;
  } else {
    return `決算月（${monthNames[fiscalMonth]}）がまだ到来していないため、今期の予想値を入力してください。`;
  }
}
