import React, { useState } from 'react';
import { useApplication } from '../../contexts/ApplicationContext';
import { SalesChart, GoalChart, EffectChart } from './SalesChart';
import './ApplicationDocument.css';

const ApplicationDocument = ({ onBack }) => {
  const {
    generatedDocument,
    generateApplication,
    loading,
    isApplicationComplete,
    answers
  } = useApplication();

  const [isGenerating, setIsGenerating] = useState(false);

  // 売上・利益データを抽出
  const extractChartData = () => {
    if (!answers) return null;

    // 売上推移データ
    const sales1 = parseInt(answers['Q2-7-1']) || 0;
    const sales2 = parseInt(answers['Q2-7-2']) || 0;
    const sales3 = parseInt(answers['Q2-7-3']) || 0;

    // 決算月から年度を計算
    const fiscalMonth = answers['Q2-4'] || '3月';
    const currentYear = new Date().getFullYear();

    const salesData = [
      { year: `${currentYear - 2}年度`, sales: sales1, profit: Math.round(sales1 * 0.08) },
      { year: `${currentYear - 1}年度`, sales: sales2, profit: Math.round(sales2 * 0.10) },
      { year: `${currentYear}年度`, sales: sales3, profit: Math.round(sales3 * 0.10) }
    ];

    // 目標データ（仮の計算）
    const targetSales = Math.round(sales3 * 1.25);
    const targetProfit = Math.round(targetSales * 0.14);

    // 効果内訳
    const effects = [
      { category: '新規顧客獲得', amount: 432 },
      { category: 'リピート率向上', amount: 100 },
      { category: '営業時間外予約', amount: 288 },
      { category: 'コスト削減', amount: 110 }
    ];

    return {
      salesData,
      currentSales: sales3,
      targetSales,
      currentProfit: Math.round(sales3 * 0.10),
      targetProfit,
      effects
    };
  };

  const chartData = extractChartData();

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await generateApplication();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDocument) return;

    const element = document.createElement('a');
    const file = new Blob([generatedDocument.content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `補助金申請書_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const canGenerate = isApplicationComplete();

  return (
    <div className="application-document">
      <div className="document-header">
        <div className="header-top">
          {onBack && (
            <button onClick={onBack} className="back-button">
              ← 質問に戻る
            </button>
          )}
          <h2>小規模事業者持続化補助金 申請書</h2>
        </div>
        {generatedDocument && (
          <div className="document-info">
            <span>生成日時: {new Date(generatedDocument.generatedAt).toLocaleString('ja-JP')}</span>
            <span>AI モデル: {generatedDocument.model}</span>
          </div>
        )}
      </div>

      {!generatedDocument ? (
        <div className="document-placeholder">
          <p>全ての質問に回答すると、Gemini AIが申請書を自動生成します。</p>
          {canGenerate ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || loading}
              className="generate-button"
            >
              {isGenerating || loading ? (
                <>
                  <span className="spinner"></span>
                  申請書を生成中...
                </>
              ) : (
                '申請書を生成する'
              )}
            </button>
          ) : (
            <p className="warning">全ての質問に回答してください</p>
          )}
        </div>
      ) : (
        <div className="document-content">
          <div className="document-actions">
            <button onClick={handleGenerate} disabled={isGenerating || loading} className="regenerate-button">
              {isGenerating || loading ? '再生成中...' : '再生成'}
            </button>
            <button onClick={handleDownload} className="download-button">
              ダウンロード
            </button>
          </div>

          <div className="document-body">
            {chartData && (
              <div className="charts-section">
                <h3>📊 データで見る事業計画</h3>

                <div className="chart-container">
                  <SalesChart salesData={chartData.salesData} />
                </div>

                <div className="chart-row">
                  <div className="chart-container half">
                    <GoalChart
                      currentSales={chartData.currentSales}
                      targetSales={chartData.targetSales}
                      currentProfit={chartData.currentProfit}
                      targetProfit={chartData.targetProfit}
                    />
                  </div>
                  <div className="chart-container half">
                    <EffectChart effects={chartData.effects} />
                  </div>
                </div>
              </div>
            )}

            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(generatedDocument.content) }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// 簡易的なMarkdownレンダラー
const renderMarkdown = (markdown) => {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/<\/p><p><h/g, '</p><h')
    .replace(/<\/h([1-3])><\/p>/g, '</h$1>');
};

export default ApplicationDocument;
