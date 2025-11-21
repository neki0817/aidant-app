import React, { useState, useEffect } from 'react';
import './QuestionInput.css';

const QuestionInput = ({ question, onAnswer, isLoading, previousAnswer, onGoBack, canGoBack, suggestedAnswer, allAnswers = {} }) => {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [otherText, setOtherText] = useState(''); // 「その他」の具体的な内容

  useEffect(() => {
    // 質問が変わったら状態をリセット
    setInputValue('');
    setIsValid(false);
    setOtherText('');

    // suggestedAnswerがある場合は初期値として設定
    if (suggestedAnswer) {
      setInputValue(suggestedAnswer);
      setIsValid(true); // 推測値があれば送信可能
    }
  }, [question, previousAnswer, suggestedAnswer]);

  useEffect(() => {
    // バリデーション
    validateInput();
  }, [inputValue, question, otherText]);

  // 「その他」が選択されているかチェック
  const hasOtherSelected = () => {
    if (!question || !question.options) return false;

    // options内に「その他」が含まれているかチェック（オブジェクト形式にも対応）
    const hasOtherOption = question.options.some(opt => {
      if (typeof opt === 'object' && opt.value) {
        return opt.value === 'その他' || opt.label === 'その他';
      }
      return opt === 'その他';
    });

    if (!hasOtherOption) return false;

    const selectedItems = parseNumberInput(inputValue);
    return selectedItems.includes('その他');
  };

  const validateInput = () => {
    if (!question) {
      setIsValid(false);
      return;
    }

    const { type } = question;

    switch (type) {
      case 'text':
      case 'textarea':
        setIsValid(inputValue.trim().length > 0);
        break;
      case 'single_select':
      case 'multi_select':
      case 'checkboxes':
        // 入力値が存在し、かつ「その他」が選択されている場合はotherTextも必要
        const hasInput = inputValue.trim().length > 0;
        const otherSelected = hasOtherSelected();
        const otherTextValid = !otherSelected || otherText.trim().length > 0;
        setIsValid(hasInput && otherTextValid);
        break;
      case 'date':
        setIsValid(inputValue.length > 0);
        break;
      case 'number':
        // 入力があればOK（数値でなくても質問として受け付ける）
        setIsValid(inputValue.trim().length > 0);
        break;
      default:
        setIsValid(true);
    }
  };

  // 番号入力をパースして選択肢に変換
  const parseNumberInput = (input) => {
    const numbers = input.split(',').map(n => n.trim()).filter(n => n !== '');
    const indices = numbers.map(n => parseInt(n, 10) - 1); // 1-based to 0-based
    const options = question.options || [];

    return indices
      .filter(i => i >= 0 && i < options.length)
      .map(i => {
        const option = options[i];
        // optionが{value, label}形式のオブジェクトの場合はvalueを返す
        return typeof option === 'object' && option.value
          ? option.value
          : option;
      });
  };

  const handleSubmit = () => {
    if (!isValid || isLoading) return;

    let answer;
    switch (question.type) {
      case 'single_select':
      case 'multi_select':
      case 'checkboxes':
        // 番号入力をパース
        const selectedItems = parseNumberInput(inputValue);
        if (selectedItems.length === 0) {
          const maxOption = question.options ? question.options.length : 0;
          alert(`有効な番号を入力してください（1〜${maxOption}の範囲）`);
          return;
        }

        // 「その他」が選択されている場合、具体的な内容を付加
        let finalItems = [...selectedItems];
        if (hasOtherSelected() && otherText.trim().length > 0) {
          // 「その他」を「その他（具体的な内容）」に置き換え
          finalItems = finalItems.map(item =>
            item === 'その他' ? `その他（${otherText.trim()}）` : item
          );
        }

        answer = question.type === 'single_select' ? finalItems[0] : finalItems;
        break;
      case 'text':
      case 'textarea':
      case 'date':
        answer = inputValue.trim();
        break;
      case 'number':
        // 数値として解釈できる場合は数値に変換、できない場合はそのまま（質問として扱う）
        const isProfitQuestion = question.id && question.id.includes('-profit');
        const numValue = isProfitQuestion ? parseFloat(inputValue) : parseInt(inputValue, 10);
        answer = !isNaN(numValue) ? numValue : inputValue.trim();
        break;
      default:
        answer = inputValue;
    }

    // バリデーションチェック
    if (question.validation && typeof question.validation === 'function') {
      const validationResult = question.validation(answer, allAnswers);

      // エラー（申請不可）
      if (!validationResult.isValid) {
        alert(validationResult.message);
        return;
      }

      // 警告（申請可能だが確認が必要）
      if (validationResult.warning) {
        alert(validationResult.warning);
        // 警告は表示するが、回答は続行
      }
    }

    onAnswer(question.id, answer);
    // 送信後は入力をクリア
    setInputValue('');
    setOtherText('');
    setIsValid(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSkip = () => {
    if (isLoading) return;

    // スキップ可能な質問かチェック
    if (question.required === false) {
      onAnswer(question.id, null); // nullを送信してスキップ
      setInputValue('');
      setOtherText('');
      setIsValid(false);
    }
  };

  if (!question) return null;

  // スキップ可能かどうかを判定
  const canSkip = question.required === false;

  const { type, placeholder, maxLength, helpText } = question;

  // プレースホルダーを質問タイプに応じて設定
  const getPlaceholder = () => {
    // placeholderが関数形式の場合は実行して結果を返す
    if (placeholder) {
      if (typeof placeholder === 'function') {
        return placeholder(allAnswers);
      }
      return placeholder;
    }

    switch (type) {
      case 'single_select': {
        const maxOption = question.options ? question.options.length : 0;
        return maxOption > 0 ? `番号を入力（1〜${maxOption}）` : '番号を入力（例: 1）';
      }
      case 'multi_select':
      case 'checkboxes': {
        const maxOption = question.options ? question.options.length : 0;
        return maxOption > 0 ? `番号をカンマ区切りで入力（1〜${maxOption}）` : '番号をカンマ区切りで入力（例: 1,3,5）';
      }
      case 'textarea':
        return '簡潔に記入してください（AIが詳しく補完します）';
      case 'date':
        return '年月を選択';
      case 'number':
        return '数値を入力';
      default:
        return '回答を入力してください';
    }
  };

  return (
    <div className="question-input-simple">
      {/* Phase 2 確認画面 */}
      {question.isConfirmation ? (
        <div className="phase2-confirmation">
          <div className="consolidated-text">
            {question.consolidatedText || question.text}
          </div>
          <div className="confirmation-actions">
            <button
              className="btn-confirm-yes"
              onClick={() => onAnswer(question.id, 'yes')}
              disabled={isLoading}
            >
              はい、これで進める
            </button>
            <button
              className="btn-confirm-no"
              onClick={() => onAnswer(question.id, 'no')}
              disabled={isLoading}
            >
              修正する
            </button>
          </div>
        </div>
      ) : question.isEdit ? (
        /* Phase 2 修正画面 */
        <div className="phase2-edit">
          <textarea
            className="edit-textarea"
            defaultValue={question.placeholder || ''}
            onChange={(e) => setInputValue(e.target.value)}
            rows={5}
            disabled={isLoading}
            placeholder="修正内容を入力してください"
          />
          <button
            className="btn-save-edit"
            onClick={() => onAnswer(question.id, inputValue)}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? '保存中...' : '保存して次へ'}
          </button>
        </div>
      ) : type === 'welcome' ? (
        // ウェルカムメッセージ用の「始める」ボタン
        <div className="input-row">
          <button
            className="submit-button-simple full-width welcome-button"
            onClick={() => onAnswer(question.id, 'started')}
            disabled={isLoading}
            title="開始する"
          >
            始める
          </button>
        </div>
      ) : (
        <>
          {/* 選択肢質問（single_select, multi_select）は入力フィールドを表示しない（ボタンで選択） */}
          {!(type === 'single_select' || type === 'multi_select') && (
            <div className="input-row">
              {canGoBack && (
                <button
                  className="back-button-simple"
                  onClick={onGoBack}
                  disabled={isLoading}
                  title="前の質問に戻る"
                >
                  ←
                </button>
              )}

              {type === 'textarea' ? (
                <textarea
                  className="input-field-simple textarea-simple"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={getPlaceholder()}
                  maxLength={maxLength || 300}
                  rows={3}
                  disabled={isLoading}
                />
              ) : type === 'date' ? (
                <input
                  type="month"
                  className="input-field-simple"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
                />
              ) : (
                <input
                  type={type === 'number' ? 'number' : 'text'}
                  className="input-field-simple"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={getPlaceholder()}
                  disabled={isLoading}
                />
              )}

              <button
                className="submit-button-simple"
                onClick={handleSubmit}
                disabled={!isValid || isLoading}
                title="送信"
              >
                {isLoading ? '...' : '送信'}
              </button>

              {canSkip && (
                <button
                  className="skip-button-simple"
                  onClick={handleSkip}
                  disabled={isLoading}
                  title="この質問をスキップ"
                >
                  スキップ
                </button>
              )}
            </div>
          )}

          {/* 「その他」が選択された場合の追加入力欄 */}
          {hasOtherSelected() && (
            <div className="other-input-area">
              <label className="other-input-label">「その他」の具体的な内容を入力してください</label>
              <input
                type="text"
                className="input-field-simple other-input-field"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="例: スマートロック導入、顧客管理システムなど"
                disabled={isLoading}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuestionInput;
