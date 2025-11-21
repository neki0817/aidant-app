import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import './StoreProfileEditor.css';

/**
 * 店舗プロフィール編集コンポーネント
 *
 * Google MapsとWebサイトから自動生成された店舗情報を表示し、
 * ユーザーが編集・確認できるUI
 */
const StoreProfileEditor = ({ googleMapsData, websiteUrl, onSave, onCancel }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);

  // プロフィール生成
  useEffect(() => {
    const generateProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const functions = getFunctions(undefined, 'asia-northeast1');
        const generateStoreProfile = httpsCallable(functions, 'generateStoreProfile');

        // WebサイトURLの取得（優先順位: 手動入力 > Google Maps）
        const finalWebsiteUrl = websiteUrl || googleMapsData.website || '';

        console.log('[StoreProfileEditor] Calling generateStoreProfile with:', {
          googleMapsData,
          websiteUrl: finalWebsiteUrl
        });

        const result = await generateStoreProfile({
          googleMapsData,
          websiteUrl: finalWebsiteUrl
        });

        console.log('[StoreProfileEditor] Profile generated:', result.data);

        setProfile(result.data.profile);
      } catch (err) {
        console.error('[StoreProfileEditor] Error generating profile:', err);
        setError('店舗プロフィールの生成に失敗しました。もう一度お試しください。');
      } finally {
        setIsLoading(false);
      }
    };

    generateProfile();
  }, [googleMapsData, websiteUrl]);

  // フィールド編集ハンドラー
  const handleFieldEdit = (fieldName, value) => {
    setProfile({
      ...profile,
      [fieldName]: value
    });
    setEditingField(null);
  };

  // 配列フィールド編集ハンドラー
  const handleArrayFieldEdit = (fieldName, index, value) => {
    const newArray = [...profile[fieldName]];
    newArray[index] = value;
    setProfile({
      ...profile,
      [fieldName]: newArray
    });
  };

  // 配列アイテム追加
  const handleArrayItemAdd = (fieldName) => {
    setProfile({
      ...profile,
      [fieldName]: [...profile[fieldName], '']
    });
  };

  // 配列アイテム削除
  const handleArrayItemRemove = (fieldName, index) => {
    const newArray = profile[fieldName].filter((_, i) => i !== index);
    setProfile({
      ...profile,
      [fieldName]: newArray
    });
  };

  // 確認完了
  const handleConfirm = () => {
    onSave(profile);
  };

  if (isLoading) {
    return (
      <div className="store-profile-loading">
        <div className="spinner"></div>
        <p>店舗プロフィールを作成中...</p>
        <p className="loading-sub">Google MapsとWebサイトの情報を分析しています</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="store-profile-error">
        <p>❌ {error}</p>
        <p className="error-help">プロフィール生成をスキップして、手動で入力することもできます。</p>
        <div className="error-actions">
          <button onClick={onCancel} className="btn-secondary">
            戻る
          </button>
          <button onClick={() => onSave(null)} className="btn-primary">
            スキップして続ける
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="store-profile-editor">
      <h3 className="profile-title">📋 店舗プロフィール</h3>
      <p className="profile-subtitle">
        Google MapsとWebサイトから自動で作成しました。間違いがあれば修正してください。
      </p>

      {/* 基本情報 */}
      <Section title="基本情報">
        <EditableField
          label="店舗名"
          value={profile.businessName}
          editing={editingField === 'businessName'}
          onEdit={() => setEditingField('businessName')}
          onSave={(val) => handleFieldEdit('businessName', val)}
          onCancel={() => setEditingField(null)}
        />
        <EditableField
          label="業種"
          value={profile.businessType}
          editing={editingField === 'businessType'}
          onEdit={() => setEditingField('businessType')}
          onSave={(val) => handleFieldEdit('businessType', val)}
          onCancel={() => setEditingField(null)}
        />
        <EditableSelectField
          label="法人形態"
          value={profile.corporateType}
          options={['法人', '個人事業主', '不明']}
          editing={editingField === 'corporateType'}
          onEdit={() => setEditingField('corporateType')}
          onSave={(val) => handleFieldEdit('corporateType', val)}
          onCancel={() => setEditingField(null)}
        />
        {profile.corporateType === '法人' && (
          <EditableField
            label="法人名"
            value={profile.companyName || ''}
            editing={editingField === 'companyName'}
            onEdit={() => setEditingField('companyName')}
            onSave={(val) => handleFieldEdit('companyName', val)}
            onCancel={() => setEditingField(null)}
            placeholder="例：株式会社〇〇"
          />
        )}
      </Section>

      {/* 商品・サービス */}
      <Section title="商品・サービス">
        <EditableListField
          items={profile.products}
          onEdit={(index, val) => handleArrayFieldEdit('products', index, val)}
          onAdd={() => handleArrayItemAdd('products')}
          onRemove={(index) => handleArrayItemRemove('products', index)}
        />
      </Section>

      {/* 強み・特徴 */}
      <Section title="強み・特徴">
        <EditableListField
          items={profile.strengths}
          onEdit={(index, val) => handleArrayFieldEdit('strengths', index, val)}
          onAdd={() => handleArrayItemAdd('strengths')}
          onRemove={(index) => handleArrayItemRemove('strengths', index)}
        />
      </Section>

      {/* 顧客層 */}
      <Section title="顧客層">
        <EditableListField
          items={profile.targetCustomers}
          onEdit={(index, val) => handleArrayFieldEdit('targetCustomers', index, val)}
          onAdd={() => handleArrayItemAdd('targetCustomers')}
          onRemove={(index) => handleArrayItemRemove('targetCustomers', index)}
        />
      </Section>

      {/* 営業情報 */}
      <Section title="営業情報">
        <Field label="営業日" value={profile.operatingDays} />
        <EditableField
          label="客単価（推定）"
          value={`${profile.estimatedPrice}円`}
          editing={editingField === 'estimatedPrice'}
          onEdit={() => setEditingField('estimatedPrice')}
          onSave={(val) => handleFieldEdit('estimatedPrice', parseInt(val.replace('円', '')))}
          onCancel={() => setEditingField(null)}
          type="number"
          suffix="円"
        />
      </Section>

      {/* 口コミ評価 */}
      <Section title="口コミ評価">
        <Field label="評価" value={`★${profile.rating} (${profile.reviewCount}件)`} />
        <div className="review-highlights">
          {profile.reviewHighlights.map((highlight, index) => (
            <span key={index} className="highlight-badge">
              {highlight}
            </span>
          ))}
        </div>
      </Section>

      {/* 情報源 */}
      <div className="profile-source">
        情報源: Google Maps{websiteUrl ? '、Webサイト' : ''}
      </div>

      {/* アクションボタン */}
      <div className="profile-actions">
        <button onClick={onCancel} className="btn-secondary">
          キャンセル
        </button>
        <button onClick={handleConfirm} className="btn-primary">
          ✅ 確認完了
        </button>
      </div>
    </div>
  );
};

// セクションコンポーネント
const Section = ({ title, children }) => (
  <div className="profile-section">
    <h4 className="section-title">{title}</h4>
    <div className="section-content">{children}</div>
  </div>
);

// 読み取り専用フィールド
const Field = ({ label, value }) => (
  <div className="profile-field">
    <div className="field-label">{label}</div>
    <div className="field-value">{value}</div>
  </div>
);

// 編集可能フィールド
const EditableField = ({
  label,
  value,
  editing,
  onEdit,
  onSave,
  onCancel,
  type = 'text',
  placeholder = '',
  suffix = ''
}) => {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  if (editing) {
    return (
      <div className="profile-field editing">
        <div className="field-label">{label}</div>
        <div className="field-edit">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
          {suffix && <span className="field-suffix">{suffix}</span>}
          <div className="edit-actions">
            <button onClick={() => onSave(editValue)} className="btn-save">
              保存
            </button>
            <button onClick={onCancel} className="btn-cancel">
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-field">
      <div className="field-label">{label}</div>
      <div className="field-value" onClick={onEdit}>
        {value} <span className="edit-icon">✏️</span>
      </div>
    </div>
  );
};

// 選択式編集可能フィールド
const EditableSelectField = ({
  label,
  value,
  options,
  editing,
  onEdit,
  onSave,
  onCancel
}) => {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  if (editing) {
    return (
      <div className="profile-field editing">
        <div className="field-label">{label}</div>
        <div className="field-edit">
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="edit-actions">
            <button onClick={() => onSave(editValue)} className="btn-save">
              保存
            </button>
            <button onClick={onCancel} className="btn-cancel">
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-field">
      <div className="field-label">{label}</div>
      <div className="field-value" onClick={onEdit}>
        {value} <span className="edit-icon">✏️</span>
      </div>
    </div>
  );
};

// リスト編集可能フィールド
const EditableListField = ({ items, onEdit, onAdd, onRemove }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditValue(items[index]);
  };

  const handleSave = () => {
    onEdit(editingIndex, editValue);
    setEditingIndex(null);
    setEditValue('');
  };

  return (
    <div className="list-field">
      {items.map((item, index) => (
        <div key={index} className="list-item">
          {editingIndex === index ? (
            <div className="list-item-edit">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
              <button onClick={handleSave} className="btn-save-small">
                保存
              </button>
              <button
                onClick={() => setEditingIndex(null)}
                className="btn-cancel-small"
              >
                キャンセル
              </button>
            </div>
          ) : (
            <div className="list-item-view">
              <span className="list-bullet">•</span>
              <span className="list-text" onClick={() => handleEdit(index)}>
                {item} <span className="edit-icon-small">✏️</span>
              </span>
              <button
                onClick={() => onRemove(index)}
                className="btn-remove"
                title="削除"
              >
                ×
              </button>
            </div>
          )}
        </div>
      ))}
      <button onClick={onAdd} className="btn-add-item">
        + 追加
      </button>
    </div>
  );
};

export default StoreProfileEditor;
