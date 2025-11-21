// Q1-0に保存されているGoogle Mapsデータの構造を確認するスクリプト
// 使い方: ブラウザのコンソールで以下を実行
// console.log('Q1-0 data:', answers['Q1-0']);

const exampleQ10Data = {
  // Google Maps APIから直接取得
  placeId: "ChIJ...",
  name: "クレアバッカス",
  address: "東京都渋谷区...",
  rating: 4.5,
  userRatingsTotal: 120,
  openingHours: {
    weekdayText: ["月曜日: 定休日", "火曜日: 18:00-23:00", ...]
  },
  website: "https://example.com",
  types: ["restaurant", "food", "establishment"],
  phoneNumber: "03-1234-5678",
  photoUrl: "https://maps.googleapis.com/...",
  
  // Place Details APIから取得
  reviews: [
    {
      rating: 5,
      text: "とても美味しかったです",
      authorName: "太郎",
      relativeTime: "1週間前",
      time: 1234567890
    },
    // ... 最大5件
  ],
  
  // 本来取得すべきだが現在未取得
  // priceLevel: 3 // 0-4 ($$$ = 高価格帯)
};

console.log('Expected Q1-0 structure:', exampleQ10Data);
