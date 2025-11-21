import React, { useEffect, useRef, useState } from 'react';
import './PlaceAutocomplete.css';

/**
 * Google Places Autocompleteを使った店舗検索コンポーネント
 * Places API（従来版）を使用
 */
const PlaceAutocomplete = ({ onPlaceSelected, defaultValue = '' }) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Google Maps APIスクリプトが既に読み込まれているかチェック
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps already loaded, skipping script load');
      setScriptLoaded(true);
      setIsLoading(false);
      return;
    }

    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      setError('Google Maps APIキーが設定されていません');
      setIsLoading(false);
      return;
    }

    console.log('Loading Google Maps API with key:', apiKey.substring(0, 10) + '...');

    // 既にスクリプトタグが存在するかチェック
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Script tag already exists, waiting for load...');
      existingScript.addEventListener('load', () => {
        console.log('Existing script loaded');
        setScriptLoaded(true);
        setIsLoading(false);
      });
      return;
    }

    // コールバック関数名をユニークにする
    const callbackName = 'initGoogleMapsPlaces_' + Date.now();

    window[callbackName] = () => {
      console.log('Google Maps API loaded successfully');
      setScriptLoaded(true);
      setIsLoading(false);
      delete window[callbackName];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ja&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error('Failed to load Google Maps API:', e);
      setError('Google Maps APIの読み込みに失敗しました。APIキーとネットワーク接続を確認してください。');
      setIsLoading(false);
      delete window[callbackName];
    };

    document.head.appendChild(script);

    return () => {
      if (window[callbackName]) {
        delete window[callbackName];
      }
    };
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !inputRef.current) {
      console.log('Waiting for script or input:', { scriptLoaded, hasInput: !!inputRef.current });
      return;
    }

    try {
      console.log('Initializing Autocomplete...');
      console.log('Input element:', inputRef.current);

      // Autocompleteインスタンスを作成
      const autocompleteOptions = {
        componentRestrictions: { country: 'jp' },
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'address_components',
          'geometry',
          'formatted_phone_number',
          'opening_hours',
          'rating',
          'user_ratings_total',
          'photos',
          'types',
          'website',
          'business_status'
        ],
        types: ['establishment']
      };

      console.log('Autocomplete options:', autocompleteOptions);

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        autocompleteOptions
      );

      console.log('Autocomplete instance created:', autocompleteRef.current);

      // 場所が選択されたときのイベントリスナー
      const listener = autocompleteRef.current.addListener('place_changed', () => {
        console.log('place_changed event triggered');
        const place = autocompleteRef.current.getPlace();
        console.log('Selected place:', place);

        if (!place || !place.place_id) {
          console.log('No valid place selected');
          return;
        }

        // Place Details APIで口コミを取得
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        const request = {
          placeId: place.place_id,
          fields: ['reviews', 'priceLevel']
        };

        service.getDetails(request, (placeDetails, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            console.log('Place details retrieved:', placeDetails);
            // 口コミと価格帯を抽出
            const reviews = placeDetails.reviews || [];
            const priceLevel = placeDetails.priceLevel;
            processPlaceData(place, reviews, priceLevel);
          } else {
            console.warn('Failed to get place details:', status);
            processPlaceData(place, [], undefined);
          }
        });
      });

      // 場所データを処理する関数
      const processPlaceData = (place, reviews, priceLevel) => {

        // 住所コンポーネントから詳細情報を抽出
        const addressComponents = place.address_components || [];
        const getAddressComponent = (type) => {
          const component = addressComponents.find(c => c.types.includes(type));
          return component ? component.long_name : '';
        };

        // 写真URLを取得
        let photoUrl = null;
        if (place.photos && place.photos.length > 0) {
          try {
            photoUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 400 });
          } catch (err) {
            console.warn('Failed to get photo URL:', err);
          }
        }

        // 整形したデータを親コンポーネントに渡す
        const placeData = {
          placeId: place.place_id,
          name: place.name || '',
          address: place.formatted_address || '',
          addressComponents: {
            postalCode: getAddressComponent('postal_code') || '',
            prefecture: getAddressComponent('administrative_area_level_1') || '',
            city: getAddressComponent('locality') || getAddressComponent('administrative_area_level_2') || '',
            ward: getAddressComponent('sublocality_level_1') || '',
            street: (getAddressComponent('sublocality_level_2') || '') + (getAddressComponent('sublocality_level_3') || ''),
            building: getAddressComponent('premise') || ''
          },
          location: place.geometry && place.geometry.location ? {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          } : { lat: 0, lng: 0 },
          phoneNumber: place.formatted_phone_number || '',
          website: place.website || '',
          rating: place.rating || 0,
          userRatingsTotal: place.user_ratings_total || 0,
          priceLevel: priceLevel,
          openingHours: place.opening_hours && place.opening_hours.weekday_text ? {
            weekdayText: place.opening_hours.weekday_text || []
          } : { weekdayText: [] },
          photoUrl: photoUrl || '',
          types: place.types || [],
          businessStatus: place.business_status || 'OPERATIONAL',
          reviews: reviews.map(review => ({
            rating: review.rating,
            text: review.text,
            authorName: review.author_name,
            relativeTime: review.relative_time_description,
            time: review.time
          }))
        };

        console.log('Processed place data with reviews:', placeData);
        onPlaceSelected(placeData);
      };

      console.log('Autocomplete initialized successfully');
      console.log('Event listener attached:', listener);

      // クリーンアップ
      return () => {
        if (listener) {
          window.google.maps.event.removeListener(listener);
        }
      };
    } catch (err) {
      console.error('Autocomplete initialization error:', err);
      setError('検索機能の初期化に失敗しました: ' + err.message);
    }
  }, [scriptLoaded, onPlaceSelected]);

  if (error) {
    return (
      <div className="place-autocomplete-error">
        <p>❌ {error}</p>
        <small>
          以下を確認してください：<br/>
          ✓ Google Cloud ConsoleでMaps JavaScript APIとPlaces APIが有効<br/>
          ✓ APIキーの制限設定（HTTPリファラーなど）<br/>
          ✓ .envファイルのAPIキーが正しい<br/>
          ✓ ブラウザのコンソールでエラー詳細を確認
        </small>
      </div>
    );
  }

  return (
    <div className="place-autocomplete-container">
      <div className="place-autocomplete-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="place-autocomplete-input"
          placeholder="店舗名または住所を入力してください（例：スターバックス 渋谷）"
          defaultValue={defaultValue}
          disabled={isLoading}
          onFocus={() => console.log('Input focused')}
          onBlur={() => console.log('Input blurred')}
          onChange={(e) => console.log('Input changed:', e.target.value)}
        />
        {isLoading && (
          <div className="place-autocomplete-loading">
            <span className="loading-spinner">⏳</span> Google Maps APIを読み込み中...
          </div>
        )}
      </div>
      <small className="place-autocomplete-hint">
        💡 店舗名や住所を入力すると、候補が表示されます
      </small>
      {scriptLoaded && (
        <small style={{ display: 'block', marginTop: '8px', color: '#28a745' }}>
          ✓ Google Maps API読み込み完了
        </small>
      )}
    </div>
  );
};

export default PlaceAutocomplete;
