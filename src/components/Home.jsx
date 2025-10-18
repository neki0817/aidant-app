import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../hooks/usePoints';

// 仮のホーム画面（後でメイン画面に置き換える）
const Home = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { pointBalance, grantPoints } = usePoints();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleStartChat = () => {
    navigate('/chat');
  };

  // テスト用：ポイント付与
  const handleGrantTestPoints = async () => {
    try {
      await grantPoints(1000, 'テスト用ポイント付与');
      alert('1000ポイントを付与しました！');
    } catch (error) {
      console.error('ポイント付与エラー:', error);
      alert('ポイント付与に失敗しました');
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
            <strong>ポイント残高:</strong> {pointBalance.toLocaleString()}pt
          </p>
        </div>

        <div style={styles.buttonGroup}>
          <button onClick={handleStartChat} style={styles.primaryButton}>
            補助金申請を開始
          </button>
          <button onClick={handleLogout} style={styles.secondaryButton}>
            ログアウト
          </button>
        </div>

        {/* テスト用ポイント付与ボタン */}
        <div style={styles.testSection}>
          <p style={styles.testLabel}>🧪 テスト機能</p>
          <button onClick={handleGrantTestPoints} style={styles.testButton}>
            +1000pt 付与（テスト用）
          </button>
        </div>

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
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  primaryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#28a745',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#dc3545',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1
  },
  note: {
    marginTop: '30px',
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
  },
  testSection: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#fff3cd',
    borderRadius: '4px',
    border: '1px dashed #ffc107'
  },
  testLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#856404',
    marginBottom: '10px'
  },
  testButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#ffc107',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%'
  }
};

export default Home;
