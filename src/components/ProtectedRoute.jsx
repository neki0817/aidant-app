import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 認証が必要なページを保護するコンポーネント
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  // ユーザーがログインしていない場合はログイン画面へリダイレクト
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // ログイン済みの場合は子コンポーネントを表示
  return children;
};

export default ProtectedRoute;
