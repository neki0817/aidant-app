import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ currentStep, totalSteps = 5 }) => {
  const steps = [
    { number: 1, title: '業種選択', description: '業種と目的の確認' },
    { number: 2, title: '基本情報', description: '企業概要の入力' },
    { number: 3, title: '店舗情報', description: '店舗データの取得' },
    { number: 4, title: '課題分析', description: '経営課題の分析' },
    { number: 5, title: '事業計画', description: '補助事業の設計' }
  ];

  const progressPercentage = (currentStep / totalSteps) * 100;

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
      </div>
    </div>
  );
};

export default ProgressBar;
