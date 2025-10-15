import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import Home from './components/Home';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* ルート: ログイン済みならHome、未ログインならLogin */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* 新規登録画面 */}
          <Route path="/register" element={<Register />} />

          {/* ログイン画面 */}
          <Route path="/login" element={<Login />} />

          {/* 存在しないパスは / にリダイレクト */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
