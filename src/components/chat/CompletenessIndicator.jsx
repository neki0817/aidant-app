/**
 * 完成度インジケーター - 11の評価ポイントの充足度を表示
 *
 * @version 1.0.0
 * @created 2025-01-19
 */

import React, { useState } from 'react';
import './CompletenessIndicator.css';

const CompletenessIndicator = ({ completenessData, onClick }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!completenessData) {
    return null;
  }

  const { overallScore, overallStatus, criteriaDetails, completeCriteria, partialCriteria, missingCriteria } = completenessData;

  // ステータスに応じた色とアイコン
  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent':
        return '#4CAF50'; // 緑
      case 'good':
        return '#8BC34A'; // 黄緑
      case 'acceptable':
        return '#FFC107'; // 黄色
      default:
        return '#FF5722'; // 赤
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent':
        return '🌟';
      case 'good':
        return '✅';
      case 'acceptable':
        return '🟡';
      default:
        return '⚠️';
    }
  };

  const statusColor = getStatusColor(overallStatus);
  const statusIcon = getStatusIcon(overallStatus);

  return (
    <div className="completeness-indicator">
      <div className="completeness-header" onClick={() => setShowDetails(!showDetails)}>
        <div className="completeness-score" style={{ borderColor: statusColor }}>
          <span className="score-number" style={{ color: statusColor }}>
            {overallScore}%
          </span>
          <span className="score-icon">{statusIcon}</span>
        </div>

        <div className="completeness-summary">
          <div className="summary-text">申請書完成度</div>
          <div className="summary-stats">
            <span className="stat-complete">✅ {completeCriteria}</span>
            <span className="stat-partial">🟡 {partialCriteria}</span>
            <span className="stat-missing">❌ {missingCriteria}</span>
          </div>
        </div>

        <div className="expand-icon">{showDetails ? '▲' : '▼'}</div>
      </div>

      {showDetails && (
        <div className="completeness-details">
          <h4>11の評価ポイント詳細</h4>
          {Object.entries(criteriaDetails).map(([key, criterion]) => (
            <div key={key} className={`criterion-item status-${criterion.status}`}>
              <div className="criterion-header">
                <span className="criterion-name">{criterion.name}</span>
                <span className="criterion-score">{criterion.score}%</span>
              </div>
              <div className="criterion-progress">
                <div
                  className="criterion-progress-bar"
                  style={{ width: `${criterion.score}%` }}
                ></div>
              </div>
              {criterion.missingFields.length > 0 && (
                <div className="criterion-missing">
                  <small>不足: {criterion.missingFields.join(', ')}</small>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompletenessIndicator;
