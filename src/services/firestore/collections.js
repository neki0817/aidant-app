// Firestoreコレクション構造定義
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';

// Firestoreインスタンスの取得
const firestore = db;

// デバッグ用：Firestoreインスタンスの確認
console.log('Collections firestore instance:', firestore);

// コレクション名定数
export const COLLECTIONS = {
  USERS: 'users',
  POINT_TRANSACTIONS: 'point_transactions',
  APPLICATIONS: 'applications',
  PAYMENT_HISTORY: 'payment_history'
};

// ===========================================
// users コレクション
// ===========================================

/**
 * ユーザー情報の作成
 * @param {string} userId - ユーザーID（ドキュメントID）
 * @param {string} email - メールアドレス
 * @param {number} initialPoints - 初期ポイント（デフォルト: 5000）
 */
export const createUser = async (userId, email, initialPoints = 5000) => {
  try {
    const userData = {
      userId,
      email,
      pointBalance: initialPoints,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // ドキュメントIDとしてuserIdを使用
    await setDoc(doc(firestore, COLLECTIONS.USERS, userId), userData);
    
    // 初期ポイント付与のトランザクション記録
    await addPointTransaction(userId, 'grant', initialPoints, '新規登録');
    
    return userData;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * ユーザー情報の取得
 * @param {string} userId - ユーザーID（ドキュメントID）
 */
export const getUser = async (userId) => {
  try {
    const userDocRef = doc(firestore, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

/**
 * ユーザーのポイント残高更新
 * @param {string} userId - ユーザーID（ドキュメントID）
 * @param {number} newBalance - 新しいポイント残高
 */
export const updateUserPoints = async (userId, newBalance) => {
  try {
    const userDocRef = doc(firestore, COLLECTIONS.USERS, userId);
    await updateDoc(userDocRef, {
      pointBalance: newBalance,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user points:', error);
    throw error;
  }
};

// ===========================================
// point_transactions コレクション
// ===========================================

/**
 * ポイントトランザクションの追加
 * @param {string} userId - ユーザーID
 * @param {string} type - トランザクションタイプ ('grant' | 'consume' | 'purchase')
 * @param {number} amount - ポイント数（正の値）
 * @param {string} description - 説明
 */
export const addPointTransaction = async (userId, type, amount, description) => {
  try {
    const transactionData = {
      userId,
      type,
      amount: type === 'consume' ? -amount : amount, // 消費の場合は負の値
      description,
      timestamp: new Date()
    };

    await addDoc(collection(firestore, COLLECTIONS.POINT_TRANSACTIONS), transactionData);
    return transactionData;
  } catch (error) {
    console.error('Error adding point transaction:', error);
    throw error;
  }
};

/**
 * ユーザーのポイント履歴取得
 * @param {string} userId - ユーザーID
 * @param {number} limitCount - 取得件数制限（デフォルト: 50）
 */
export const getUserPointHistory = async (userId, limitCount = 50) => {
  try {
    const transactionsQuery = query(
      collection(firestore, COLLECTIONS.POINT_TRANSACTIONS),
      where('userId', '==', userId),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(transactionsQuery);
    
    // クライアント側でソート
    const transactions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return transactions.sort((a, b) => {
      const aTime = a.timestamp?.toDate?.() || new Date(0);
      const bTime = b.timestamp?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting point history:', error);
    throw error;
  }
};

// ===========================================
// applications コレクション
// ===========================================

/**
 * 申請書の作成
 * @param {string} userId - ユーザーID
 * @param {string} industry - 業種
 */
export const createApplication = async (userId, industry = '飲食') => {
  try {
    const applicationData = {
      userId,
      industry,
      status: 'draft',
      currentStep: 1,
      answers: {},
      placeInfo: null,
      marketData: null,
      generatedDocument: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(firestore, COLLECTIONS.APPLICATIONS), applicationData);
    return { id: docRef.id, ...applicationData };
  } catch (error) {
    console.error('Error creating application:', error);
    throw error;
  }
};

/**
 * 申請書の取得
 * @param {string} applicationId - 申請書ID
 */
export const getApplication = async (applicationId) => {
  try {
    const docRef = doc(firestore, COLLECTIONS.APPLICATIONS, applicationId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('Error getting application:', error);
    throw error;
  }
};

/**
 * ユーザーの申請書一覧取得
 * @param {string} userId - ユーザーID
 */
export const getUserApplications = async (userId) => {
  try {
    const applicationsQuery = query(
      collection(firestore, COLLECTIONS.APPLICATIONS),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(applicationsQuery);
    
    // クライアント側でソート
    const applications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return applications.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting user applications:', error);
    throw error;
  }
};

/**
 * 申請書の回答更新
 * @param {string} applicationId - 申請書ID
 * @param {string} questionId - 質問ID
 * @param {any} answer - 回答内容
 */
export const updateApplicationAnswer = async (applicationId, questionId, answer) => {
  try {
    const docRef = doc(firestore, COLLECTIONS.APPLICATIONS, applicationId);
    
    await updateDoc(docRef, {
      [`answers.${questionId}`]: answer,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating application answer:', error);
    throw error;
  }
};

/**
 * 申請書のステップ更新
 * @param {string} applicationId - 申請書ID
 * @param {number} step - ステップ番号
 */
export const updateApplicationStep = async (applicationId, step) => {
  try {
    const docRef = doc(firestore, COLLECTIONS.APPLICATIONS, applicationId);
    
    await updateDoc(docRef, {
      currentStep: step,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating application step:', error);
    throw error;
  }
};

/**
 * 申請書の店舗情報更新
 * @param {string} applicationId - 申請書ID
 * @param {object} placeInfo - 店舗情報
 */
export const updateApplicationPlaceInfo = async (applicationId, placeInfo) => {
  try {
    const docRef = doc(firestore, COLLECTIONS.APPLICATIONS, applicationId);
    
    await updateDoc(docRef, {
      placeInfo,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating place info:', error);
    throw error;
  }
};

/**
 * 申請書の市場データ更新
 * @param {string} applicationId - 申請書ID
 * @param {object} marketData - 市場データ
 */
export const updateApplicationMarketData = async (applicationId, marketData) => {
  try {
    const docRef = doc(firestore, COLLECTIONS.APPLICATIONS, applicationId);
    
    await updateDoc(docRef, {
      marketData,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating market data:', error);
    throw error;
  }
};

/**
 * 申請書の生成文書更新
 * @param {string} applicationId - 申請書ID
 * @param {object} generatedDocument - 生成された文書
 */
export const updateApplicationGeneratedDocument = async (applicationId, generatedDocument) => {
  try {
    const docRef = doc(firestore, COLLECTIONS.APPLICATIONS, applicationId);
    
    await updateDoc(docRef, {
      generatedDocument,
      status: 'completed',
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating generated document:', error);
    throw error;
  }
};

// ===========================================
// payment_history コレクション
// ===========================================

/**
 * 決済履歴の追加
 * @param {string} userId - ユーザーID
 * @param {string} stripePaymentId - Stripe決済ID
 * @param {number} amount - 決済金額（円）
 * @param {number} pointsPurchased - 購入ポイント数
 */
export const addPaymentHistory = async (userId, stripePaymentId, amount, pointsPurchased) => {
  try {
    const paymentData = {
      userId,
      stripePaymentId,
      amount,
      pointsPurchased,
      status: 'succeeded',
      createdAt: new Date()
    };

    await addDoc(collection(firestore, COLLECTIONS.PAYMENT_HISTORY), paymentData);
    return paymentData;
  } catch (error) {
    console.error('Error adding payment history:', error);
    throw error;
  }
};

/**
 * ユーザーの決済履歴取得
 * @param {string} userId - ユーザーID
 */
export const getUserPaymentHistory = async (userId) => {
  try {
    const paymentsQuery = query(
      collection(firestore, COLLECTIONS.PAYMENT_HISTORY),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(paymentsQuery);
    
    // クライアント側でソート
    const payments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return payments.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    throw error;
  }
};
