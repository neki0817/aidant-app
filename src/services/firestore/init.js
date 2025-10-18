// Firestoreデータベース初期化スクリプト
import { 
  createUser, 
  getUser, 
  addPointTransaction,
  createApplication 
} from './collections';
import { POINT_CONSTANTS } from '../../utils/constants';

/**
 * 新規ユーザー登録時の初期化処理
 * @param {object} user - Firebase Auth ユーザーオブジェクト
 */
export const initializeNewUser = async (user) => {
  try {
    // 既存ユーザーチェック
    const existingUser = await getUser(user.uid);
    if (existingUser) {
      console.log('User already exists:', existingUser);
      return existingUser;
    }

    // 新規ユーザー作成
    const userData = await createUser(
      user.uid,
      user.email,
      POINT_CONSTANTS.INITIAL_POINTS
    );

    console.log('New user created:', userData);
    return userData;
  } catch (error) {
    console.error('Error initializing new user:', error);
    throw error;
  }
};

/**
 * ユーザーデータの完全性チェック
 * @param {string} userId - ユーザーID
 */
export const validateUserDataIntegrity = async (userId) => {
  try {
    const user = await getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // ポイント残高の整合性チェック
    const pointHistory = await getUserPointHistory(userId);
    const calculatedBalance = pointHistory.reduce((sum, transaction) => {
      return sum + transaction.amount;
    }, 0);

    if (user.pointBalance !== calculatedBalance) {
      console.warn('Point balance mismatch detected:', {
        stored: user.pointBalance,
        calculated: calculatedBalance
      });
      
      // ポイント残高を修正
      await updateUserPoints(userId, calculatedBalance);
      console.log('Point balance corrected');
    }

    return {
      isValid: true,
      user,
      pointHistory
    };
  } catch (error) {
    console.error('Error validating user data integrity:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
};

/**
 * 申請書データの完全性チェック
 * @param {string} applicationId - 申請書ID
 */
export const validateApplicationDataIntegrity = async (applicationId) => {
  try {
    const application = await getApplication(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // 必須フィールドのチェック
    const requiredFields = ['userId', 'industry', 'status', 'currentStep', 'answers'];
    const missingFields = requiredFields.filter(field => !application[field]);
    
    if (missingFields.length > 0) {
      console.warn('Missing required fields:', missingFields);
    }

    // 回答データの整合性チェック
    const answerKeys = Object.keys(application.answers);
    const expectedQuestions = getExpectedQuestions(application.currentStep);
    const missingAnswers = expectedQuestions.filter(qId => !answerKeys.includes(qId));

    return {
      isValid: missingFields.length === 0 && missingAnswers.length === 0,
      application,
      missingFields,
      missingAnswers
    };
  } catch (error) {
    console.error('Error validating application data integrity:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
};

/**
 * データベースの統計情報取得
 */
export const getDatabaseStats = async () => {
  try {
    // ユーザー数
    const usersQuery = query(collection(db, COLLECTIONS.USERS));
    const usersSnapshot = await getDocs(usersQuery);
    const userCount = usersSnapshot.size;

    // 申請書数
    const applicationsQuery = query(collection(db, COLLECTIONS.APPLICATIONS));
    const applicationsSnapshot = await getDocs(applicationsQuery);
    const applicationCount = applicationsSnapshot.size;

    // 完了済み申請書数
    const completedQuery = query(
      collection(db, COLLECTIONS.APPLICATIONS),
      where('status', '==', 'completed')
    );
    const completedSnapshot = await getDocs(completedQuery);
    const completedCount = completedSnapshot.size;

    // ポイントトランザクション数
    const transactionsQuery = query(collection(db, COLLECTIONS.POINT_TRANSACTIONS));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactionCount = transactionsSnapshot.size;

    return {
      userCount,
      applicationCount,
      completedCount,
      transactionCount,
      completionRate: applicationCount > 0 ? (completedCount / applicationCount) * 100 : 0
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
};

/**
 * データベースのクリーンアップ（開発用）
 * 注意: 本番環境では使用しないでください
 */
export const cleanupDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database cleanup is not allowed in production');
  }

  try {
    console.log('Starting database cleanup...');
    
    // 各コレクションの全ドキュメントを削除
    const collections = [
      COLLECTIONS.USERS,
      COLLECTIONS.POINT_TRANSACTIONS,
      COLLECTIONS.APPLICATIONS,
      COLLECTIONS.PAYMENT_HISTORY
    ];

    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`Cleaned up ${collectionName}: ${snapshot.size} documents`);
    }

    console.log('Database cleanup completed');
    return true;
  } catch (error) {
    console.error('Error during database cleanup:', error);
    throw error;
  }
};

/**
 * 期待される質問リストの取得
 * @param {number} currentStep - 現在のステップ
 */
const getExpectedQuestions = (currentStep) => {
  const allQuestions = {
    1: ['Q1-1', 'Q1-2', 'Q1-3'],
    2: ['Q2-0', 'Q2-1', 'Q2-2', 'Q2-3', 'Q2-4', 'Q2-5', 'Q2-6', 'Q2-7-1', 'Q2-7-2', 'Q2-7-3', 'Q2-8', 'Q2-9'],
    3: ['Q3-1', 'Q3-2', 'Q3-3', 'Q3-4', 'Q3-5', 'Q3-6', 'Q3-7'],
    4: ['Q4-1', 'Q4-2', 'Q4-3', 'Q4-4', 'Q4-5', 'Q4-6', 'Q4-7', 'Q4-8', 'Q4-9', 'Q4-10', 'Q4-11'],
    5: ['Q5-1', 'Q5-2', 'Q5-3', 'Q5-4', 'Q5-5', 'Q5-6', 'Q5-7', 'Q5-8', 'Q5-9', 'Q5-10', 'Q5-11', 'Q5-12', 'Q5-13', 'Q5-14']
  };

  const questions = [];
  for (let step = 1; step <= currentStep; step++) {
    if (allQuestions[step]) {
      questions.push(...allQuestions[step]);
    }
  }

  return questions;
};

/**
 * データベースのバックアップ作成（将来実装）
 */
export const createDatabaseBackup = async () => {
  // TODO: データベースバックアップ機能の実装
  console.log('Database backup feature not yet implemented');
  return false;
};

/**
 * データベースの復元（将来実装）
 */
export const restoreDatabase = async (backupData) => {
  // TODO: データベース復元機能の実装
  console.log('Database restore feature not yet implemented');
  return false;
};
