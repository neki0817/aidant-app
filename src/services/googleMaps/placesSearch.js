/**
 * Google Maps Places API を使用して店舗情報を検索
 */

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

let isLoaded = false;
let service = null;

/**
 * Google Maps Places APIの初期化
 */
const initializeGoogleMaps = async () => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API キーが設定されていません');
  }

  if (isLoaded) {
    return true;
  }

  try {
    // スクリプトタグで直接読み込む方式
    if (!window.google || !window.google.maps) {
      await loadGoogleMapsScript();
    }

    isLoaded = true;
    return true;
  } catch (error) {
    console.error('Google Maps API の読み込みエラー:', error);
    throw error;
  }
};

/**
 * Google Maps APIスクリプトを読み込む
 */
const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    // 既に読み込まれている場合
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // 既にスクリプトタグがある場合は削除
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=ja`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('[Google Maps] Script loaded successfully');
      resolve();
    };

    script.onerror = (error) => {
      console.error('[Google Maps] Script load error:', error);
      reject(new Error('Google Maps APIの読み込みに失敗しました'));
    };

    document.head.appendChild(script);
  });
};

/**
 * テキスト検索で店舗情報を取得
 * @param {string} searchQuery - 検索クエリ（店舗名 + 住所など）
 * @param {boolean} returnMultiple - 複数候補を返すかどうか（デフォルト: false）
 * @returns {Promise<Object|Array>} - 店舗情報または候補のリスト
 */
export const searchPlaceByText = async (searchQuery, returnMultiple = false) => {
  try {
    console.log('[Google Maps Search] Starting search for:', searchQuery, 'returnMultiple:', returnMultiple);

    // Google Maps API初期化
    await initializeGoogleMaps();

    // PlacesServiceを初期化（document.createElement('div')を使用）
    if (!service) {
      const google = window.google;
      const dummyElement = document.createElement('div');
      service = new google.maps.places.PlacesService(dummyElement);
    }

    // テキスト検索を実行
    const request = {
      query: searchQuery,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'geometry',
        'rating',
        'user_ratings_total',
        'types',
        'opening_hours',
        'reviews',
        'formatted_phone_number',
        'website'
      ]
    };

    return new Promise((resolve, reject) => {
      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          console.log('[Google Maps Search] Found', results.length, 'results');

          // 複数候補を返す場合
          if (returnMultiple && results.length > 1) {
            const candidates = results.slice(0, 5).map(place => ({
              place_id: place.place_id,
              name: place.name,
              address: place.formatted_address,
              rating: place.rating || null,
              userRatingsTotal: place.user_ratings_total || 0
            }));
            console.log('[Google Maps Search] Returning', candidates.length, 'candidates');
            resolve({ multiple: true, candidates });
            return;
          }

          // 単一の結果を返す場合
          const place = results[0];
          console.log('[Google Maps Search] Found place:', place);

          // Place Details APIで詳細情報を取得
          getPlaceDetails(place.place_id)
            .then(detailedPlace => resolve(detailedPlace))
            .catch(error => reject(error));
        } else {
          console.error('[Google Maps Search] No results found:', status);
          reject(new Error('店舗情報が見つかりませんでした。店舗名や住所を確認してください。'));
        }
      });
    });
  } catch (error) {
    console.error('[Google Maps Search] Error:', error);
    throw error;
  }
};

/**
 * Place IDから詳細情報を取得
 * @param {string} placeId - Google Maps Place ID
 * @returns {Promise<Object>} - 詳細な店舗情報
 */
export const getPlaceDetails = async (placeId) => {
  try {
    console.log('[Place Details] Fetching details for:', placeId);

    // Google Maps API初期化
    await initializeGoogleMaps();

    // PlacesServiceを初期化
    if (!service) {
      const google = window.google;
      const dummyElement = document.createElement('div');
      service = new google.maps.places.PlacesService(dummyElement);
    }

    const request = {
      placeId: placeId,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'geometry',
        'rating',
        'user_ratings_total',
        'types',
        'opening_hours',
        'reviews',
        'formatted_phone_number',
        'website',
        'photos'
      ]
    };

    return new Promise((resolve, reject) => {
      service.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          console.log('[Place Details] Details retrieved:', place);

          // 必要な情報を整形
          const placeData = {
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            location: {
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng()
            },
            rating: place.rating || null,
            userRatingsTotal: place.user_ratings_total || 0,
            types: place.types || [],
            openingHours: place.opening_hours ? {
              weekdayText: place.opening_hours.weekday_text || [],
              periods: place.opening_hours.periods || [],
              isOpen: place.opening_hours.isOpen?.() || null
            } : null,
            reviews: place.reviews ? place.reviews.map(review => ({
              author: review.author_name,
              rating: review.rating,
              text: review.text,
              time: review.time
            })) : [],
            phoneNumber: place.formatted_phone_number || null,
            website: place.website || null,
            photos: place.photos ? place.photos.map(photo => photo.getUrl({ maxWidth: 400 })) : []
          };

          resolve(placeData);
        } else {
          console.error('[Place Details] Error:', status);
          reject(new Error('詳細情報の取得に失敗しました'));
        }
      });
    });
  } catch (error) {
    console.error('[Place Details] Error:', error);
    throw error;
  }
};

/**
 * 複数候補の中から選択させる（オートコンプリート用）
 * @param {string} input - 入力テキスト
 * @returns {Promise<Array>} - 候補のリスト
 */
export const getPlacePredictions = async (input) => {
  try {
    console.log('[Autocomplete] Getting predictions for:', input);

    // Google Maps API初期化
    await initializeGoogleMaps();

    const google = window.google;
    const autocompleteService = new google.maps.places.AutocompleteService();

    return new Promise((resolve, reject) => {
      autocompleteService.getPlacePredictions(
        {
          input: input,
          componentRestrictions: { country: 'jp' } // 日本のみ
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            console.log('[Autocomplete] Predictions:', predictions);
            resolve(predictions);
          } else {
            console.error('[Autocomplete] Error:', status);
            resolve([]);
          }
        }
      );
    });
  } catch (error) {
    console.error('[Autocomplete] Error:', error);
    return [];
  }
};
