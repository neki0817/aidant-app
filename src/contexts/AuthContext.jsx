import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';

// デバッグ用：AuthContextでのFirestoreインスタンス確認
console.log('AuthContext firestore instance:', db);

// Contextを作成
const AuthContext = createContext();

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthはAuthProviderの中で使用する必要があります');
  }
  return context;
};

// AuthProviderコンポーネント
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 新規登録
  const register = async (email, password, additionalData = {}) => {
    try {
      // Firebase Authenticationでユーザーを作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestoreのusersコレクションにユーザードキュメントを作成
      await setDoc(doc(db, 'users', user.uid), {
        userId: user.uid,
        email: user.email,
        pointBalance: 5000, // 初期ポイント
        createdAt: new Date(),
        updatedAt: new Date(),
        ...additionalData
      });

      // 初期ポイント付与のトランザクション記録
      await addDoc(collection(db, 'point_transactions'), {
        userId: user.uid,
        type: 'grant',
        amount: 5000,
        description: '新規登録',
        timestamp: new Date()
      });

      return user;
    } catch (error) {
      console.error('登録エラー:', error);
      throw error;
    }
  };

  // ログイン
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ユーザードキュメントが存在するか確認
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      // ドキュメントが存在しない場合は作成（既存ユーザーの救済措置）
      if (!userDoc.exists()) {
        console.log('User document not found. Creating new document for existing user:', user.uid);
        await setDoc(doc(db, 'users', user.uid), {
          userId: user.uid,
          email: user.email,
          pointBalance: 5000, // 初期ポイント
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // 初期ポイント付与のトランザクション記録
        await addDoc(collection(db, 'point_transactions'), {
          userId: user.uid,
          type: 'grant',
          amount: 5000,
          description: '既存ユーザー初回ログイン',
          timestamp: new Date()
        });
      }

      return user;
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  };

  // ユーザー情報を取得
  const getUserData = async (uid) => {
    try {
      console.log('getUserData called with uid:', uid, 'db:', db);
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('ユーザーデータ取得エラー:', error);
      throw error;
    }
  };

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // ユーザー情報をFirestoreから取得
          const userData = await getUserData(user.uid);
          setCurrentUser({ ...user, ...userData });
        } catch (error) {
          console.error('認証状態監視エラー:', error);
          // エラーが発生してもユーザー情報は設定する
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // クリーンアップ
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    register,
    login,
    logout,
    getUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
