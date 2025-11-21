import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ currentStep, totalSteps = 5 }) => {
  const steps = [
    { number: 1, title: '申請資格', description: '基本情報と資格確認' },
    { number: 2, title: '市場分析', description: '顧客ニーズと市場動向' },
    { number: 3, title: '強み分析', description: '自社の強みと課題' },
    { number: 4, title: '経営目標', description: '方針と今後のプラン' },
    { number: 5, title: '補助事業', description: '具体的な取組内容' }
  ];

  const progressPercentage = (currentStep / totalSteps) * 100;

  // 推定残り時間を計算（各ステップ約4分と仮定）
  const estimatedMinutesPerStep = 4;
  const remainingSteps = totalSteps - currentStep;
  const estimatedMinutesRemaining = remainingSteps * estimatedMinutesPerStep;

  const getEstimatedTimeText = () => {
    if (remainingSteps <= 0) return '完了間近';
    if (estimatedMinutesRemaining < 5) return '約5分';
    return `約${estimatedMinutesRemaining}分`;
  };

  return (
    <div className="progress-container">
      <div className="progress-header">
        <h3>進捗状況</h3>
        <div className="progress-percentage">
          {Math.round(progressPercentage)}%
        </div>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      <div className="steps-container">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`step-item ${
              step.number < currentStep ? 'completed' :
              step.number === currentStep ? 'current' : 'pending'
            }`}
          >
            <div className="step-number">
              {step.number < currentStep ? '✓' : step.number}
            </div>
            <div className="step-content">
              <div className="step-title">{step.title}</div>
              <div className="step-description">{step.description}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="progress-footer">
        <span className="current-step-text">
          Step {currentStep} / {totalSteps}
        </span>
        <span className="estimated-time-text">
          推定残り時間: {getEstimatedTimeText()}
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
