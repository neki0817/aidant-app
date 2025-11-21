import React, { useState } from 'react';
import './ManualExpenseInput.css';

/**
 * 販売費及び一般管理費の手動入力コンポーネント
 *
 * 10-12項目の経費を入力するテーブルUI
 */
const ManualExpenseInput = ({ onSubmit, onCancel }) => {
  const [expenses, setExpenses] = useState({
    // 必須項目
    personnel_costs: '', // 人件費（役員報酬＋給料手当）
    rent: '', // 地代家賃

    // 任意項目
    advertising: '', // 広告宣伝費
    utilities: '', // 水道光熱費
    communication: '', // 通信費
    transportation: '', // 旅費交通費
    supplies: '', // 消耗品費
    depreciation: '', // 減価償却費
    insurance: '', // 保険料
    taxes: '', // 租税公課
    repairs: '', // 修繕費
    other: '' // その他
  });

  const [errors, setErrors] = useState({});

  // 経費カテゴリの定義
  const categories = [
    { name: 'personnel_costs', label: '人件費（役員報酬＋給料手当）', required: true, helpText: '従業員への給与、役員報酬の合計' },
    { name: 'rent', label: '地代家賃', required: true, helpText: '店舗・事務所の賃料' },
    { name: 'advertising', label: '広告宣伝費', required: false, helpText: 'チラシ、広告、HP費用など' },
    { name: 'utilities', label: '水道光熱費', required: false, helpText: '電気代、水道代、ガス代' },
    { name: 'communication', label: '通信費', required: false, helpText: '電話代、インターネット代' },
    { name: 'transportation', label: '旅費交通費', required: false, helpText: '交通費、出張費' },
    { name: 'supplies', label: '消耗品費', required: false, helpText: '文具、事務用品など' },
    { name: 'depreciation', label: '減価償却費', required: false, helpText: '設備・機器の減価償却' },
    { name: 'insurance', label: '保険料', required: false, helpText: '火災保険、損害保険など' },
    { name: 'taxes', label: '租税公課', required: false, helpText: '固定資産税、印紙税など' },
    { name: 'repairs', label: '修繕費', required: false, helpText: '設備・建物の修理費' },
    { name: 'other', label: 'その他', required: false, helpText: '上記以外の経費' }
  ];

  // 金額をフォーマット（カンマ区切り）
  const formatNumber = (value) => {
    if (!value) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 入力値の変更ハンドラ
  const handleChange = (name, value) => {
    // 数字とカンマのみ許可
    const numericValue = value.replace(/[^0-9]/g, '');

    setExpenses({
      ...expenses,
      [name]: numericValue
    });

    // エラーをクリア
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  // バリデーション
  const validate = () => {
    const newErrors = {};

    // 必須項目のチェック
    categories.forEach(category => {
      if (category.required && !expenses[category.name]) {
        newErrors[category.name] = '必須項目です';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 送信ハンドラ
  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    // 入力された経費のみを抽出（空欄を除く）
    const submittedExpenses = {};
    Object.keys(expenses).forEach(key => {
      if (expenses[key]) {
        submittedExpenses[key] = parseInt(expenses[key], 10);
      }
    });

    // 合計を計算
    const total = Object.values(submittedExpenses).reduce((sum, value) => sum + value, 0);

    onSubmit({
      ...submittedExpenses,
      total
    });
  };

  // 合計金額を計算
  const calculateTotal = () => {
    return Object.values(expenses).reduce((sum, value) => {
      return sum + (parseInt(value, 10) || 0);
    }, 0);
  };

  return (
    <div className="manual-expense-input">
      <div className="expense-input-header">
        <h3>販売費及び一般管理費の内訳</h3>
        <p className="expense-input-description">
          直近1期（1年間）の金額を入力してください。単位は<strong>万円</strong>です。
        </p>
      </div>

      <div className="expense-table-container">
        <table className="expense-table">
          <thead>
            <tr>
              <th className="category-column">経費項目</th>
              <th className="amount-column">金額（万円）</th>
              <th className="help-column">説明</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.name} className={category.required ? 'required-row' : ''}>
                <td className="category-cell">
                  {category.label}
                  {category.required && <span className="required-mark">*</span>}
                </td>
                <td className="amount-cell">
                  <input
                    type="text"
                    value={formatNumber(expenses[category.name])}
                    onChange={(e) => handleChange(category.name, e.target.value)}
                    placeholder="0"
                    className={`expense-input ${errors[category.name] ? 'error' : ''}`}
                  />
                  {errors[category.name] && (
                    <span className="error-message">{errors[category.name]}</span>
                  )}
                </td>
                <td className="help-cell">
                  <span className="help-text">{category.helpText}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td className="category-cell">
                <strong>合計</strong>
              </td>
              <td className="amount-cell">
                <strong className="total-amount">{formatNumber(calculateTotal())} 万円</strong>
              </td>
              <td className="help-cell"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="expense-input-footer">
        <p className="privacy-notice">
          💡 <strong>必須項目（*）</strong>のみ入力すればOKです。わからない項目は空欄で構いません。
        </p>

        <div className="button-group">
          {onCancel && (
            <button
              type="button"
              className="btn-cancel"
              onClick={onCancel}
            >
              キャンセル
            </button>
          )}
          <button
            type="button"
            className="btn-submit"
            onClick={handleSubmit}
          >
            入力内容を確定する
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualExpenseInput;
