/**
 * 架空店舗プロフィール（AI vs AI会話シミュレーション用）
 *
 * 各プロフィールは以下の情報を含む:
 * - name: 店舗名
 * - businessType: 業種
 * - location: 立地
 * - feature: 特徴・こだわり
 * - customerBase: 主な顧客層
 * - rating: Google Maps評価（5点満点）
 * - reviewCount: レビュー件数
 * - yearsInBusiness: 営業年数
 * - monthlySales: 月間売上（万円）
 * - employees: 従業員数
 * - annualSales: 年間売上（万円）
 * - annualProfit: 年間営業利益（万円）
 * - subsidy_goal: 補助金の目的
 * - challenges: 現在の課題
 */

const mockStoreProfiles = [
  // 1. カフェ（自家焙煎コーヒー）- 成功店舗
  {
    id: 'cafe_bluemountain',
    name: '珈琲館ブルーマウンテン',
    businessType: 'カフェ',
    location: '東京都渋谷区（駅徒歩5分）',
    feature: '自家焙煎コーヒーと手作りケーキ、落ち着いた雰囲気',
    customerBase: '30-40代女性、近隣オフィスワーカー、コーヒー愛好家',
    rating: 4.5,
    reviewCount: 150,
    yearsInBusiness: 3,
    monthlySales: 120,
    annualSales: 1440,
    annualProfit: 240,
    employees: 2,
    subsidy_goal: 'オンライン販売サイト構築と焙煎機の増強',
    challenges: [
      '遠方からの問い合わせが多いがオンライン販売がない',
      '焙煎機が古く、大量注文に対応できない',
      'SNSでの口コミ増加に対応しきれていない'
    ],
    strengths: [
      'Google Maps評価4.5点と高評価',
      '自家焙煎による豆の品質へのこだわり',
      'リピート率70%'
    ]
  },

  // 2. ラーメン店（家系）- 課題あり店舗
  {
    id: 'ramen_yokohama',
    name: '横浜家系ラーメン 壱番亭',
    businessType: 'ラーメン店',
    location: '神奈川県横浜市（駅徒歩10分）',
    feature: '濃厚豚骨醤油スープ、極太麺、チャーシュー自家製',
    customerBase: '20-40代男性、近隣住民、学生',
    rating: 4.2,
    reviewCount: 80,
    yearsInBusiness: 2,
    monthlySales: 90,
    annualSales: 1080,
    annualProfit: 150,
    employees: 3,
    subsidy_goal: '券売機導入とSNS広告強化',
    challenges: [
      '駅から遠く、新規顧客が少ない',
      '現金のみ対応で客単価が低い',
      'ランチタイムは混むが夜は空いている'
    ],
    strengths: [
      'チャーシューの評判が良い（口コミ多数）',
      'ボリュームが多いと好評',
      '学生向け割引で固定客がいる'
    ]
  },

  // 3. イタリアン（高級路線）- 成長店舗
  {
    id: 'italian_bellavista',
    name: 'Trattoria Bellavista（トラットリア ベラヴィスタ）',
    businessType: 'イタリアンレストラン',
    location: '東京都港区（駅直結ビル3階）',
    feature: '本格イタリアン、シェフはイタリア修業経験あり、ワインセラー完備',
    customerBase: '30-50代夫婦、記念日利用、接待利用',
    rating: 4.7,
    reviewCount: 220,
    yearsInBusiness: 5,
    monthlySales: 250,
    annualSales: 3000,
    annualProfit: 450,
    employees: 5,
    subsidy_goal: 'ウェブ予約システム導入とテイクアウトメニュー開発',
    challenges: [
      'コロナ後に接待需要が減少',
      '電話予約のみで予約管理が煩雑',
      'テイクアウトは未対応で機会損失'
    ],
    strengths: [
      'Google Maps評価4.7点と業界トップクラス',
      'シェフの技術力と創作メニュー',
      'ワインペアリングの提案力'
    ]
  },

  // 4. 居酒屋（地域密着型）- 売上横ばい店舗
  {
    id: 'izakaya_maruichi',
    name: '炉端焼き まるいち',
    businessType: '居酒屋',
    location: '埼玉県川越市（駅徒歩3分）',
    feature: '炉端焼き、地元野菜使用、日本酒30種類以上',
    customerBase: '40-60代男性、近隣住民、サラリーマン',
    rating: 4.3,
    reviewCount: 95,
    yearsInBusiness: 8,
    monthlySales: 150,
    annualSales: 1800,
    annualProfit: 270,
    employees: 4,
    subsidy_goal: '若年層向けSNS広告と個室改装',
    challenges: [
      '顧客の高齢化で客数が減少傾向',
      '若年層の来店が少ない',
      'SNSをやっていないので認知度が低い'
    ],
    strengths: [
      '地元野菜の仕入れルート確保',
      '常連客が多く、リピート率高い',
      '日本酒の品揃えが豊富'
    ]
  },

  // 5. パン屋（オーガニック系）- 新規開業店舗
  {
    id: 'bakery_natural',
    name: 'ナチュラルベーカリー 麦の香',
    businessType: 'パン屋',
    location: '千葉県柏市（住宅街）',
    feature: '国産小麦・無添加・天然酵母使用、グルテンフリーパンあり',
    customerBase: '30-40代女性、子育て世代、健康志向の方',
    rating: 4.6,
    reviewCount: 45,
    yearsInBusiness: 1,
    monthlySales: 60,
    annualSales: 720,
    annualProfit: 80,
    employees: 2,
    subsidy_goal: 'オーブン増設とオンライン予約販売システム導入',
    challenges: [
      '1日の生産量が限られ、午後には売り切れる',
      '遠方からの問い合わせに対応できない',
      '認知度がまだ低い'
    ],
    strengths: [
      '無添加・オーガニックへのこだわり',
      '口コミで評判が広がっている',
      'アレルギー対応パンが好評'
    ]
  },

  // 6. 寿司店（回らない寿司）- 老舗
  {
    id: 'sushi_edomae',
    name: '江戸前鮨 すし政',
    businessType: '寿司店',
    location: '東京都台東区（浅草駅徒歩7分）',
    feature: '江戸前鮨、築地直送、カウンター10席のみ',
    customerBase: '40-70代男女、観光客、接待利用',
    rating: 4.8,
    reviewCount: 180,
    yearsInBusiness: 25,
    monthlySales: 200,
    annualSales: 2400,
    annualProfit: 360,
    employees: 3,
    subsidy_goal: 'インバウンド対応（多言語メニュー・決済システム）',
    challenges: [
      '外国人観光客への対応が不十分',
      'クレジットカード・QR決済未対応',
      '若い職人の採用が難しい'
    ],
    strengths: [
      '築地直送のネタの鮮度',
      '25年の実績と技術',
      'Google Maps評価4.8点'
    ]
  },

  // 7. 焼肉店（和牛特化）- 差別化成功店舗
  {
    id: 'yakiniku_premium',
    name: '和牛焼肉 牛蔵',
    businessType: '焼肉店',
    location: '大阪府大阪市（難波駅徒歩5分）',
    feature: 'A5ランク和牛専門、個室完備、ソムリエ常駐',
    customerBase: '30-50代男女、記念日利用、接待利用',
    rating: 4.6,
    reviewCount: 210,
    yearsInBusiness: 4,
    monthlySales: 280,
    annualSales: 3360,
    annualProfit: 500,
    employees: 7,
    subsidy_goal: 'テーブルオーダーシステム導入と冷蔵設備増強',
    challenges: [
      '人気で予約が取りづらいと評判',
      '注文受付に時間がかかる',
      '肉の在庫管理が難しい'
    ],
    strengths: [
      'A5ランク和牛の安定仕入れ',
      'ソムリエによるペアリング提案',
      '個室完備でプライバシー確保'
    ]
  },

  // 8. カレー店（スパイス専門）- ニッチ市場店舗
  {
    id: 'curry_spice',
    name: 'スパイスカレー 香辛堂',
    businessType: 'カレー専門店',
    location: '京都府京都市（四条駅徒歩8分）',
    feature: '20種類以上のスパイス使用、日替わりカレー、ヴィーガン対応',
    customerBase: '20-40代男女、カレー好き、外国人観光客',
    rating: 4.4,
    reviewCount: 130,
    yearsInBusiness: 2,
    monthlySales: 100,
    annualSales: 1200,
    annualProfit: 180,
    employees: 2,
    subsidy_goal: 'レトルトカレー開発とEC販売開始',
    challenges: [
      '店舗販売のみで売上の上限がある',
      '観光客依存で平日が弱い',
      'スパイスの仕入れコストが高い'
    ],
    strengths: [
      'スパイスへのこだわりと専門性',
      'ヴィーガン対応で差別化',
      'SNSでの口コミ拡散力'
    ]
  },

  // 9. 弁当店（テイクアウト専門）- コロナ後成長店舗
  {
    id: 'bento_delicious',
    name: 'お弁当工房 美味',
    businessType: '弁当販売',
    location: '福岡県福岡市（オフィス街）',
    feature: '日替わり弁当、予約注文対応、企業向け配達',
    customerBase: 'オフィスワーカー、建設現場、高齢者（配達）',
    rating: 4.3,
    reviewCount: 75,
    yearsInBusiness: 3,
    monthlySales: 180,
    annualSales: 2160,
    annualProfit: 320,
    employees: 4,
    subsidy_goal: 'ウェブ注文システムと配達車両購入',
    challenges: [
      '電話注文のみで受付業務が煩雑',
      '配達範囲を広げたいが車両不足',
      '高齢者向け配達の需要が高いが対応しきれない'
    ],
    strengths: [
      '企業向け大量注文の実績',
      'リピート率80%以上',
      '栄養バランスを考えた献立'
    ]
  },

  // 10. 喫茶店（レトロ系）- 後継者問題あり店舗
  {
    id: 'kissaten_showa',
    name: '喫茶 昭和館',
    businessType: '喫茶店',
    location: '愛知県名古屋市（住宅街）',
    feature: '創業40年、昭和レトロな内装、手作りプリン・ナポリタン',
    customerBase: '50-70代男女、近隣住民、レトロ喫茶ファン',
    rating: 4.5,
    reviewCount: 110,
    yearsInBusiness: 40,
    monthlySales: 80,
    annualSales: 960,
    annualProfit: 120,
    employees: 2,
    subsidy_goal: 'SNS広告と店舗改装（若年層向け）',
    challenges: [
      '経営者が高齢化（70代）',
      '若年層の来店が少ない',
      '設備が古く、修繕が必要'
    ],
    strengths: [
      '40年の歴史と常連客',
      'レトロブームで若年層に注目され始めている',
      '手作りプリンが名物'
    ]
  }
];

module.exports = mockStoreProfiles;
