import React from 'react';
import './MessageBubble.css';

const MessageBubble = ({ message, onAnswer, isLoading }) => {
  const { type, text, question, answer, timestamp } = message;

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 選択肢を番号付きリストで表示
  const renderOptions = () => {
    if (!question || !question.options || question.options.length === 0) {
      return null;
    }

    const isMultiSelect = question.type === 'multi_select';

    return (
      <div className="question-options-list">
        {question.options.map((option, index) => {
          // optionが{value, label}形式のオブジェクトの場合はlabelを表示
          const displayText = typeof option === 'object' && option.label
            ? option.label
            : option;

          return (
            <div key={index} className="option-item">
              <span className="option-number">{index + 1}.</span>
              <span className="option-text">{displayText}</span>
            </div>
          );
        })}
        <div className="input-hint">
          {isMultiSelect
            ? '💡 複数選択可（例: 1,3,5）'
            : '💡 番号を入力してください（例: 1）'}
        </div>
      </div>
    );
  };

  // 回答例を表示
  const renderExamples = () => {
    if (!question || !question.examples || question.examples.length === 0) {
      return null;
    }

    return (
      <div className="answer-examples">
        <div className="examples-label">回答例：</div>
        {question.examples.map((example, index) => (
          <div key={index} className="example-bubble">
            {example}
          </div>
        ))}
      </div>
    );
  };

  // ヘルプテキストを表示
  const renderHelpText = () => {
    if (!question || !question.helpText) {
      return null;
    }

    return (
      <div className="help-text">
        {question.helpText.split('\n').map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    );
  };

  // ここでの入力UIは使用しない（QuestionInputで一元管理）
  const renderQuestionContent = () => null;

  const renderUserAnswer = () => {
    if (!answer) return null;

    // 配列の場合
    if (Array.isArray(answer)) {
      return (
        <div className="user-answer">
          <strong>選択した項目:</strong>
          <ul>
            {answer.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      );
    }

    // オブジェクト（店舗情報など）の場合
    if (typeof answer === 'object' && answer !== null) {
      // 店舗情報の場合（nameフィールドがあれば店舗情報と判定）
      if (answer.name) {
        return (
          <div className="user-answer">
            <strong>選択した店舗:</strong> {answer.name}
            {answer.address && (
              <div style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
                {answer.address}
              </div>
            )}
          </div>
        );
      }
      // その他のオブジェクトの場合はJSON表示
      return (
        <div className="user-answer">
          <strong>回答:</strong> {JSON.stringify(answer)}
        </div>
      );
    }

    // 文字列や数値の場合
    return (
      <div className="user-answer">
        <strong>回答:</strong> {answer}
      </div>
    );
  };

  return (
    <div className={`message-bubble ${type}`}>
      <div className="message-content">
        {type === 'ai' && (
          <div className="ai-avatar">
            <span>🤖</span>
          </div>
        )}
        
        <div className="message-body">
          <div className="message-text">
            {text}
            {type === 'user' && renderUserAnswer()}
          </div>

          {/* AIメッセージの場合に選択肢・回答例・ヘルプテキストを表示 */}
          {type === 'ai' && renderOptions()}
          {type === 'ai' && renderExamples()}
          {type === 'ai' && renderHelpText()}

          <div className="message-timestamp">
            {formatTimestamp(timestamp)}
          </div>
        </div>
        
        {type === 'user' && (
          <div className="user-avatar">
            <span>👤</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
