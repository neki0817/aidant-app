import React, { useState, useEffect } from 'react';
import PlaceAutocomplete from './PlaceAutocomplete';
import PlaceInfoCard from './PlaceInfoCard';
import './QuestionInput.css';

const QuestionInput = ({ question, onAnswer, isLoading, previousAnswer, onGoBack, canGoBack }) => {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [placeData, setPlaceData] = useState(null);

  useEffect(() => {
    // 質問が変わったら状態をリセット
    setInputValue('');
    setIsValid(false);
    setPlaceData(null);

    // place_confirmタイプの場合は、previousAnswerをセット
    if (question && question.type === 'place_confirm' && previousAnswer) {
      setPlaceData(previousAnswer);
      setIsValid(true);
    }
  }, [question, previousAnswer]);

  useEffect(() => {
    // バリデーション
    validateInput();
  }, [inputValue, question, placeData]);

  const validateInput = () => {
    if (!question) {
      setIsValid(false);
      return;
    }

    const { type } = question;

    switch (type) {
      case 'text':
      case 'textarea':
      case 'single_select':
      case 'multi_select':
        setIsValid(inputValue.trim().length > 0);
        break;
      case 'date':
        setIsValid(inputValue.length > 0);
        break;
      case 'number':
        setIsValid(!isNaN(parseInt(inputValue)) && parseInt(inputValue) > 0);
        break;
      case 'place_search':
        setIsValid(placeData !== null);
        break;
      case 'place_confirm':
        setIsValid(placeData !== null);
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
      .map(i => options[i]);
  };

  const handlePlaceSelected = (data) => {
    setPlaceData(data);
    setIsValid(true);
  };

  const handleSubmit = () => {
    if (!isValid || isLoading) return;

    let answer;
    switch (question.type) {
      case 'single_select':
      case 'multi_select':
        // 番号入力をパース
        const selectedItems = parseNumberInput(inputValue);
        if (selectedItems.length === 0) {
          alert('有効な番号を入力してください');
          return;
        }
        answer = question.type === 'single_select' ? selectedItems[0] : selectedItems;
        break;
      case 'text':
      case 'textarea':
      case 'date':
        answer = inputValue.trim();
        break;
      case 'number':
        answer = parseInt(inputValue, 10);
        break;
      case 'place_search':
      case 'place_confirm':
        // undefinedの値を除外してFirestore互換のオブジェクトに変換
        answer = placeData ? cleanPlaceData(placeData) : null;
        break;
      default:
        answer = inputValue;
    }

    onAnswer(question.id, answer);
    // 送信後は入力をクリア
    setInputValue('');
    setPlaceData(null);
    setIsValid(false);
  };

  // undefinedやnullの値を除外する関数
  const cleanPlaceData = (data) => {
    if (!data || typeof data !== 'object') return data;

    const cleaned = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // ネストされたオブジェクトも再帰的にクリーン
          cleaned[key] = cleanPlaceData(value);
        } else if (Array.isArray(value)) {
          // 配列の場合はそのまま
          cleaned[key] = value;
        } else {
          cleaned[key] = value;
        }
      }
    });
    return cleaned;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!question) return null;

  const { type, placeholder, maxLength, helpText } = question;

  // プレースホルダーを質問タイプに応じて設定
  const getPlaceholder = () => {
    if (placeholder) return placeholder;

    switch (type) {
      case 'single_select':
        return '番号を入力（例: 1）';
      case 'multi_select':
        return '番号をカンマ区切りで入力（例: 1,3,5）';
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
      {(type === 'place_search' || type === 'place_confirm') ? (
        <>
          <div className="place-input-area">
            {type === 'place_search' && (
              <PlaceAutocomplete
                onPlaceSelected={handlePlaceSelected}
                defaultValue={placeData?.name || ''}
              />
            )}
            {placeData && (
              <PlaceInfoCard
                placeData={placeData}
                onEdit={() => setPlaceData(null)}
                showEditButton={true}
              />
            )}
          </div>
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
            <button
              className="submit-button-simple full-width"
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              title="送信"
            >
              {isLoading ? '...' : '確認して次へ'}
            </button>
          </div>
        </>
      ) : (
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
        </div>
      )}
    </div>
  );
};

export default QuestionInput;
