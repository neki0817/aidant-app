import React, { useState, useEffect } from 'react';
import PlaceAutocomplete from './PlaceAutocomplete';
import PlaceInfoCard from './PlaceInfoCard';
import './QuestionInput.css';

const QuestionInput = ({ question, onAnswer, isLoading, previousAnswer, onGoBack, canGoBack, suggestedAnswer, allAnswers = {} }) => {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [placeData, setPlaceData] = useState(null);
  const [otherText, setOtherText] = useState(''); // 「その他」の具体的な内容

  useEffect(() => {
    // 質問が変わったら状態をリセット
    setInputValue('');
    setIsValid(false);
    setPlaceData(null);
    setOtherText('');

    // place_confirmタイプの場合は、previousAnswerをセット
    if (question && question.type === 'place_confirm' && previousAnswer) {
      setPlaceData(previousAnswer);
      setIsValid(true);
    }

    // suggestedAnswerがある場合は初期値として設定
    if (suggestedAnswer) {
      setInputValue(suggestedAnswer);
      setIsValid(true); // 推測値があれば送信可能
    }
  }, [question, previousAnswer, suggestedAnswer]);

  useEffect(() => {
    // バリデーション
    validateInput();
  }, [inputValue, question, placeData, otherText]);

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
        // 経常利益の質問はマイナス値も許容
        const isProfit = question.id && question.id.includes('-profit');
        if (isProfit) {
          // 経常利益：数値であればOK（マイナスも可）
          setIsValid(!isNaN(parseFloat(inputValue)) && inputValue.trim().length > 0);
        } else {
          // その他の数値：正の数のみ
          setIsValid(!isNaN(parseInt(inputValue)) && parseInt(inputValue) > 0);
        }
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
      .map(i => {
        const option = options[i];
        // optionが{value, label}形式のオブジェクトの場合はvalueを返す
        return typeof option === 'object' && option.value
          ? option.value
          : option;
      });
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
        // 経常利益はマイナス値も許容するためparseFloatを使用
        const isProfitQuestion = question.id && question.id.includes('-profit');
        answer = isProfitQuestion ? parseFloat(inputValue) : parseInt(inputValue, 10);
        break;
      case 'place_search':
      case 'place_confirm':
        // undefinedの値を除外してFirestore互換のオブジェクトに変換
        answer = placeData ? cleanPlaceData(placeData) : null;
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
    setPlaceData(null);
    setOtherText('');
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

  const handleSkip = () => {
    if (isLoading) return;

    // スキップ可能な質問かチェック
    if (question.required === false) {
      onAnswer(question.id, null); // nullを送信してスキップ
      setInputValue('');
      setPlaceData(null);
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
        <>
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
