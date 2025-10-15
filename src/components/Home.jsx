import React from 'react';
import { useAuth } from '../contexts/AuthContext';

// 仮のホーム画面（後でメイン画面に置き換える）
const Home = () => {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>ログイン成功！</h1>

        <div style={styles.info}>
          <p style={styles.infoText}>
            <strong>メールアドレス:</strong> {currentUser?.email}
          </p>
          <p style={styles.infoText}>
            <strong>ポイント:</strong> {currentUser?.points || 0}pt
          </p>
        </div>

        <button onClick={handleLogout} style={styles.button}>
          ログアウト
        </button>

        <p style={styles.note}>
          ※ これは仮のホーム画面です。後でメイン画面に置き換えます。
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '500px',
    textAlign: 'center'
  },
  title: {
    color: '#28a745',
    marginBottom: '30px'
  },
  info: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '4px',
    marginBottom: '30px'
  },
  infoText: {
    fontSize: '16px',
    margin: '10px 0',
    textAlign: 'left'
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#dc3545',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  note: {
    marginTop: '30px',
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
  }
};

export default Home;
