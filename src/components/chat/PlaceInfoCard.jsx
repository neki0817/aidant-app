import React, { useState } from 'react';
import './PlaceInfoCard.css';

/**
 * Google Placesから取得した店舗情報を表示するカード
 */
const PlaceInfoCard = ({ placeData, onEdit, showEditButton = true }) => {
  const [showHours, setShowHours] = useState(false);

  if (!placeData) {
    return null;
  }

  const {
    name,
    address,
    phoneNumber,
    website,
    rating,
    userRatingsTotal,
    openingHours,
    photoUrl,
    types,
    businessStatus
  } = placeData;

  // 営業ステータスの表示
  const getBusinessStatusText = (status) => {
    switch (status) {
      case 'OPERATIONAL':
        return '営業中';
      case 'CLOSED_TEMPORARILY':
        return '一時休業中';
      case 'CLOSED_PERMANENTLY':
        return '閉業';
      default:
        return '不明';
    }
  };

  // 店舗タイプを日本語に変換（主要なもののみ）
  const translateType = (type) => {
    const typeMap = {
      'restaurant': 'レストラン',
      'cafe': 'カフェ',
      'bar': 'バー',
      'bakery': 'ベーカリー',
      'meal_takeaway': 'テイクアウト',
      'food': '飲食店',
      'store': '店舗',
      'establishment': '施設'
    };
    return typeMap[type] || type;
  };

  const primaryType = types && types.length > 0 ? translateType(types[0]) : '';

  return (
    <div className="place-info-card">
      <div className="place-info-header">
        <h3>取得した店舗情報</h3>
        {showEditButton && (
          <button onClick={onEdit} className="place-info-edit-button">
            修正する
          </button>
        )}
      </div>

      <div className="place-info-content">
        {photoUrl && (
          <div className="place-info-photo">
            <img src={photoUrl} alt={name} />
          </div>
        )}

        <div className="place-info-details">
          <div className="place-info-item">
            <label>店舗名</label>
            <p className="place-info-name">{name}</p>
          </div>

          {primaryType && (
            <div className="place-info-item">
              <label>業種</label>
              <p>{primaryType}</p>
            </div>
          )}

          <div className="place-info-item">
            <label>住所</label>
            <p>{address}</p>
          </div>

          {phoneNumber && (
            <div className="place-info-item">
              <label>電話番号</label>
              <p>{phoneNumber}</p>
            </div>
          )}

          {website && (
            <div className="place-info-item">
              <label>ウェブサイト</label>
              <p>
                <a href={website} target="_blank" rel="noopener noreferrer">
                  リンクを開く
                </a>
              </p>
            </div>
          )}

          {rating > 0 && (
            <div className="place-info-item">
              <label>評価</label>
              <p>
                <span className="place-info-rating">★ {rating.toFixed(1)}</span>
                {userRatingsTotal > 0 && (
                  <span className="place-info-rating-count">
                    （{userRatingsTotal}件）
                  </span>
                )}
              </p>
            </div>
          )}

          {openingHours && Array.isArray(openingHours.weekdayText) && openingHours.weekdayText.length > 0 && (
            <div className="place-info-item">
              <label>営業時間</label>
              <button
                className="place-info-hours-toggle"
                onClick={() => setShowHours(!showHours)}
              >
                {showHours ? '▼ 非表示' : '▶ 表示'}
              </button>
              {showHours && (
                <div className="place-info-hours">
                  {openingHours.weekdayText.map((text, index) => (
                    <p key={index}>{text}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="place-info-item">
            <label>営業ステータス</label>
            <p className={`place-info-status ${businessStatus.toLowerCase()}`}>
              {getBusinessStatusText(businessStatus)}
            </p>
          </div>
        </div>
      </div>

      <div className="place-info-footer">
        <small>※ この情報はGoogle Mapsから取得されています。</small>
      </div>
    </div>
  );
};

export default PlaceInfoCard;
