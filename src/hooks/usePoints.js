import { useState, useEffect } from 'react';
import { 
  getUser, 
  updateUserPoints, 
  addPointTransaction, 
  getUserPointHistory 
} from '../services/firestore/collections';
import { useAuth } from '../contexts/AuthContext';
import { POINT_CONSTANTS } from '../utils/constants';

export const usePoints = () => {
  const { currentUser: user } = useAuth();
  const [pointBalance, setPointBalance] = useState(0);
  const [pointHistory, setPointHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ユーザー情報とポイント履歴を取得
  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      setPointBalance(0);
      setPointHistory([]);
      setLoading(false);
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await getUser(user.uid);
      if (userData) {
        setPointBalance(userData.pointBalance || 0);
      }

      const history = await getUserPointHistory(user.uid);
      setPointHistory(history);

    } catch (err) {
      setError(err.message);
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ポイント消費
  const consumePoints = async (amount, description) => {
    console.log('[usePoints] consumePoints called:', { amount, description, user: user?.uid, pointBalance });

    if (!user) {
      console.error('[usePoints] User not authenticated');
      throw new Error('User not authenticated');
    }

    if (pointBalance < amount) {
      console.error('[usePoints] Insufficient points:', { required: amount, current: pointBalance });
      throw new Error('Insufficient points');
    }

    try {
      setLoading(true);
      setError(null);

      const newBalance = pointBalance - amount;
      console.log('[usePoints] Consuming points:', { old: pointBalance, amount, new: newBalance });

      // ユーザーのポイント残高を更新
      await updateUserPoints(user.uid, newBalance);
      console.log('[usePoints] User points updated in Firestore');

      // トランザクション記録を追加
      await addPointTransaction(user.uid, 'consume', amount, description);
      console.log('[usePoints] Transaction added to Firestore');

      // ローカル状態を更新
      setPointBalance(newBalance);
      console.log('[usePoints] Local state updated');

      // 履歴を更新
      const newTransaction = {
        id: Date.now().toString(),
        userId: user.uid,
        type: 'consume',
        amount: -amount,
        description,
        timestamp: new Date()
      };
      setPointHistory(prev => [newTransaction, ...prev]);

      console.log('[usePoints] Consume points successful');
      return true;
    } catch (err) {
      console.error('[usePoints] Error consuming points:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ポイント購入
  const purchasePoints = async (amount, stripePaymentId) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      const newBalance = pointBalance + amount;
      
      // ユーザーのポイント残高を更新
      await updateUserPoints(user.uid, newBalance);
      
      // トランザクション記録を追加
      await addPointTransaction(user.uid, 'purchase', amount, 'ポイント購入');
      
      // ローカル状態を更新
      setPointBalance(newBalance);
      
      // 履歴を更新
      const newTransaction = {
        id: Date.now().toString(),
        userId: user.uid,
        type: 'purchase',
        amount: amount,
        description: 'ポイント購入',
        timestamp: new Date()
      };
      setPointHistory(prev => [newTransaction, ...prev]);

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ポイント付与（管理者用）
  const grantPoints = async (amount, description) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      const newBalance = pointBalance + amount;
      
      // ユーザーのポイント残高を更新
      await updateUserPoints(user.uid, newBalance);
      
      // トランザクション記録を追加
      await addPointTransaction(user.uid, 'grant', amount, description);
      
      // ローカル状態を更新
      setPointBalance(newBalance);
      
      // 履歴を更新
      const newTransaction = {
        id: Date.now().toString(),
        userId: user.uid,
        type: 'grant',
        amount: amount,
        description,
        timestamp: new Date()
      };
      setPointHistory(prev => [newTransaction, ...prev]);

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ポイント残高チェック
  const checkPointBalance = (requiredPoints) => {
    return {
      hasEnoughPoints: pointBalance >= requiredPoints,
      remainingPoints: pointBalance - requiredPoints,
      insufficientPoints: Math.max(0, requiredPoints - pointBalance)
    };
  };

  // 質問のポイントコスト取得
  const getQuestionCost = (questionId) => {
    return POINT_CONSTANTS.QUESTION_COSTS[questionId] || 0;
  };

  // ポイント履歴のフィルタリング
  const getFilteredHistory = (type = null, limit = 50) => {
    let filtered = pointHistory;
    
    if (type) {
      filtered = filtered.filter(transaction => transaction.type === type);
    }
    
    return filtered.slice(0, limit);
  };

  // 月間ポイント使用量の計算
  const getMonthlyUsage = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = pointHistory.filter(transaction => {
      const transactionDate = transaction.timestamp.toDate();
      return transactionDate >= startOfMonth && transaction.type === 'consume';
    });
    
    return monthlyTransactions.reduce((total, transaction) => {
      return total + Math.abs(transaction.amount);
    }, 0);
  };

  // ポイント使用統計
  const getUsageStats = () => {
    const consumeTransactions = pointHistory.filter(t => t.type === 'consume');
    const purchaseTransactions = pointHistory.filter(t => t.type === 'purchase');
    const grantTransactions = pointHistory.filter(t => t.type === 'grant');
    
    const totalConsumed = consumeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalPurchased = purchaseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalGranted = grantTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalConsumed,
      totalPurchased,
      totalGranted,
      netBalance: totalPurchased + totalGranted - totalConsumed
    };
  };

  // データのリフレッシュ
  const refresh = async () => {
    if (user) {
      await fetchUserData();
    }
  };

  return {
    // 状態
    pointBalance,
    pointHistory,
    loading,
    error,

    // アクション
    consumePoints,
    purchasePoints,
    grantPoints,
    refresh,

    // ユーティリティ
    checkPointBalance,
    getQuestionCost,
    getFilteredHistory,
    getMonthlyUsage,
    getUsageStats
  };
};
