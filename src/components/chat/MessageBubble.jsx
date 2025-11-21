import React, { useState, useEffect } from 'react';
import './MessageBubble.css';

const MessageBubble = ({ message, onAnswer, isLoading }) => {
  const { type, text, question, answer, timestamp } = message;
  const [selectedOptions, setSelectedOptions] = useState([]);

  // 質問が変わったら選択をリセット
  useEffect(() => {
    setSelectedOptions([]);
  }, [question?.id]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 選択肢をクリック可能なボタンで表示
  const renderOptions = () => {
    if (!question || !question.options || question.options.length === 0) {
      return null;
    }

    const isMultiSelect = question.type === 'multi_select';

    // single_select または multi_select の場合はクリック可能なボタンを表示
    const isSelectable = question.type === 'single_select' || question.type === 'multi_select';

    if (isSelectable) {
      // ボタンクリック時の処理
      const handleOptionClick = (optionValue) => {
        if (isMultiSelect) {
          // 複数選択の場合はトグル
          setSelectedOptions(prev => {
            if (prev.includes(optionValue)) {
              return prev.filter(v => v !== optionValue);
            } else {
              return [...prev, optionValue];
            }
          });
        } else {
          // 単一選択の場合は即座に送信
          onAnswer(question.id, optionValue);
        }
      };

      // 確定ボタンのクリック処理
      const handleConfirm = () => {
        if (selectedOptions.length > 0) {
          onAnswer(question.id, selectedOptions);
          setSelectedOptions([]);
        }
      };

      return (
        <div className="question-options-buttons">
          {question.options.map((option, index) => {
            const displayText = typeof option === 'object' && option.label
              ? option.label
              : option;
            const optionValue = typeof option === 'object' && option.value
              ? option.value
              : option;
            const isSelected = selectedOptions.includes(optionValue);

            return (
              <button
                key={index}
                className={`option-button ${isSelected ? 'selected' : ''}`}
                onClick={() => handleOptionClick(optionValue)}
                disabled={isLoading}
              >
                {isSelected && '✓ '}
                {displayText}
              </button>
            );
          })}
          {isMultiSelect && (
            <>
              <div className="input-hint">💡 複数選択できます。選択後に「確定」ボタンを押してください</div>
              <button
                className="confirm-selection-button"
                onClick={handleConfirm}
                disabled={isLoading || selectedOptions.length === 0}
              >
                確定（{selectedOptions.length}件選択中）
              </button>
            </>
          )}
        </div>
      );
    }

    // 従来の番号付きリスト表示
    return (
      <div className="question-options-list">
        {question.options.map((option, index) => {
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
    if (!question || !question.examples || !Array.isArray(question.examples) || question.examples.length === 0) {
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

    // helpTextが関数の場合は評価する（answersを渡す）
    let helpTextValue = question.helpText;
    if (typeof question.helpText === 'function') {
      try {
        // answersは現在のコンテキストから取得する必要がある
        // とりあえず空オブジェクトを渡す（後で改善）
        helpTextValue = question.helpText({});
      } catch (error) {
        console.error('Error evaluating helpText function:', error);
        return null;
      }
    }

    // helpTextValueが文字列でない場合はスキップ
    if (typeof helpTextValue !== 'string') {
      return null;
    }

    return (
      <div className="help-text">
        {helpTextValue.split('\n').map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    );
  };

  const renderUserAnswer = () => {
    if (!answer) return null;

    // 配列の場合（複数選択の回答）
    if (Array.isArray(answer)) {
      // 配列を「、」で結合して表示
      return answer.join('、');
    }

    // オブジェクト（店舗情報など）の場合
    if (typeof answer === 'object' && answer !== null) {
      // 店舗情報の場合（nameフィールドがあれば店舗情報と判定）
      if (answer.name) {
        return answer.name;
      }
      // その他のオブジェクトの場合はJSON表示
      return JSON.stringify(answer);
    }

    // 文字列や数値の場合
    return String(answer);
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
            {type === 'user' ? renderUserAnswer() || text : text}
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
