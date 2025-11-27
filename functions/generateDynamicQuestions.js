/**
 * Gemini 3.0 Pro Preview を使用した動的質問生成
 *
 * 業種・事業内容に基づいて、申請書作成に最適な質問を自動生成
 * 100万トークンのコンテキストウィンドウを活用
 */

const functions = require('firebase-functions');

// 業種別の質問テンプレート（Gemini 3.0が参照）
const INDUSTRY_CONTEXTS = {
  restaurant: {
    category: '飲食業',
    keywords: ['メニュー', '仕入先', '調理', '席数', '回転率', '客単価', 'テイクアウト', 'デリバリー'],
    specificQuestions: [
      '看板メニューや人気料理',
      '食材の仕入先やこだわり',
      '調理方法の特徴',
      '座席数と回転率',
      'ピーク時間帯',
    ],
  },
  retail: {
    category: '小売業',
    keywords: ['商品', '仕入', '在庫', '陳列', 'POS', 'EC', '通販'],
    specificQuestions: [
      '取扱商品カテゴリ',
      '仕入先と取引条件',
      '在庫管理方法',
      '売れ筋商品',
      'オンライン販売の有無',
    ],
  },
  service: {
    category: 'サービス業',
    keywords: ['施術', '予約', 'リピート', '技術', '資格', 'スタッフ'],
    specificQuestions: [
      '提供サービスの種類',
      '必要な資格や技術',
      '予約システム',
      'リピート率',
      'スタッフの専門性',
    ],
  },
  manufacturing: {
    category: '製造業',
    keywords: ['製造', '設備', '品質', '納期', '原材料', '工程'],
    specificQuestions: [
      '主要製造品目',
      '製造設備',
      '品質管理体制',
      '主要取引先',
      '生産能力',
    ],
  },
  construction: {
    category: '建設業',
    keywords: ['工事', '施工', '資格', '許可', '安全', '下請'],
    specificQuestions: [
      '主要工事種別',
      '保有資格・許可',
      '施工実績',
      '協力会社体制',
      '安全管理',
    ],
  },
};

// 様式2の必須セクションと対応する質問カテゴリ
const FORM2_SECTIONS = {
  companyOverview: {
    name: '企業概要',
    requiredInfo: ['事業内容', '創業年', '従業員数', '売上推移', '主要商品・サービス', '立地特性'],
  },
  customerNeeds: {
    name: '顧客ニーズと市場の動向',
    requiredInfo: ['ターゲット顧客', '顧客ニーズ', '市場トレンド', '競合状況', '商圏分析'],
  },
  strengths: {
    name: '自社の強み',
    requiredInfo: ['差別化ポイント', '技術・ノウハウ', '顧客評価', '実績', '独自性'],
  },
  managementPlan: {
    name: '経営方針・目標',
    requiredInfo: ['課題認識', '目標設定', '達成計画', '数値目標', '実施時期'],
  },
  subsidyPlan: {
    name: '補助事業計画',
    requiredInfo: ['事業内容', '導入設備', '期待効果', '経費内訳', '実施スケジュール'],
  },
};

/**
 * Gemini 3.0 Pro Preview APIを呼び出して質問を生成
 */
async function callGemini3API(prompt, thinkingLevel = 'high') {
  const apiKey = functions.config().gemini?.key || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  // Gemini 3.0 Pro Preview エンドポイント
  const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-pro-preview-05-06:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{text: prompt}],
          }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
          },
          // Gemini 3.0 の thinking 機能を活用
          thinkingConfig: {
            thinkingLevel: thinkingLevel, // 'low', 'medium', 'high'
          },
        }),
      },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini 3.0] API Error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid Gemini API response');
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * 業種を判定
 */
function detectIndustry(businessType, mainServices) {
  const combined = `${businessType} ${mainServices}`.toLowerCase();

  // 飲食業
  if (/飲食|レストラン|カフェ|居酒屋|ラーメン|寿司|焼肉|バー|喫茶|弁当|食堂|料理/.test(combined)) {
    return 'restaurant';
  }

  // 小売業
  if (/小売|販売|ショップ|店舗|雑貨|アパレル|服|食品|スーパー|コンビニ/.test(combined)) {
    return 'retail';
  }

  // サービス業
  if (/美容|理容|エステ|ネイル|マッサージ|整体|鍼灸|クリーニング|教室|塾/.test(combined)) {
    return 'service';
  }

  // 製造業
  if (/製造|工場|加工|生産|メーカー/.test(combined)) {
    return 'manufacturing';
  }

  // 建設業
  if (/建設|建築|工事|施工|リフォーム|内装|土木/.test(combined)) {
    return 'construction';
  }

  return 'other';
}

/**
 * Phase 1の基本情報から動的質問を生成
 */
exports.generateDynamicQuestions = functions
    .region('asia-northeast1')
    .runWith({
      timeoutSeconds: 120,
      memory: '1GB',
    })
    .https.onCall(async (data, context) => {
      try {
        const {phase1Answers, targetPhase} = data;

        if (!phase1Answers) {
          throw new functions.https.HttpsError(
              'invalid-argument',
              'Phase 1 answers are required',
          );
        }

        // 基本情報の抽出
        const placeInfo = phase1Answers['Q1-0'] || {};
        const businessType = phase1Answers['Q1-1'] || '';
        const mainServices = phase1Answers['Q1-3'] || '';
        const subsidyPurpose = phase1Answers['Q1-7'] || '';
        const annualSales = phase1Answers['Q1-8'] || '';
        const employeeCount = phase1Answers['Q1-10'] || '';

        // 業種判定
        const industry = detectIndustry(businessType, mainServices);
        const industryContext = INDUSTRY_CONTEXTS[industry] || INDUSTRY_CONTEXTS.service;

        // Webサイト情報（あれば）
        const websiteSummary = phase1Answers['Q1-0-website-summary'] || '';
        const tabelogData = phase1Answers['Q1-0-tabelog'] || null;
        const hotpepperData = phase1Answers['Q1-0-hotpepper'] || null;

        // Gemini 3.0に渡すプロンプト
        const prompt = `
あなたは小規模事業者持続化補助金の申請書作成を支援するAIアシスタントです。
以下の事業者情報をもとに、様式2「${FORM2_SECTIONS[targetPhase]?.name || '経営計画'}」セクションの作成に必要な質問を生成してください。

# 事業者基本情報

## Google Maps情報
- 店舗名: ${placeInfo.name || '未登録'}
- 住所: ${placeInfo.address || '未登録'}
- 評価: ${placeInfo.rating || 'N/A'} (${placeInfo.userRatingsTotal || 0}件のレビュー)
${placeInfo.reviews ? `
## 顧客レビュー（抜粋）
${placeInfo.reviews.slice(0, 5).map((r, i) => `${i+1}. 「${r.text?.substring(0, 150) || ''}...」`).join('\n')}
` : ''}

## 事業内容
- 業種: ${businessType}（${industryContext.category}）
- 主要サービス: ${mainServices}
- 補助金の目的: ${subsidyPurpose}
- 年間売上: ${annualSales}万円
- 従業員数: ${employeeCount}

${websiteSummary ? `
## 公式Webサイト情報
${websiteSummary}
` : ''}

${tabelogData ? `
## 食べログ情報
- 評価: ${tabelogData.rating}
- 口コミ数: ${tabelogData.reviewCount}
- 価格帯: ${tabelogData.budget}
- 人気メニュー: ${tabelogData.popularDishes?.join(', ')}
- キーワード: ${tabelogData.keywords?.join(', ')}
` : ''}

${hotpepperData ? `
## ホットペッパー情報
- 評価: ${hotpepperData.rating}
- 口コミ数: ${hotpepperData.reviewCount}
- 人気メニュー: ${hotpepperData.popularMenus?.join(', ')}
- キーワード: ${hotpepperData.keywords?.join(', ')}
` : ''}

# 業種特有の確認ポイント
${industryContext.specificQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}

# 様式2の記載要件
${FORM2_SECTIONS[targetPhase]?.requiredInfo.map((r, i) => `${i+1}. ${r}`).join('\n') || '経営計画の全般的な情報'}

# 質問生成の指示

上記の情報を踏まえて、以下の条件で質問を生成してください：

1. **既に取得済みの情報は質問しない**
   - Google Maps、食べログ、ホットペッパーで取得済みの情報は除外
   - Phase 1で回答済みの内容は除外

2. **業種特有の質問を含める**
   - ${industryContext.category}に特化した具体的な質問
   - 例：${industryContext.keywords.slice(0, 3).join('、')}に関する質問

3. **一問一答形式**
   - 複合的な質問は分割
   - ユーザーが答えやすい形式

4. **質問タイプを指定**
   - single_select: 1つ選択
   - multi_select: 複数選択可
   - number: 数値入力
   - text: 短い文字列
   - textarea: 長文入力

5. **優先度を設定**
   - high: 必須（様式2に直接記載）
   - medium: 推奨（申請書の説得力向上）
   - low: 任意（補足情報）

# 出力形式（JSON配列）

\`\`\`json
[
  {
    "id": "DQ-${targetPhase}-1",
    "text": "質問文",
    "type": "single_select",
    "options": ["選択肢1", "選択肢2"],
    "priority": "high",
    "helpText": "この質問は〇〇の記載に使用します",
    "placeholder": "回答例や入力ヒント",
    "section": "${targetPhase}",
    "industrySpecific": true
  }
]
\`\`\`

5〜10個の質問を生成してください。JSON配列のみを出力し、説明は不要です。
`;

        console.log('[generateDynamicQuestions] Calling Gemini 3.0 Pro Preview...');
        console.log('[generateDynamicQuestions] Industry:', industry);
        console.log('[generateDynamicQuestions] Target phase:', targetPhase);

        // Gemini 3.0 API呼び出し（thinking_level: high で深い思考）
        const response = await callGemini3API(prompt, 'high');

        // JSONパース
        let questions;
        try {
        // JSONブロックを抽出
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                          response.match(/\[[\s\S]*\]/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
          questions = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('[generateDynamicQuestions] JSON parse error:', parseError);
          console.error('[generateDynamicQuestions] Raw response:', response);
          throw new Error('Failed to parse Gemini response as JSON');
        }

        // 質問にメタデータを追加
        const enrichedQuestions = questions.map((q, index) => ({
          ...q,
          id: q.id || `DQ-${targetPhase}-${index + 1}`,
          generatedBy: 'gemini-3.0-pro-preview',
          industry: industry,
          timestamp: new Date().toISOString(),
        }));

        console.log('[generateDynamicQuestions] Generated questions:', enrichedQuestions.length);

        return {
          success: true,
          questions: enrichedQuestions,
          industry: industry,
          industryCategory: industryContext.category,
          metadata: {
            totalQuestions: enrichedQuestions.length,
            highPriority: enrichedQuestions.filter((q) => q.priority === 'high').length,
            industrySpecific: enrichedQuestions.filter((q) => q.industrySpecific).length,
          },
        };
      } catch (error) {
        console.error('[generateDynamicQuestions] Error:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || '質問生成に失敗しました',
        );
      }
    });

/**
 * 回答に基づいてフォローアップ質問を生成
 */
exports.generateFollowUpDynamic = functions
    .region('asia-northeast1')
    .runWith({
      timeoutSeconds: 60,
      memory: '512MB',
    })
    .https.onCall(async (data, context) => {
      try {
        const {questionId, answer, questionText, allAnswers} = data;

        // 曖昧な回答や短すぎる回答の場合にフォローアップ
        const needsFollowUp =
        (typeof answer === 'string' && answer.length < 10) ||
        answer === 'わからない' ||
        answer === 'その他';

        if (!needsFollowUp) {
          return {success: true, followUpNeeded: false};
        }

        const prompt = `
ユーザーが以下の質問に対して曖昧な回答をしました。
より具体的な情報を得るためのフォローアップ質問を1つ生成してください。

【元の質問】
${questionText}

【ユーザーの回答】
${answer}

【これまでの回答情報】
${Object.entries(allAnswers || {}).slice(0, 10).map(([k, v]) => `${k}: ${typeof v === 'string' ? v.substring(0, 50) : JSON.stringify(v)}`).join('\n')}

【フォローアップ質問の条件】
1. 具体的な選択肢を提示する
2. ユーザーが答えやすい形式にする
3. 申請書作成に役立つ情報を引き出す

JSON形式で出力：
{
  "text": "フォローアップ質問文",
  "type": "single_select",
  "options": ["選択肢1", "選択肢2", "選択肢3", "その他"]
}
`;

        const response = await callGemini3API(prompt, 'medium');

        let followUpQuestion;
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          followUpQuestion = JSON.parse(jsonMatch[0]);
        } catch (e) {
          return {success: true, followUpNeeded: false};
        }

        return {
          success: true,
          followUpNeeded: true,
          followUpQuestion: {
            ...followUpQuestion,
            id: `${questionId}-followup`,
            parentQuestionId: questionId,
          },
        };
      } catch (error) {
        console.error('[generateFollowUpDynamic] Error:', error);
        return {success: true, followUpNeeded: false};
      }
    });
