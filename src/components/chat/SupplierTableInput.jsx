import React, { useState } from 'react';
import './SupplierTableInput.css';

/**
 * 仕入先・購入先情報の入力コンポーネント
 *
 * 経費明細表に必要な詳細情報を収集
 */
const SupplierTableInput = ({ onSubmit, onCancel, initialItems = [] }) => {
  const [items, setItems] = useState(
    initialItems.length > 0
      ? initialItems
      : [
          {
            id: Date.now(),
            supplierName: '',
            productName: '',
            unitPrice: '',
            quantity: '',
            total: 0
          }
        ]
  );

  const [errors, setErrors] = useState({});

  // 金額をフォーマット（カンマ区切り）
  const formatNumber = (value) => {
    if (!value) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 新しい行を追加
  const addRow = () => {
    const newItem = {
      id: Date.now(),
      supplierName: '',
      productName: '',
      unitPrice: '',
      quantity: '',
      total: 0
    };
    setItems([...items, newItem]);
  };

  // 行を削除
  const removeRow = (id) => {
    if (items.length === 1) {
      alert('最低1つの項目は必要です');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  // 入力値の変更ハンドラ
  const handleChange = (id, field, value) => {
    const updatedItems = items.map(item => {
      if (item.id !== id) return item;

      const newItem = { ...item };

      if (field === 'unitPrice' || field === 'quantity') {
        // 数字のみ許可
        const numericValue = value.replace(/[^0-9]/g, '');
        newItem[field] = numericValue;

        // 合計を自動計算
        const unitPrice = field === 'unitPrice' ? parseInt(numericValue, 10) : parseInt(item.unitPrice, 10);
        const quantity = field === 'quantity' ? parseInt(numericValue, 10) : parseInt(item.quantity, 10);
        newItem.total = (unitPrice || 0) * (quantity || 0);
      } else {
        newItem[field] = value;
      }

      return newItem;
    });

    setItems(updatedItems);

    // エラーをクリア
    if (errors[id]) {
      const newErrors = { ...errors };
      delete newErrors[id];
      setErrors(newErrors);
    }
  };

  // バリデーション
  const validate = () => {
    const newErrors = {};

    items.forEach(item => {
      const itemErrors = {};

      if (!item.supplierName || item.supplierName.trim() === '') {
        itemErrors.supplierName = '仕入先名は必須です';
      }

      if (!item.productName || item.productName.trim() === '') {
        itemErrors.productName = '商品・サービス名は必須です';
      }

      if (!item.unitPrice || parseInt(item.unitPrice, 10) === 0) {
        itemErrors.unitPrice = '単価は必須です';
      }

      if (!item.quantity || parseInt(item.quantity, 10) === 0) {
        itemErrors.quantity = '数量は必須です';
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[item.id] = itemErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 送信ハンドラ
  const handleSubmit = () => {
    if (!validate()) {
      alert('入力内容に誤りがあります。赤字の項目を確認してください。');
      return;
    }

    // データを整形して送信
    const submittedItems = items.map(item => ({
      supplierName: item.supplierName,
      productName: item.productName,
      unitPrice: parseInt(item.unitPrice, 10),
      quantity: parseInt(item.quantity, 10),
      total: item.total
    }));

    // 総合計を計算
    const grandTotal = submittedItems.reduce((sum, item) => sum + item.total, 0);

    onSubmit({
      items: submittedItems,
      grandTotal
    });
  };

  // 総合計を計算
  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  return (
    <div className="supplier-table-input">
      <div className="supplier-input-header">
        <h3>仕入先・購入先情報</h3>
        <p className="supplier-input-description">
          各購入予定のものについて、仕入先（購入先）の情報を入力してください。
          <br />
          見積書がある場合は、その内容を入力してください。
        </p>
      </div>

      <div className="scroll-hint">← 横にスクロールできます →</div>
      <div className="supplier-table-container">
        <table className="supplier-table">
          <thead>
            <tr>
              <th className="supplier-name-column">仕入先名<span className="required-mark">*</span></th>
              <th className="product-name-column">商品・サービス名<span className="required-mark">*</span></th>
              <th className="unit-price-column">単価（円）<span className="required-mark">*</span></th>
              <th className="quantity-column">数量<span className="required-mark">*</span></th>
              <th className="total-column">合計（円）</th>
              <th className="action-column">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={errors[item.id] ? 'error-row' : ''}>
                <td>
                  <input
                    type="text"
                    value={item.supplierName}
                    onChange={(e) => handleChange(item.id, 'supplierName', e.target.value)}
                    placeholder="例：株式会社〇〇"
                    className={`supplier-input ${errors[item.id]?.supplierName ? 'error' : ''}`}
                  />
                  {errors[item.id]?.supplierName && (
                    <span className="error-message">{errors[item.id].supplierName}</span>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) => handleChange(item.id, 'productName', e.target.value)}
                    placeholder="例：POSレジシステム"
                    className={`supplier-input ${errors[item.id]?.productName ? 'error' : ''}`}
                  />
                  {errors[item.id]?.productName && (
                    <span className="error-message">{errors[item.id].productName}</span>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    value={formatNumber(item.unitPrice)}
                    onChange={(e) => handleChange(item.id, 'unitPrice', e.target.value)}
                    placeholder="300000"
                    className={`supplier-input numeric ${errors[item.id]?.unitPrice ? 'error' : ''}`}
                  />
                  {errors[item.id]?.unitPrice && (
                    <span className="error-message">{errors[item.id].unitPrice}</span>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) => handleChange(item.id, 'quantity', e.target.value)}
                    placeholder="1"
                    className={`supplier-input numeric ${errors[item.id]?.quantity ? 'error' : ''}`}
                  />
                  {errors[item.id]?.quantity && (
                    <span className="error-message">{errors[item.id].quantity}</span>
                  )}
                </td>
                <td>
                  <strong className="total-amount">{formatNumber(item.total)} 円</strong>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-remove-row"
                    onClick={() => removeRow(item.id)}
                    disabled={items.length === 1}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4" className="grand-total-label">
                <strong>総合計</strong>
              </td>
              <td colSpan="2" className="grand-total-value">
                <strong className="grand-total-amount">{formatNumber(calculateGrandTotal())} 円</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="supplier-input-footer">
        <button type="button" className="btn-add-row" onClick={addRow}>
          ➕ 行を追加
        </button>

        <p className="help-notice">
          💡 <strong>見積書がない場合</strong>は、おおよその金額で構いません。
        </p>

        <div className="button-group">
          {onCancel && (
            <button type="button" className="btn-cancel" onClick={onCancel}>
              キャンセル
            </button>
          )}
          <button type="button" className="btn-submit" onClick={handleSubmit}>
            入力内容を確定する
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierTableInput;
