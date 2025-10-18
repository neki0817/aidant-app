// データバリデーション機能
import { VALIDATION_TYPES } from './constants';

/**
 * ユーザーデータのバリデーション
 * @param {object} userData - ユーザーデータ
 */
export const validateUserData = (userData) => {
  const errors = [];
  
  if (!userData.userId || typeof userData.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  
  if (!userData.email || !isValidEmail(userData.email)) {
    errors.push('Valid email is required');
  }
  
  if (typeof userData.pointBalance !== 'number' || userData.pointBalance < 0) {
    errors.push('pointBalance must be a non-negative number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * ポイントトランザクションのバリデーション
 * @param {object} transactionData - トランザクションデータ
 */
export const validatePointTransaction = (transactionData) => {
  const errors = [];
  
  if (!transactionData.userId || typeof transactionData.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  
  if (!['grant', 'consume', 'purchase'].includes(transactionData.type)) {
    errors.push('type must be one of: grant, consume, purchase');
  }
  
  if (typeof transactionData.amount !== 'number' || transactionData.amount <= 0) {
    errors.push('amount must be a positive number');
  }
  
  if (!transactionData.description || typeof transactionData.description !== 'string') {
    errors.push('description is required and must be a string');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 申請書データのバリデーション
 * @param {object} applicationData - 申請書データ
 */
export const validateApplicationData = (applicationData) => {
  const errors = [];
  
  if (!applicationData.userId || typeof applicationData.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  
  if (!['draft', 'completed', 'downloaded'].includes(applicationData.status)) {
    errors.push('status must be one of: draft, completed, downloaded');
  }
  
  if (typeof applicationData.currentStep !== 'number' || 
      applicationData.currentStep < 1 || 
      applicationData.currentStep > 5) {
    errors.push('currentStep must be a number between 1 and 5');
  }
  
  if (typeof applicationData.answers !== 'object' || applicationData.answers === null) {
    errors.push('answers must be an object');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 決済履歴データのバリデーション
 * @param {object} paymentData - 決済データ
 */
export const validatePaymentData = (paymentData) => {
  const errors = [];
  
  if (!paymentData.userId || typeof paymentData.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  
  if (!paymentData.stripePaymentId || typeof paymentData.stripePaymentId !== 'string') {
    errors.push('stripePaymentId is required and must be a string');
  }
  
  if (typeof paymentData.amount !== 'number' || paymentData.amount <= 0) {
    errors.push('amount must be a positive number');
  }
  
  if (typeof paymentData.pointsPurchased !== 'number' || paymentData.pointsPurchased <= 0) {
    errors.push('pointsPurchased must be a positive number');
  }
  
  if (!['succeeded', 'pending', 'failed'].includes(paymentData.status)) {
    errors.push('status must be one of: succeeded, pending, failed');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 質問回答のバリデーション
 * @param {string} questionId - 質問ID
 * @param {any} answer - 回答内容
 */
export const validateQuestionAnswer = (questionId, answer) => {
  const errors = [];
  
  // 質問IDの形式チェック
  if (!questionId || !questionId.match(/^Q[1-5]-\d+$/)) {
    errors.push('Invalid question ID format');
    return { isValid: false, errors };
  }
  
  const step = parseInt(questionId.split('-')[0].substring(1));
  const questionNumber = parseInt(questionId.split('-')[1]);
  
  // Step別のバリデーション
  switch (step) {
    case 1:
      return validateStep1Answer(questionNumber, answer);
    case 2:
      return validateStep2Answer(questionNumber, answer);
    case 3:
      return validateStep3Answer(questionNumber, answer);
    case 4:
      return validateStep4Answer(questionNumber, answer);
    case 5:
      return validateStep5Answer(questionNumber, answer);
    default:
      errors.push('Invalid step number');
      return { isValid: false, errors };
  }
};

/**
 * Step1の回答バリデーション
 */
const validateStep1Answer = (questionNumber, answer) => {
  const errors = [];
  
  switch (questionNumber) {
    case 1: // 業種選択
      if (!answer || !['飲食店（レストラン・カフェ・居酒屋等）'].includes(answer)) {
        errors.push('Invalid industry selection');
      }
      break;
    case 2: // 実現したいこと
      const validGoals = [
        '新規顧客を増やしたい',
        'リピート客を増やしたい',
        '客単価を上げたい',
        '売上を安定させたい',
        'ブランド力を高めたい'
      ];
      if (!answer || !validGoals.includes(answer)) {
        errors.push('Invalid goal selection');
      }
      break;
    case 3: // 取組内容
      if (!Array.isArray(answer) || answer.length === 0) {
        errors.push('At least one activity must be selected');
      }
      // ウェブサイト単独チェック
      if (answer.length === 1 && answer.includes('ホームページ・ECサイト制作')) {
        errors.push('Website-related expenses cannot be applied for alone');
      }
      break;
    default:
      errors.push('Invalid question number for Step 1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Step2の回答バリデーション
 */
const validateStep2Answer = (questionNumber, answer) => {
  const errors = [];
  
  switch (questionNumber) {
    case 1: // 店舗名
      if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
        errors.push('Store name is required');
      }
      break;
    case 2: // 代表者名
      if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
        errors.push('Representative name is required');
      }
      break;
    case 3: // 開業年月
      if (!answer || !isValidDate(answer)) {
        errors.push('Valid opening date is required (YYYY-MM format)');
      }
      break;
    case 6: // 従業員数
      const employeeCount = parseInt(answer);
      if (isNaN(employeeCount) || employeeCount > 5) {
        errors.push('Employee count must be 5 or less for restaurant industry');
      }
      break;
    case 7: // 財務情報
      if (!answer || typeof answer !== 'object') {
        errors.push('Financial data must be an object');
      } else {
        // 財務データの詳細バリデーション
        const financialErrors = validateFinancialData(answer);
        errors.push(...financialErrors);
      }
      break;
    default:
      errors.push('Invalid question number for Step 2');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Step3の回答バリデーション
 */
const validateStep3Answer = (questionNumber, answer) => {
  const errors = [];
  
  switch (questionNumber) {
    case 1: // 住所入力
      if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
        errors.push('Address is required');
      }
      break;
    case 4: // 店舗基本情報
      if (!answer || typeof answer !== 'object') {
        errors.push('Store information must be an object');
      } else {
        if (typeof answer.area !== 'number' || answer.area <= 0) {
          errors.push('Valid store area is required');
        }
        if (typeof answer.seats !== 'number' || answer.seats <= 0) {
          errors.push('Valid seat count is required');
        }
      }
      break;
    case 5: // メニュー・価格
      if (!answer || typeof answer !== 'object') {
        errors.push('Menu information must be an object');
      } else {
        if (typeof answer.averagePrice !== 'number' || answer.averagePrice <= 0) {
          errors.push('Valid average price is required');
        }
      }
      break;
    default:
      errors.push('Invalid question number for Step 3');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Step4の回答バリデーション
 */
const validateStep4Answer = (questionNumber, answer) => {
  const errors = [];
  
  switch (questionNumber) {
    case 3: // 月間来店客数
      const customerCount = parseInt(answer);
      if (isNaN(customerCount) || customerCount <= 0) {
        errors.push('Valid monthly customer count is required');
      }
      break;
    case 8: // 経営課題
      if (!Array.isArray(answer) || answer.length === 0 || answer.length > 3) {
        errors.push('1-3 management challenges must be selected');
      }
      break;
    case 9: // 課題の具体的状況
      if (!answer || typeof answer !== 'string' || answer.trim().length < 10) {
        errors.push('Detailed challenge description is required (minimum 10 characters)');
      }
      break;
    default:
      errors.push('Invalid question number for Step 4');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Step5の回答バリデーション
 */
const validateStep5Answer = (questionNumber, answer) => {
  const errors = [];
  
  switch (questionNumber) {
    case 1: // 取組内容選択
      if (!Array.isArray(answer) || answer.length === 0) {
        errors.push('At least one activity must be selected');
      }
      // ウェブサイト単独チェック
      if (answer.length === 1 && answer.includes('ホームページ・ECサイト制作')) {
        errors.push('Website-related expenses cannot be applied for alone');
      }
      break;
    case 7: // 経費明細
      if (!answer || typeof answer !== 'object') {
        errors.push('Expense details must be an object');
      } else {
        const expenseErrors = validateExpenseData(answer);
        errors.push(...expenseErrors);
      }
      break;
    case 10: // 効果目標
      if (!answer || typeof answer !== 'object') {
        errors.push('Effect targets must be an object');
      } else {
        const targetErrors = validateTargetData(answer);
        errors.push(...targetErrors);
      }
      break;
    default:
      errors.push('Invalid question number for Step 5');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 財務データのバリデーション
 */
const validateFinancialData = (financialData) => {
  const errors = [];
  
  if (!financialData.periods || !Array.isArray(financialData.periods)) {
    errors.push('Financial periods must be an array');
    return errors;
  }
  
  for (const period of financialData.periods) {
    if (typeof period.sales !== 'number' || period.sales < 0) {
      errors.push('Valid sales data is required for all periods');
    }
    if (typeof period.profit !== 'number') {
      errors.push('Valid profit data is required for all periods');
    }
  }
  
  return errors;
};

/**
 * 経費データのバリデーション
 */
const validateExpenseData = (expenseData) => {
  const errors = [];
  
  if (!expenseData.categories || !Array.isArray(expenseData.categories)) {
    errors.push('Expense categories must be an array');
    return errors;
  }
  
  let totalAmount = 0;
  let webRelatedAmount = 0;
  
  for (const category of expenseData.categories) {
    if (typeof category.subtotal !== 'number' || category.subtotal < 0) {
      errors.push('Valid subtotal is required for all categories');
    }
    
    totalAmount += category.subtotal;
    
    if (category.category === 'ウェブサイト関連費') {
      webRelatedAmount += category.subtotal;
    }
  }
  
  // ウェブサイト関連費の制限チェック
  if (webRelatedAmount > 0) {
    const webRatio = webRelatedAmount / totalAmount;
    if (webRatio > 0.25) {
      errors.push('Website-related expenses must be 25% or less of total expenses');
    }
    if (webRelatedAmount > 500000) {
      errors.push('Website-related expenses must be 500,000 yen or less');
    }
  }
  
  return errors;
};

/**
 * 目標データのバリデーション
 */
const validateTargetData = (targetData) => {
  const errors = [];
  
  if (!targetData.current || !targetData.target) {
    errors.push('Both current and target data are required');
    return errors;
  }
  
  const current = targetData.current;
  const target = targetData.target;
  
  // 現状データのバリデーション
  if (typeof current.monthlyCustomers !== 'number' || current.monthlyCustomers <= 0) {
    errors.push('Valid current monthly customer count is required');
  }
  if (typeof current.monthlySales !== 'number' || current.monthlySales <= 0) {
    errors.push('Valid current monthly sales is required');
  }
  if (typeof current.averagePrice !== 'number' || current.averagePrice <= 0) {
    errors.push('Valid current average price is required');
  }
  
  // 目標データのバリデーション
  if (typeof target.monthlyCustomers !== 'number' || target.monthlyCustomers <= 0) {
    errors.push('Valid target monthly customer count is required');
  }
  if (typeof target.monthlySales !== 'number' || target.monthlySales <= 0) {
    errors.push('Valid target monthly sales is required');
  }
  if (typeof target.averagePrice !== 'number' || target.averagePrice <= 0) {
    errors.push('Valid target average price is required');
  }
  
  // 成長率の妥当性チェック
  const customerGrowthRate = (target.monthlyCustomers - current.monthlyCustomers) / current.monthlyCustomers;
  if (customerGrowthRate > 0.5) {
    errors.push('Customer growth rate should be realistic (50% or less)');
  }
  
  return errors;
};

// ===========================================
// ユーティリティ関数
// ===========================================

/**
 * メールアドレスのバリデーション
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 日付のバリデーション（YYYY-MM形式）
 */
const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const [year, month] = dateString.split('-');
  const date = new Date(year, month - 1);
  
  return date.getFullYear() == year && date.getMonth() == month - 1;
};

/**
 * ポイント残高のチェック
 */
export const checkPointBalance = (currentBalance, requiredPoints) => {
  return {
    hasEnoughPoints: currentBalance >= requiredPoints,
    remainingPoints: currentBalance - requiredPoints,
    insufficientPoints: Math.max(0, requiredPoints - currentBalance)
  };
};

/**
 * 申請書の完了度チェック
 */
export const checkApplicationProgress = (answers, currentStep) => {
  const requiredQuestions = {
    1: ['Q1-1', 'Q1-2', 'Q1-3'],
    2: ['Q2-0', 'Q2-1', 'Q2-2', 'Q2-3', 'Q2-4', 'Q2-5', 'Q2-6', 'Q2-7-1', 'Q2-7-2', 'Q2-7-3', 'Q2-8', 'Q2-9'],
    3: ['Q3-1', 'Q3-2', 'Q3-3', 'Q3-4', 'Q3-5', 'Q3-6', 'Q3-7'],
    4: ['Q4-1', 'Q4-2', 'Q4-3', 'Q4-4', 'Q4-5', 'Q4-6', 'Q4-7', 'Q4-8', 'Q4-9', 'Q4-10', 'Q4-11'],
    5: ['Q5-1', 'Q5-2', 'Q5-3', 'Q5-4', 'Q5-5', 'Q5-6', 'Q5-7', 'Q5-8', 'Q5-9', 'Q5-10', 'Q5-11', 'Q5-12', 'Q5-13', 'Q5-14']
  };
  
  const completedQuestions = Object.keys(answers).filter(qId => 
    answers[qId] !== null && answers[qId] !== undefined && answers[qId] !== ''
  );
  
  const stepProgress = {};
  for (let step = 1; step <= currentStep; step++) {
    const required = requiredQuestions[step] || [];
    const completed = required.filter(qId => completedQuestions.includes(qId));
    stepProgress[step] = {
      completed: completed.length,
      total: required.length,
      percentage: Math.round((completed.length / required.length) * 100)
    };
  }
  
  return {
    currentStep,
    stepProgress,
    overallProgress: Math.round((completedQuestions.length / Object.values(requiredQuestions).flat().length) * 100)
  };
};
