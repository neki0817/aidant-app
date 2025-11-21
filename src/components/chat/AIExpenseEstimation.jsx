import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import './AIExpenseEstimation.css';

/**
 * AI経費推定コンポーネント
 *
 * 業種と売上から販売費及び一般管理費を自動推定
 */
const AIExpenseEstimation = ({ answers, onComplete }) => {
  const [estimating, setEstimating] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const estimate = async () => {
      try {
        console.log('[AIExpenseEstimation] Starting estimation...');

        // 業種を取得（Q1-1またはQ1-1-manual）
        const businessType = answers['Q1-1-manual'] || answers['Q1-1'] || 'サービス業（その他）';

        // 売上を取得（Q1-8）
        const revenue = parseInt(answers['Q1-8'], 10) || 0;

        console.log('[AIExpenseEstimation] Business type:', businessType);
        console.log('[AIExpenseEstimation] Revenue:', revenue);

        if (revenue === 0) {
          throw new Error('売上データが取得できませんでした');
        }

        // Cloud Functionを呼び出し
        const functions = getFunctions(undefined, 'asia-northeast1');
        const estimateExpenses = httpsCallable(functions, 'estimateExpenses');

        const response = await estimateExpenses({
          businessType,
          revenue,
          employees: 0 // 従業員数は今回使用しない
        });

        console.log('[AIExpenseEstimation] Estimation completed:', response.data);

        setResult(response.data);
        setEstimating(false);

        // 2秒後に自動的に次へ進む
        setTimeout(() => {
          onComplete(response.data);
        }, 3000);

      } catch (err) {
        console.error('[AIExpenseEstimation] Error:', err);
        setError(err.message || 'AI推定に失敗しました');
        setEstimating(false);
      }
    };

    estimate();
  }, [answers, onComplete]);

  // 金額をフォーマット
  const formatNumber = (value) => {
    if (!value) return '0';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 経費カテゴリのラベル
  const categoryLabels = {
    personnel_costs: '人件費（役員報酬＋給料手当）',
    rent: '地代家賃',
    advertising: '広告宣伝費',
    utilities: '水道光熱費',
    communication: '通信費',
    transportation: '旅費交通費',
    supplies: '消耗品費',
    depreciation: '減価償却費',
    insurance: '保険料',
    taxes: '租税公課',
    repairs: '修繕費',
    other: 'その他'
  };

  return (
    <div className="ai-expense-estimation">
      {estimating && (
        <div className="estimating-container">
          <div className="spinner"></div>
          <p className="estimating-text">AIが業種と売上から経費を推定しています...</p>
          <p className="estimating-sub-text">少々お待ちください</p>
        </div>
      )}

      {result && (
        <div className="estimation-result">
          <div className="result-header">
            <h3>✅ AI推定が完了しました</h3>
            <p className="result-message">{result.message}</p>
          </div>

          <div className="result-table-container">
            <table className="result-table">
              <thead>
                <tr>
                  <th className="category-column">経費項目</th>
                  <th className="amount-column">推定金額（万円）</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.estimates).map(([key, value]) => (
                  <tr key={key}>
                    <td className="category-cell">{categoryLabels[key] || key}</td>
                    <td className="amount-cell">{formatNumber(value)} 万円</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td className="category-cell"><strong>合計</strong></td>
                  <td className="amount-cell">
                    <strong className="total-amount">{formatNumber(result.total)} 万円</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="result-notice">
            <p>💡 <strong>推定精度: {result.confidence === 'medium' ? '中' : '高'}</strong></p>
            <p>この推定値は後で修正可能です。様式2作成時に自動的に反映されます。</p>
          </div>

          <div className="auto-progress-notice">
            <p>⏱️ 3秒後に自動的に次の質問に進みます...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-text">エラーが発生しました</p>
          <p className="error-message">{error}</p>
          <button
            className="btn-retry"
            onClick={() => {
              setError(null);
              setEstimating(true);
              window.location.reload();
            }}
          >
            再試行
          </button>
        </div>
      )}
    </div>
  );
};

export default AIExpenseEstimation;
