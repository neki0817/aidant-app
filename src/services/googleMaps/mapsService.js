/**
 * Google Maps API サービス
 * Nearby Search、Place Details、口コミ分析などを提供
 */

/**
 * 周辺の競合店舗を検索
 * @param {Object} location - { lat, lng }
 * @param {string} businessType - 業種タイプ
 * @param {number} radius - 検索半径（メートル）
 * @returns {Promise<Array>} - 競合店舗リスト
 */
export const searchNearbyCompetitors = async (location, businessType, radius = 2000) => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      reject(new Error('Google Maps APIが読み込まれていません'));
      return;
    }

    // ダミーのMap要素を作成（PlacesServiceに必要）
    const mapDiv = document.createElement('div');
    const map = new window.google.maps.Map(mapDiv);
    const service = new window.google.maps.places.PlacesService(map);

    // 業種タイプをGoogle Maps typeにマッピング
    const typeMapping = {
      '飲食店': 'restaurant',
      '小売業': 'store',
      '美容・理容業': 'beauty_salon',
      'サービス業': 'store',
      '建設業・製造業': 'store'
    };

    const placeType = typeMapping[businessType] || 'establishment';

    const request = {
      location: new window.google.maps.LatLng(location.lat, location.lng),
      radius: radius,
      type: [placeType]
    };

    console.log('[Nearby Search] Request:', request);

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        console.log('[Nearby Search] Found', results.length, 'competitors');

        // 自店舗を除外し、評価順にソート
        const competitors = results
          .filter(place => {
            // place_idで除外できる場合は除外
            return place.business_status === 'OPERATIONAL';
          })
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 10) // 上位10件
          .map(place => ({
            place_id: place.place_id,
            name: place.name,
            address: place.vicinity,
            rating: place.rating || 0,
            user_ratings_total: place.user_ratings_total || 0,
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            types: place.types || [],
            photos: place.photos ? place.photos.map(photo => ({
              url: photo.getUrl({ maxWidth: 400 })
            })) : []
          }));

        resolve(competitors);
      } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        console.log('[Nearby Search] No results found');
        resolve([]);
      } else {
        console.error('[Nearby Search] Error:', status);
        reject(new Error(`Nearby Search failed: ${status}`));
      }
    });
  });
};

/**
 * Place Detailsを取得（口コミ含む）
 * @param {string} placeId - Place ID
 * @returns {Promise<Object>} - 詳細情報
 */
export const getPlaceDetails = async (placeId) => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      reject(new Error('Google Maps APIが読み込まれていません'));
      return;
    }

    const mapDiv = document.createElement('div');
    const map = new window.google.maps.Map(mapDiv);
    const service = new window.google.maps.places.PlacesService(map);

    const request = {
      placeId: placeId,
      fields: [
        'name',
        'formatted_address',
        'formatted_phone_number',
        'rating',
        'user_ratings_total',
        'reviews', // 口コミ
        'opening_hours',
        'website',
        'photos',
        'types',
        'geometry'
      ]
    };

    console.log('[Place Details] Request for:', placeId);

    service.getDetails(request, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        console.log('[Place Details] Success:', place.name);

        const details = {
          place_id: placeId,
          name: place.name,
          address: place.formatted_address,
          phone: place.formatted_phone_number,
          rating: place.rating || 0,
          user_ratings_total: place.user_ratings_total || 0,
          website: place.website,
          types: place.types || [],
          reviews: (place.reviews || []).map(review => ({
            author_name: review.author_name,
            rating: review.rating,
            text: review.text,
            time: review.time,
            relative_time_description: review.relative_time_description
          })),
          opening_hours: place.opening_hours ? {
            weekday_text: place.opening_hours.weekday_text || [],
            open_now: place.opening_hours.open_now
          } : null,
          location: place.geometry ? {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          } : null,
          photos: place.photos ? place.photos.slice(0, 5).map(photo => ({
            url: photo.getUrl({ maxWidth: 800 })
          })) : []
        };

        resolve(details);
      } else {
        console.error('[Place Details] Error:', status);
        reject(new Error(`Place Details failed: ${status}`));
      }
    });
  });
};

/**
 * 口コミからキーワードを抽出（シンプルな頻度分析）
 * @param {Array} reviews - 口コミリスト
 * @returns {Array} - キーワードと頻度
 */
export const extractKeywordsFromReviews = (reviews) => {
  // ポジティブなキーワードのみを抽出
  const positiveKeywords = [
    '美味しい', 'おいしい', 'うまい', '最高', '素晴らしい', '良い', 'よい',
    '親切', '丁寧', '優しい', '親身', 'フレンドリー', '笑顔',
    '清潔', 'きれい', '綺麗', '清潔感', '居心地', '雰囲気',
    '安い', 'お得', 'コスパ', 'リーズナブル', '手頃',
    '早い', '速い', 'スピーディ', '迅速',
    '新鮮', 'こだわり', '手作り', 'オリジナル', '独自',
    '豊富', '充実', '品揃え', 'メニュー', '種類',
    'おすすめ', 'お勧め', 'オススメ', '人気', '評判',
    '満足', '大満足', 'また', 'リピート', '常連'
  ];

  const keywordCount = {};

  reviews.forEach(review => {
    const text = review.text || '';

    positiveKeywords.forEach(keyword => {
      // キーワードが含まれているかチェック
      const regex = new RegExp(keyword, 'g');
      const matches = text.match(regex);
      if (matches) {
        keywordCount[keyword] = (keywordCount[keyword] || 0) + matches.length;
      }
    });
  });

  // 頻度順にソート
  const sortedKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // 上位10件
    .map(([keyword, count]) => ({
      keyword,
      count,
      percentage: Math.round((count / reviews.length) * 100)
    }));

  console.log('[Keyword Extraction] Found', sortedKeywords.length, 'keywords');
  return sortedKeywords;
};

/**
 * 口コミから強みの文章を生成
 * @param {Array} keywords - キーワードリスト
 * @param {string} businessName - 店舗名
 * @returns {string} - 強みの文章
 */
export const generateStrengthsFromKeywords = (keywords, businessName = '当店') => {
  if (!keywords || keywords.length === 0) {
    return '口コミから特徴的なキーワードは見つかりませんでした。';
  }

  const top3 = keywords.slice(0, 3);

  const strengthsText = `${businessName}の強みは、お客様の口コミから以下の点が高く評価されています:\n\n` +
    top3.map((kw, i) => `${i + 1}. 「${kw.keyword}」（${kw.count}件の言及）`).join('\n') +
    `\n\nその他、${keywords.slice(3, 6).map(k => `「${k.keyword}」`).join('、')}なども好評です。`;

  return strengthsText;
};

/**
 * 競合店舗の情報を取得（詳細情報含む）
 * @param {Array} competitors - 競合リスト
 * @param {number} limit - 取得件数制限
 * @returns {Promise<Array>} - 詳細情報付き競合リスト
 */
export const getCompetitorsWithDetails = async (competitors, limit = 5) => {
  const limitedCompetitors = competitors.slice(0, limit);

  const promises = limitedCompetitors.map(async (competitor) => {
    try {
      const details = await getPlaceDetails(competitor.place_id);
      return {
        ...competitor,
        ...details
      };
    } catch (error) {
      console.error('[Competitor Details] Error for', competitor.name, error);
      return competitor; // エラー時は基本情報のみ
    }
  });

  const results = await Promise.all(promises);
  console.log('[Competitors with Details] Retrieved', results.length, 'competitors');
  return results;
};
