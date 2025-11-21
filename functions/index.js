/**
 * Cloud Functions for aidant-app
 * OpenAI APIをサーバーサイドで呼び出すことでAPIキーを保護
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { generateForm3 } = require('./utils/generateForm3');
const { performDeepResearch } = require('./utils/deepResearch');
const { validateQ0_2Answer } = require('./utils/validateQ0-2');
// Node.js 18+では fetch がグローバルに利用可能

admin.initializeApp();

// OpenAI クライアント初期化
const openai = new OpenAI({
  apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY,
});

/**
 * 様式2（経営計画書兼補助事業計画書）生成
 *
 * セキュリティ対策:
 * - Firebase Authentication必須
 * - レート制限（1日10回まで）
 * - ポイント残高チェック
 * - APIキーはサーバーサイドで管理
 */
exports.generateSubsidyApplication = functions
  .region('asia-northeast1') // 東京リージョン
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { answers } = data;

    try {
      // ユーザー情報取得
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'ユーザー情報が見つかりません'
        );
      }

      const userData = userDoc.data();

      // ポイント残高チェック（様式2生成コスト: 100ポイント）
      const generationCost = 100;
      if ((userData.pointBalance || 0) < generationCost) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'ポイント残高が不足しています'
        );
      }

      // レート制限チェック（1日10回まで）
      const today = new Date().toISOString().split('T')[0];
      const rateLimitKey = `apiCalls_${today}`;
      const todayCalls = userData[rateLimitKey] || 0;

      if (todayCalls >= 10) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          '本日の利用上限（10回）に達しました。明日以降再度お試しください。'
        );
      }

      // プロンプト構築（buildApplicationPrompt関数を移植）
      const prompt = buildApplicationPrompt(answers);

      console.log(`[generateSubsidyApplication] User: ${userId}, Attempt: ${todayCalls + 1}/10`);

      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは小規模事業者持続化補助金の申請書作成の専門家です。審査に通りやすい高品質な申請書を作成します。必ず「である調（常体）」を使用してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      });

      let generatedText = completion.choices[0].message.content.trim();

      // 様式3（経費明細表・資金調達方法）の生成と統合
      try {
        // Phase 5の回答があれば様式3を生成
        if (answers['P5-2']) {
          // 赤字事業者かどうかの判定（経常利益がゼロ以下）
          const operatingProfit = parseFloat(answers['Q1-9']) || 0;
          const isDeficitBusiness = operatingProfit <= 0;

          // 補助金上限額の判定（デフォルト50万円、将来的には枠の種類から判定）
          const subsidyLimit = 500000;

          const form3 = generateForm3(answers, isDeficitBusiness, subsidyLimit);

          // バリデーションエラーがあれば警告を含める
          if (!form3.validation.isValid) {
            console.warn('[generateForm3] Validation errors:', form3.validation.errors);
            generatedText += '\n\n---\n\n**⚠️ 様式3の警告**\n\n';
            form3.validation.errors.forEach(error => {
              generatedText += `- ${error}\n`;
            });
          }

          // 様式2と様式3を統合
          generatedText += '\n\n---\n\n' + form3.markdown;

          console.log('[generateForm3] Form 3 generated successfully');
        } else {
          console.log('[generateForm3] Skipped - P5-2 not available');
        }
      } catch (form3Error) {
        console.error('[generateForm3] Error generating Form 3:', form3Error);
        // エラーがあっても様式2は返す
      }

      // ポイント消費とレート制限カウンター更新
      await userRef.update({
        pointBalance: admin.firestore.FieldValue.increment(-generationCost),
        [rateLimitKey]: todayCalls + 1,
        lastApiCallTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ポイント使用履歴を記録
      await admin.firestore().collection('point_transactions').add({
        userId: userId,
        type: 'usage',
        amount: -generationCost,
        description: '様式2生成',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[generateSubsidyApplication] Success. Points deducted: ${generationCost}`);

      return {
        generatedText,
        pointsUsed: generationCost,
        remainingPoints: (userData.pointBalance || 0) - generationCost,
      };
    } catch (error) {
      console.error('[generateSubsidyApplication] Error:', error);

      // OpenAI APIエラーの場合
      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `OpenAI APIエラー: ${error.message}`
        );
      }

      // その他のエラー
      throw error;
    }
  });

/**
 * 回答の自動補完（AI Draft生成）
 *
 * セキュリティ対策:
 * - Firebase Authentication必須
 * - レート制限（1日50回まで）
 * - ポイント残高チェック（10ポイント/回）
 */
exports.generateAnswerDraft = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { questionText, userInput, context: questionContext } = data;

    try {
      // ユーザー情報取得
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'ユーザー情報が見つかりません'
        );
      }

      const userData = userDoc.data();

      // ポイント残高チェック（AI Draft生成コスト: 10ポイント）
      const draftCost = 10;
      if ((userData.pointBalance || 0) < draftCost) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'ポイント残高が不足しています'
        );
      }

      // レート制限チェック（1日50回まで）
      const today = new Date().toISOString().split('T')[0];
      const rateLimitKey = `draftCalls_${today}`;
      const todayCalls = userData[rateLimitKey] || 0;

      if (todayCalls >= 50) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          '本日の利用上限（50回）に達しました'
        );
      }

      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '申請書作成のアシスタントとして、ユーザーの簡潔な入力を元に、詳細で説得力のある回答を生成してください。',
          },
          {
            role: 'user',
            content: `
質問: ${questionText}
ユーザーの簡潔な回答: ${userInput}
${questionContext ? `背景情報: ${JSON.stringify(questionContext)}` : ''}

上記を元に、申請書に記載する詳細な回答を生成してください。
`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const enhancedAnswer = completion.choices[0].message.content.trim();

      // ポイント消費とレート制限カウンター更新
      await userRef.update({
        pointBalance: admin.firestore.FieldValue.increment(-draftCost),
        [rateLimitKey]: todayCalls + 1,
      });

      // ポイント使用履歴を記録
      await admin.firestore().collection('point_transactions').add({
        userId: userId,
        type: 'usage',
        amount: -draftCost,
        description: 'AI Draft生成',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        enhancedAnswer,
        pointsUsed: draftCost,
        remainingPoints: (userData.pointBalance || 0) - draftCost,
      };
    } catch (error) {
      console.error('[generateAnswerDraft] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `OpenAI APIエラー: ${error.message}`
        );
      }

      throw error;
    }
  });

/**
 * 回答内容の完成度分析（AI分析）
 *
 * セキュリティ対策:
 * - Firebase Authentication必須
 * - レート制限（1日20回まで）
 * - ポイント残高チェック（5ポイント/回）
 */
exports.analyzeCompleteness = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { answers, placeData } = data;

    try {
      // ユーザー情報取得
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'ユーザー情報が見つかりません'
        );
      }

      const userData = userDoc.data();

      // ポイント残高チェック（分析コスト: 5ポイント）
      const analysisCost = 5;
      if ((userData.pointBalance || 0) < analysisCost) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'ポイント残高が不足しています'
        );
      }

      // レート制限チェック（1日20回まで）
      const today = new Date().toISOString().split('T')[0];
      const rateLimitKey = `analysisCalls_${today}`;
      const todayCalls = userData[rateLimitKey] || 0;

      if (todayCalls >= 20) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          '本日の利用上限（20回）に達しました'
        );
      }

      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '小規模事業者持続化補助金の申請書（様式2）作成に必要な情報が揃っているか分析する専門家です。JSON形式で必ず回答してください。',
          },
          {
            role: 'user',
            content: buildCompletenessPrompt(answers, placeData),
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const analysisText = completion.choices[0].message.content.trim();
      const analysis = JSON.parse(analysisText);

      // ポイント消費とレート制限カウンター更新
      await userRef.update({
        pointBalance: admin.firestore.FieldValue.increment(-analysisCost),
        [rateLimitKey]: todayCalls + 1,
      });

      // ポイント使用履歴を記録
      await admin.firestore().collection('point_transactions').add({
        userId: userId,
        type: 'usage',
        amount: -analysisCost,
        description: '完成度分析',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[analyzeCompleteness] Success. Overall: ${analysis.overall}%`);

      return {
        analysis,
        pointsUsed: analysisCost,
        remainingPoints: (userData.pointBalance || 0) - analysisCost,
      };
    } catch (error) {
      console.error('[analyzeCompleteness] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `OpenAI APIエラー: ${error.message}`
        );
      }

      throw error;
    }
  });

/**
 * 追加質問生成（AI生成）
 *
 * セキュリティ対策:
 * - Firebase Authentication必須
 * - レート制限（1日30回まで）
 * - ポイント残高チェック（10ポイント/回）
 */
exports.generateFollowUpQuestion = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { gaps, answers, placeData } = data;

    try {
      // ユーザー情報取得
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'ユーザー情報が見つかりません'
        );
      }

      const userData = userDoc.data();

      // ポイント残高チェック（質問生成コスト: 10ポイント）
      const questionCost = 10;
      if ((userData.pointBalance || 0) < questionCost) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'ポイント残高が不足しています'
        );
      }

      // レート制限チェック（1日30回まで）
      const today = new Date().toISOString().split('T')[0];
      const rateLimitKey = `followUpCalls_${today}`;
      const todayCalls = userData[rateLimitKey] || 0;

      if (todayCalls >= 30) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          '本日の利用上限（30回）に達しました'
        );
      }

      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '小規模事業者持続化補助金の申請書作成を支援する質問生成の専門家です。不足情報を埋めるための自然で効果的な質問を1つ生成してください。JSON形式で必ず回答してください。',
          },
          {
            role: 'user',
            content: buildFollowUpQuestionPrompt(gaps, answers, placeData),
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const questionText = completion.choices[0].message.content.trim();
      const questionData = JSON.parse(questionText);

      // ポイント消費とレート制限カウンター更新
      await userRef.update({
        pointBalance: admin.firestore.FieldValue.increment(-questionCost),
        [rateLimitKey]: todayCalls + 1,
      });

      // ポイント使用履歴を記録
      await admin.firestore().collection('point_transactions').add({
        userId: userId,
        type: 'usage',
        amount: -questionCost,
        description: '追加質問生成',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[generateFollowUpQuestion] Success. Question ID: ${questionData.id}`);

      return {
        question: questionData,
        pointsUsed: questionCost,
        remainingPoints: (userData.pointBalance || 0) - questionCost,
      };
    } catch (error) {
      console.error('[generateFollowUpQuestion] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `OpenAI APIエラー: ${error.message}`
        );
      }

      throw error;
    }
  });

/**
 * buildApplicationPrompt関数
 * フロントエンドのopenai.jsから移植
 */
function buildApplicationPrompt(answers) {
  // ===== Phase 1: 基本情報 =====
  const placeInfo = answers['Q1-0'] || {};
  const businessType = answers['Q1-1'] || '';

  // 法人名と店舗名の処理
  const companyNameType = answers['Q1-2'] || 'same';
  const companyName = answers['Q1-2-company'] || '';
  const storeName = placeInfo.name || '';

  // 法人名が店舗名と異なる場合の表記
  let businessNameDisplay = '';
  if (companyNameType === 'different' && companyName) {
    businessNameDisplay = `${companyName}は${storeName}`;
  } else {
    businessNameDisplay = storeName;
  }

  const mainServices = answers['Q1-3'] || '';
  const additionalServices = answers['Q1-3-multi'] || '';
  const employees = answers['Q1-4'] || '';
  const openingDate = answers['Q1-5'] || '';
  const businessForm = answers['Q1-6'] || '';
  const subsidyPurpose = answers['Q1-7'] || '';
  const annualSales = answers['Q1-8'] || '';
  const salesTrend = answers['Q1-8-trend'] || '';
  const operatingProfit = answers['Q1-9'] || '';
  const grossProfitRate = answers['Q1-10'] || '';
  const customerUnitPrice = answers['Q1-11'] || '';

  // ===== Phase 2: 顧客ニーズと市場の動向 =====
  const targetCustomer = answers['P2-1'] || '';
  const whyChosen = answers['P2-2'] || '';
  const customerNeeds = answers['P2-3'] || '';
  const needsChange = answers['P2-4'] || '';
  const marketTrends = answers['P2-5'] || '';
  const competitorComparison = answers['P2-6'] || '';

  // ===== Phase 3: 自社の強み =====
  const uniqueness = answers['P3-1'] || '';
  const customerValue = answers['P3-2'] || '';
  const expertise = answers['P3-3'] || '';
  const equipment = answers['P3-4'] || '';
  const achievements = answers['P3-5'] || '';
  const weaknesses = answers['P3-6'] || '';
  const location = answers['P3-7'] || '';

  // ===== Phase 4: 経営方針・目標 =====
  const futureGoals = answers['P4-1'] || '';
  const goalPlan = answers['P4-2'] || '';
  const salesTarget = answers['P4-3'] || '';
  const keyInitiatives = answers['P4-4'] || '';
  const targetTimeline = answers['P4-5'] || '';
  const longTermVision = answers['P4-6'] || '';
  const managementChallenges = answers['P4-7'] || '';
  const strengthToLeverage = answers['P4-8'] || '';

  // ===== Phase 5: 補助事業の内容 =====
  const subsidyUsage = answers['P5-1'] || '';
  const plannedEquipment = answers['P5-2'] || '';
  const implementationSchedule = answers['P5-3'] || '';
  const expectedEffect = answers['P5-4'] || '';
  const specificMeasures = answers['P5-5'] || '';
  const targetCustomers = answers['P5-6'] || '';
  const expenseBreakdown = answers['P5-7'] || '';
  const webRelatedExpenses = answers['P5-8'] || '';
  const advertisingPlan = answers['P5-9'] || '';
  const salesIncreaseRationale = answers['P5-10'] || '';
  const regionalContribution = answers['P5-11'] || '';
  const innovationPoints = answers['P5-12'] || '';

  // ===== Phase 6: 文章生成スタイル =====
  const writingTone = answers['P6-1'] || 5;
  const writingDetail = answers['P6-2'] || 3;
  const keywords = answers['P6-3'] || '';

  // スタイル設定を構築
  let styleInstructions = '\n\n【文章スタイル指定】\n';

  // トーンの設定
  switch (writingTone) {
    case 1:
      styleInstructions += '- 堅実で信頼感のある表現を使用する\n';
      styleInstructions += '- 落ち着いた語調で、実績と信頼性を重視する\n';
      styleInstructions += '- 数値データを重視し、長年の経験を強調する\n';
      break;
    case 2:
      styleInstructions += '- 情熱的でやる気が伝わる表現を使用する\n';
      styleInstructions += '- ビジョンと目標達成への強い意志を示す\n';
      styleInstructions += '- 前向きで挑戦的な姿勢を強調する\n';
      break;
    case 3:
      styleInstructions += '- 柔らかく親しみやすい表現を使用する\n';
      styleInstructions += '- お客様目線を重視し、共感を呼ぶストーリーを含める\n';
      styleInstructions += '- 温かみのある語調で、人との関係性を大切にする姿勢を示す\n';
      break;
    case 4:
      styleInstructions += '- 簡潔で論理的な表現を使用する\n';
      styleInstructions += '- データと戦略を重視し、目標達成への道筋を明確に示す\n';
      styleInstructions += '- 効率性と合理性を強調する\n';
      break;
    case 5:
    default:
      styleInstructions += '- バランスの取れた標準的な表現を使用する\n';
      styleInstructions += '- 実績とビジョンの両方を適度に盛り込む\n';
      break;
  }

  // 詳細度の設定
  switch (writingDetail) {
    case 1:
      styleInstructions += '- 具体的な数値、データ、表を多用する\n';
      styleInstructions += '- 定量的な根拠を明確に示す\n';
      break;
    case 2:
      styleInstructions += '- ストーリー性を重視し、創業の経緯や顧客とのエピソードを盛り込む\n';
      styleInstructions += '- 想いや背景を丁寧に説明する\n';
      break;
    case 3:
    default:
      styleInstructions += '- 数値データとストーリーをバランス良く配置する\n';
      break;
  }

  // キーワードの設定
  if (keywords) {
    styleInstructions += `- 以下のキーワードを適切な箇所に自然に組み込む：「${keywords}」\n`;
  }

  const prompt = `
あなたは小規模事業者持続化補助金の申請書作成の専門家です。
以下の情報を元に、審査に通りやすい高品質な「様式2（経営計画書兼補助事業計画書）」を作成してください。

${styleInstructions}

# 【Phase 1】 基本情報

## 事業者情報
- 事業者名: ${businessNameDisplay}
- 店舗名: ${storeName}
${companyNameType === 'different' && companyName ? `- 法人名: ${companyName}\n` : ''}- 住所: ${placeInfo.address || ''}
- 業種: ${businessType}
- 主要サービス: ${mainServices}
${additionalServices && additionalServices !== 'なし' ? `- 追加事業: ${additionalServices}\n` : ''}- 従業員数: ${employees}名
- 開業日: ${openingDate}
- 営業形態: ${businessForm}
- 補助金活用の目的: ${subsidyPurpose}

## 財務情報
- 年間売上: ${annualSales}万円
- 売上の傾向: ${salesTrend}
- 経常利益（営業利益）: ${operatingProfit}万円
- 粗利益率: ${grossProfitRate}%
- 客単価: ${customerUnitPrice}円

${answers['Q1-14-method'] ? `
## 販売費及び一般管理費の内訳
${(() => {
  const method = answers['Q1-14-method'];
  let expenseData = null;

  if (method === 'upload' && answers['Q1-14-upload']) {
    expenseData = answers['Q1-14-upload'].extractedData;
  } else if (method === 'manual' && answers['Q1-14-manual']) {
    expenseData = answers['Q1-14-manual'];
  } else if (method === 'ai_estimate' && answers['Q1-14-ai']) {
    expenseData = answers['Q1-14-ai'];
  }

  if (!expenseData || !expenseData.items || expenseData.items.length === 0) {
    return '（経費データなし）';
  }

  let table = '| 項目 | 金額（円） |\n|------|----------|\n';
  expenseData.items.forEach(item => {
    const amount = item.amount || item.value || 0;
    table += `| ${item.category || item.name || '未分類'} | ${amount.toLocaleString()} |\n`;
  });
  table += `| **合計** | **${(expenseData.total || 0).toLocaleString()}** |`;

  return table;
})()}
` : ''}

# 【Phase 2】 顧客ニーズと市場の動向
- ターゲット顧客: ${targetCustomer}
- 選ばれる理由: ${whyChosen}
- 顧客ニーズ: ${customerNeeds}
- ニーズの変化: ${needsChange}
- 市場トレンド: ${marketTrends}
- 競合比較: ${competitorComparison}

# 【Phase 3】 自社の強み
- 独自性: ${uniqueness}
- 顧客価値: ${customerValue}
- 専門性: ${expertise}
- 設備: ${equipment}
- 実績: ${achievements}
- 弱み・課題: ${weaknesses}
- 立地: ${location}

# 【Phase 4】 経営方針・目標
- 今後の目標: ${futureGoals}
- 目標達成計画: ${goalPlan}
- 売上目標: ${salesTarget}
- 重点施策: ${keyInitiatives}
- 実施時期: ${targetTimeline}
- 長期ビジョン: ${longTermVision}
- 経営課題: ${managementChallenges}
- 活用する強み: ${strengthToLeverage}

## SWOT分析
${answers['P4-SWOT-S'] || answers['P4-SWOT-W'] || answers['P4-SWOT-O'] || answers['P4-SWOT-T'] ? `
**強み（Strengths）:**
${answers['P4-SWOT-S'] || '（未入力）'}

**弱み（Weaknesses）:**
${answers['P4-SWOT-W'] || '（未入力）'}

**機会（Opportunities）:**
${answers['P4-SWOT-O'] || '（未入力）'}

**脅威（Threats）:**
${answers['P4-SWOT-T'] || '（未入力）'}
` : '（SWOT分析データなし）'}

# 【Phase 5】 補助事業の内容
- 補助金の使い道: ${subsidyUsage}
- 導入設備: ${plannedEquipment}
- 実施スケジュール: ${implementationSchedule}
- 期待される効果: ${expectedEffect}
- 具体的施策: ${specificMeasures}
- ターゲット顧客: ${targetCustomers}
- 経費内訳: ${expenseBreakdown}
- Web関連費用: ${webRelatedExpenses}
- 広告計画: ${advertisingPlan}
- 売上増加の根拠: ${salesIncreaseRationale}
- 地域貢献: ${regionalContribution}
- 革新性: ${innovationPoints}

${answers['P5-8'] ? `
## 仕入先・購入先情報
${(() => {
  const supplierData = answers['P5-8'];

  if (!supplierData || !supplierData.items || supplierData.items.length === 0) {
    return '（仕入先情報なし）';
  }

  let table = '| 仕入先名 | 商品・サービス名 | 単価（円） | 数量 | 合計（円） |\n';
  table += '|---------|----------------|----------|------|----------|\n';

  supplierData.items.forEach(item => {
    table += `| ${item.supplierName} | ${item.productName} | ${item.unitPrice.toLocaleString()} | ${item.quantity} | ${item.total.toLocaleString()} |\n`;
  });

  table += `| **総合計** | | | | **${supplierData.grandTotal.toLocaleString()}** |`;

  return table;
})()}
` : ''}

---

# 出力形式

以下の構成で様式2を作成してください：

## Ⅰ. 経営計画

### 1. 企業概要（800-1200文字）
- 事業内容、創業年、主要サービス
- 売上構成（表形式）
- 立地特性
- 業務状況と課題

### 2. 顧客ニーズと市場の動向（1200-1800文字）
- 市場全体の動向（出典明記）
- 顧客分析（地域別、商品別）
- 未開拓市場の特定

### 3. 自社や自社の提供する商品・サービスの強み（800-1200文字）
- 箇条書き（●）で複数の強みを列挙
- 顧客評価・口コミ引用
- 競合との差別化ポイント

### 4. 経営方針・目標と今後のプラン（1200-1800文字）
- 現状の課題認識
- 具体的な数値目標
- 実施時期と具体的行動

## Ⅱ. 補助事業計画

### 1. 補助事業で行う事業名（30文字以内）

### 2. 販路開拓等（生産性向上）の取組内容（1500-2500文字）
- 実施する施策の詳細
- 目的、対象顧客、実施時期、方法
- 創意工夫した点

### 3. 補助事業の効果（800-1200文字）
- 売上・取引への効果
- 具体的な数値見込み
- 短期効果と長期効果

---

**重要な指示:**
- 必ず「である調（常体）」を使用すること
- 具体的な数値を積極的に使用すること
- 表形式（Markdown）で財務データを整理すること
- 出典がある場合は必ず明記すること
- 各セクションの文字数目安を守ること
${companyNameType === 'different' && companyName ? `- 法人名と店舗名の使い分け：文章の冒頭や事業概要では「${companyName}は${storeName}という店舗を運営している」のように両方を明記し、その後は文脈に応じて適切に使い分けること\n` : ''}
**表の自動生成:**
- 「1. 企業概要」セクションに以下の表を必ず含めること：
  1. 事業別売上高・利益の推移表（直近1-3期分、年間売上・経常利益のデータを使用）
  2. 主要商品・サービス一覧表（商品名、単価、特徴）
  3. 売上ランキング表（売上TOP3、利益TOP3）※データがある場合
- 「2. 顧客ニーズと市場の動向」セクションに以下の表を含めること：
  1. 地域別顧客分布表（市町村別の売上構成比）※データがある場合
  2. 商品別売上構成比表※データがある場合

**写真挿入の指示:**
様式2の末尾に以下の指示を追加してください：

---

## 【添付写真について】

申請書には以下の写真を添付してください（各2-3枚程度）：

${businessType.includes('飲食') || businessType.includes('カフェ') || businessType.includes('レストラン') ? `### 飲食店の場合
1. **店舗外観**: 看板、入口、外観全体
2. **店舗内観**: 客席、カウンター、厨房（清潔感が伝わる写真）
3. **料理・商品**: 看板メニュー、人気商品（美味しそうに見える写真）
4. **導入予定設備**: 購入予定の機械装置や設備（カタログ写真可）
` : ''}${businessType.includes('小売') || businessType.includes('雑貨') || businessType.includes('アパレル') ? `### 小売業の場合
1. **店舗外観**: 看板、入口、外観全体
2. **店舗内観**: 売場、陳列棚、レジカウンター
3. **商品写真**: 主力商品、人気商品
4. **導入予定設備**: POSシステム、ディスプレイ等（カタログ写真可）
` : ''}${businessType.includes('美容') || businessType.includes('サロン') || businessType.includes('エステ') ? `### 美容・サロンの場合
1. **店舗外観**: 看板、入口、外観全体
2. **店舗内観**: 施術スペース、待合室（清潔感が伝わる写真）
3. **設備・機材**: 使用している機器、導入予定の設備
4. **ビフォーアフター**: 施術例（お客様の許可を得たもの）
` : ''}### 共通の注意事項
- 写真は明るく、ピントが合っているものを選ぶ
- 個人情報（お客様の顔等）が写らないよう配慮する
- 導入予定設備はメーカーのカタログ写真を使用可
- 写真には簡潔なキャプション（説明文）を付ける
`;

  return prompt;
}

/**
 * buildCompletenessPrompt関数
 * 完成度分析用のプロンプト構築
 */
function buildCompletenessPrompt(answers, placeData) {
  const prompt = `
あなたは小規模事業者持続化補助金の申請書（様式2）作成に必要な情報が揃っているか分析する専門家です。

# 様式2で必要な情報

## 1. 企業概要（800-1200文字）
必要な情報:
- 事業の概要（創業年、主要サービス、顧客層）
- 事業別の売上高・売上総利益・売上シェア・客単価
- 立地場所の特性
- 主な商品・サービスのリスト（単価、営業利益率）
- 売上ランキング（売上総額TOP3、利益総額TOP3）
- 売上の状況（日次、週次、月次の来客数と売上パターン）
- 業務状況（従業員数、業務内容、課題）

## 2. 顧客ニーズと市場の動向（1200-1800文字）
必要な情報:
- 市場全体の動向（業界統計、トレンド）
- 地域別顧客分布（市町村別の売上構成比）
- 人口に対する顧客数の割合
- 未開拓地域の特定
- 事業別の購入品特徴（商品別売上構成比、季節変動、客単価）

## 3. 自社の強み（800-1200文字）
必要な情報:
- 競合他社と比較して優れている点
- 顧客に評価されている点（口コミ等）
- 品質、技術、サービス、ノウハウ等の強み

## 4. 経営方針・目標と今後のプラン（1200-1800文字）
必要な情報:
- 現状の課題認識
- 今後の経営方針・目標（具体的な数値目標）
- 目標達成のための具体的プラン（時期、行動）

## 5. 補助事業の内容（1500-2500文字）
必要な情報:
- 補助事業で行う事業名（30文字以内）
- 実施する施策の詳細（目的、対象顧客、実施時期、方法）
- 経費の内訳
- 期待される効果（売上増加の数値見込み）

# 現在の回答内容

${JSON.stringify(answers, null, 2)}

# Google Maps情報

${JSON.stringify(placeData, null, 2)}

# 分析タスク

上記の回答内容を分析し、各セクションの完成度を0-100%で評価してください。
また、不足している情報をリストアップしてください。

# 出力形式（JSON）

必ず以下のJSON形式で回答してください：

{
  "overall": 75,
  "sections": {
    "企業概要": {
      "completeness": 80,
      "gaps": ["売上ランキング（TOP3商品）", "日次・週次の売上パターン"]
    },
    "顧客ニーズと市場の動向": {
      "completeness": 60,
      "gaps": ["地域別顧客分布", "未開拓地域の特定", "季節変動パターン"]
    },
    "自社の強み": {
      "completeness": 85,
      "gaps": ["具体的な顧客の声（口コミ引用）"]
    },
    "経営方針・目標": {
      "completeness": 70,
      "gaps": ["具体的な数値目標", "実施時期の明確化"]
    },
    "補助事業の内容": {
      "completeness": 75,
      "gaps": ["売上増加の根拠となる計算式", "地域貢献の具体例"]
    }
  },
  "priority_gaps": [
    {
      "section": "顧客ニーズと市場の動向",
      "gap": "地域別顧客分布",
      "reason": "審査で重視される項目のため",
      "priority": "high"
    },
    {
      "section": "補助事業の内容",
      "gap": "売上増加の根拠となる計算式",
      "reason": "効果の説得力を高めるために必須",
      "priority": "high"
    }
  ]
}
`;

  return prompt;
}

/**
 * buildFollowUpQuestionPrompt関数
 * 追加質問生成用のプロンプト構築
 */
function buildFollowUpQuestionPrompt(gaps, answers, placeData) {
  const prompt = `
あなたは小規模事業者持続化補助金の申請書作成を支援する質問生成の専門家です。

# 不足している情報（優先度順）

${JSON.stringify(gaps, null, 2)}

# 現在の回答内容

${JSON.stringify(answers, null, 2)}

# Google Maps情報

${JSON.stringify(placeData, null, 2)}

# タスク

上記の不足情報を埋めるための質問を1つ生成してください。
最も優先度の高い不足情報から順に質問を作成します。

## 質問作成の方針

1. **自然で答えやすい質問にする**: 専門用語を避け、事業主が日常的に使う言葉で質問する
2. **具体例を示す**: placeholderで回答例を示し、何を答えればよいか明確にする
3. **既存の回答と矛盾しない**: 既に回答済みの内容を踏まえた質問にする
4. **1つの質問で1つの情報を得る**: 複雑な質問は避ける

# 出力形式（JSON）

必ず以下のJSON形式で回答してください：

{
  "id": "AI-F1",
  "text": "お店で特に売れている商品のTOP3を教えてください（売上金額ベース）",
  "type": "textarea",
  "placeholder": "例：1位 ○○（月間売上50万円）、2位 △△（月間売上30万円）、3位 □□（月間売上20万円）",
  "helpText": "審査では具体的な売上データが重視されます。おおよその金額で構いません。",
  "targetSection": "企業概要",
  "targetGap": "売上ランキング（TOP3商品）"
}

type は以下のいずれか:
- "text": 短い回答（1行）
- "textarea": 長い回答（複数行）
- "number": 数値
- "single_select": 選択肢から1つ選択（optionsも含める）
- "multi_select": 選択肢から複数選択（optionsも含める）
`;

  return prompt;
}

/**
 * Webサイトの内容を取得して要約する
 * @param {string} url - WebサイトのURL
 * @returns {Promise<string>} - 要約されたテキスト
 */
async function fetchAndSummarizeWebsite(url) {
  if (!url) return '';

  try {
    console.log(`[fetchWebsite] Fetching: ${url}`);

    // URLの正規化（httpをhttpsに）
    const normalizedUrl = url.replace(/^http:\/\//i, 'https://');

    // HTMLを取得（タイムアウト10秒）
    const response = await fetch(normalizedUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AidantBot/1.0; +https://aidant-app.web.app)',
      },
    });

    if (!response.ok) {
      console.warn(`[fetchWebsite] HTTP error: ${response.status}`);
      return '';
    }

    const html = await response.text();

    // HTMLタグを除去してテキストのみを抽出
    let cleanedText = html
      // scriptとstyleタグの内容を削除
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // HTMLタグを削除
      .replace(/<[^>]+>/g, ' ')
      // HTMLエンティティをデコード
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      // 空白を正規化
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 3000); // 最初の3000文字のみ

    console.log(`[fetchWebsite] Extracted ${cleanedText.length} characters from ${url}`);

    // OpenAI APIで要約
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // コスト削減のためminiモデルを使用
      messages: [
        {
          role: 'system',
          content: '以下のWebサイトの内容を、補助金申請書作成に役立つ情報として要約してください。特に、事業内容、強み、特徴、サービス内容、こだわりなどを抽出してください。',
        },
        {
          role: 'user',
          content: cleanedText,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const summary = completion.choices[0].message.content.trim();
    console.log(`[fetchWebsite] Summary created: ${summary.length} characters`);

    return summary;
  } catch (error) {
    console.error(`[fetchWebsite] Error fetching ${url}:`, error.message);
    return ''; // エラーの場合は空文字を返す（処理を続行）
  }
}

/**
 * 店舗プロフィール自動生成
 *
 * Google MapsとWebサイトの情報から店舗プロフィールをAI生成
 *
 * セキュリティ対策:
 * - Firebase Authentication必須
 * - レート制限（1日10回まで）
 * - ポイント残高チェック（15ポイント/回）
 */
exports.generateStoreProfile = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { googleMapsData, websiteUrl } = data;

    try {
      // ユーザー情報取得
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'ユーザー情報が見つかりません'
        );
      }

      const userData = userDoc.data();

      // ポイント残高チェック（プロフィール生成コスト: 15ポイント）
      const profileCost = 15;
      if ((userData.pointBalance || 0) < profileCost) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'ポイント残高が不足しています'
        );
      }

      // レート制限チェック（1日10回まで）
      const today = new Date().toISOString().split('T')[0];
      const rateLimitKey = `profileCalls_${today}`;
      const todayCalls = userData[rateLimitKey] || 0;

      if (todayCalls >= 10) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          '本日の利用上限（10回）に達しました'
        );
      }

      console.log(`[generateStoreProfile] User: ${userId}, Store: ${googleMapsData.name}`);

      // Webサイト要約取得（複数URL対応）
      let websiteSummary = '';
      const allUrls = [];

      // Google Mapsの公式サイト
      if (googleMapsData.website) {
        allUrls.push(googleMapsData.website);
      }

      // ユーザーが追加入力したURL
      if (websiteUrl) {
        allUrls.push(websiteUrl);
      }

      // 複数URLを順次取得して統合
      if (allUrls.length > 0) {
        const summaries = [];
        for (const url of allUrls) {
          const summary = await fetchAndSummarizeWebsite(url);
          if (summary) {
            summaries.push(`【${url}】\n${summary}`);
          }
        }
        websiteSummary = summaries.join('\n\n');
      }

      // Google Maps口コミのテキスト抽出
      const reviewsText = googleMapsData.reviews
        ? googleMapsData.reviews.slice(0, 5).map(r => r.text).join('\n')
        : '';

      // OpenAI APIでプロフィール生成
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '以下のGoogle MapsとWebサイトの情報から、補助金申請に必要な店舗プロフィールを生成してください。必ずJSON形式で回答してください。',
          },
          {
            role: 'user',
            content: `
【Google Maps情報】
店舗名: ${googleMapsData.name}
住所: ${googleMapsData.address || ''}
業種（types）: ${googleMapsData.types?.join(', ') || ''}
評価: ${googleMapsData.rating ? `★${googleMapsData.rating}` : '不明'} (${googleMapsData.userRatingsTotal || 0}件)
価格帯（price_level 1-4）: ${googleMapsData.price_level || '不明'}
営業時間: ${googleMapsData.openingHours?.weekday_text?.join(', ') || '不明'}
電話番号: ${googleMapsData.phoneNumber || ''}
Webサイト: ${googleMapsData.website || 'なし'}

【口コミ（最新5件）】
${reviewsText || 'なし'}

【Webサイト情報】
${websiteSummary || 'なし'}

# タスク

上記の情報を分析し、以下の形式でJSON形式で店舗プロフィールを出力してください：

{
  "businessName": "店舗名",
  "businessType": "業種（日本語で具体的に。例：イタリアンレストラン、美容室、雑貨店）",
  "corporateType": "法人/個人事業主/不明",
  "companyName": "法人名（不明の場合は空文字）",
  "products": ["商品1", "商品2", "商品3"],
  "strengths": ["強み1", "強み2", "強み3"],
  "targetCustomers": ["顧客層1", "顧客層2"],
  "operatingDays": "週○日（営業日数）",
  "estimatedPrice": 1200,
  "rating": 4.5,
  "reviewCount": 120,
  "reviewHighlights": ["評価ポイント1", "評価ポイント2", "評価ポイント3"]
}

## 出力の注意点

1. **businessType**: typesから推測し、日本語で具体的に記述（例：「レストラン」→「イタリアンレストラン」）
2. **corporateType**: 法人名が明示されている場合は「法人」、個人名の場合は「個人事業主」、不明な場合は「不明」
3. **companyName**: 「株式会社〇〇」のような法人名が判明している場合のみ記載
4. **products**: Webサイトやtypesから推測される主要な商品・サービスを3-5個
5. **strengths**: 口コミやWebサイトから読み取れる強みを3-5個
6. **targetCustomers**: 口コミやWebサイトから推測される顧客層を2-3個
7. **operatingDays**: 営業時間から計算（例：「週6日」）
8. **estimatedPrice**: price_levelと業種から推定される客単価（円）
   - price_level 1（安い）: 飲食500-1000円、小売1000-3000円
   - price_level 2（やや安い）: 飲食1500-3000円、小売3000-5000円
   - price_level 3（やや高い）: 飲食3000-5000円、小売5000-10000円
   - price_level 4（高い）: 飲食5000円以上、小売10000円以上
9. **rating**: Google Mapsの評価（そのまま）
10. **reviewCount**: 口コミ件数（そのまま）
11. **reviewHighlights**: 口コミで頻出する評価ポイントを3-5個抽出

**重要**: 必ずJSON形式のみを返してください。説明文は不要です。
`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1500,
      });

      const profileText = completion.choices[0].message.content.trim();
      const profile = JSON.parse(profileText);

      // ポイント消費とレート制限カウンター更新
      await userRef.update({
        pointBalance: admin.firestore.FieldValue.increment(-profileCost),
        [rateLimitKey]: todayCalls + 1,
      });

      // ポイント使用履歴を記録
      await admin.firestore().collection('point_transactions').add({
        userId: userId,
        type: 'usage',
        amount: -profileCost,
        description: '店舗プロフィール生成',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[generateStoreProfile] Success. Business: ${profile.businessType}`);

      return {
        profile,
        websiteSummary,
        pointsUsed: profileCost,
        remainingPoints: (userData.pointBalance || 0) - profileCost,
      };
    } catch (error) {
      console.error('[generateStoreProfile] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `OpenAI APIエラー: ${error.message}`
        );
      }

      throw error;
    }
  });

/**
 * Phase 2 会話形式質問生成（テスト用）
 *
 * 業種に応じた会話形式の小質問を生成
 */
exports.generatePhase2ConversationalQuestions = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { businessType, dataItemId, dataItemLabel, collectedData } = data;

    try {
      console.log(`[generatePhase2ConversationalQuestions] User: ${userId}, Business: ${businessType}, DataItem: ${dataItemId}`);

      // Webサイトの情報を取得（Q1-0のwebsiteまたはQ1-0-websiteから）
      let websiteSummary = '';
      let websiteUrl = '';

      // Q1-0のGoogle Maps情報からwebsiteを取得
      if (collectedData && collectedData['Q1-0'] && collectedData['Q1-0'].website) {
        websiteUrl = collectedData['Q1-0'].website;
      }

      // Q1-0-website（手動入力）があればそちらを優先
      if (collectedData && collectedData['Q1-0-website']) {
        websiteUrl = collectedData['Q1-0-website'];
      }

      if (websiteUrl) {
        websiteSummary = await fetchAndSummarizeWebsite(websiteUrl);
      }

      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '小規模事業者持続化補助金の申請書（様式2）作成を支援する質問生成の専門家です。会話形式で、端的に答えられる小質問を生成してください。',
          },
          {
            role: 'user',
            content: buildConversationalQuestionsPrompt(businessType, dataItemId, dataItemLabel, collectedData, websiteSummary),
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const resultText = completion.choices[0].message.content.trim();
      const result = JSON.parse(resultText);

      console.log(`[generatePhase2ConversationalQuestions] Success. Generated ${result.questions?.length || 0} questions`);

      return result;
    } catch (error) {
      console.error('[generatePhase2ConversationalQuestions] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `OpenAI APIエラー: ${error.message}`
        );
      }

      throw error;
    }
  });

/**
 * Phase 2 回答統合
 *
 * 会話形式の小質問の回答を自然な文章に統合
 */
exports.consolidatePhase2Answers = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { businessType, dataItemId, dataItemLabel, conversationAnswers } = data;

    try {
      console.log(`[consolidatePhase2Answers] User: ${userId}, DataItem: ${dataItemId}`);

      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '申請書作成のアシスタントとして、会話の回答を自然な文章に統合してください。である調（常体）で記述し、数値は使わず定性的な表現にしてください。',
          },
          {
            role: 'user',
            content: buildConsolidationPrompt(businessType, dataItemId, dataItemLabel, conversationAnswers),
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const consolidatedText = completion.choices[0].message.content.trim();

      console.log(`[consolidatePhase2Answers] Success`);

      return { consolidatedText };
    } catch (error) {
      console.error('[consolidatePhase2Answers] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `OpenAI APIエラー: ${error.message}`
        );
      }

      throw error;
    }
  });

/**
 * 知識ベースのMarkdownファイルを読み込む
 *
 * @param {string} businessType - 業種（'飲食業' など）
 * @param {string} section - セクション（'顧客ニーズ' など）
 * @returns {string} 知識ベースの内容（Markdown形式）
 */
function loadKnowledgeBase(businessType, section) {
  try {
    // 業種名を正規化（ファイルパスに使用可能な形式に）
    const normalizedBusinessType = businessType.replace(/[\/\\?%*:|"<>]/g, '_');

    // 知識ベースのディレクトリパス（functionsディレクトリ内）
    const knowledgeDir = path.join(__dirname, 'knowledge_base', businessType);

    // ディレクトリが存在しない場合は空文字列を返す
    if (!fs.existsSync(knowledgeDir)) {
      console.log(`[loadKnowledgeBase] Directory not found: ${knowledgeDir}`);
      return '';
    }

    // セクションに関連するファイルを検索
    const files = fs.readdirSync(knowledgeDir)
      .filter(file => {
        // セクション名が含まれるファイル、またはすべてのファイル
        return file.endsWith('.md') && (file.includes(section) || section === '全般');
      })
      .sort(); // ファイル名順にソート

    if (files.length === 0) {
      console.log(`[loadKnowledgeBase] No knowledge files found for ${businessType} / ${section}`);
      return '';
    }

    // ファイルを読み込んで結合
    const knowledgeContent = files.map(file => {
      const filePath = path.join(knowledgeDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    }).join('\n\n---\n\n');

    console.log(`[loadKnowledgeBase] Loaded ${files.length} knowledge file(s) for ${businessType} / ${section}`);
    return knowledgeContent;
  } catch (error) {
    console.error('[loadKnowledgeBase] Error:', error);
    return '';
  }
}

/**
 * 会話形式質問生成用のプロンプト構築
 */
function buildConversationalQuestionsPrompt(businessType, dataItemId, dataItemLabel, collectedData, websiteSummary = '') {
  const websiteInfo = websiteSummary ? `\n\n# 公式Webサイトからの情報\n\n${websiteSummary}\n` : '';

  // 知識ベースを読み込む（Phase 2は「顧客ニーズ」セクション）
  const knowledgeBase = loadKnowledgeBase(businessType, '顧客ニーズ');
  const knowledgeInfo = knowledgeBase ? `\n\n# 参考知識（外部コンテンツから抽出）\n\nあなたは中小企業診断士レベルのAIです。以下の知識を参考に、採択率の高い質問を生成してください。\n\n${knowledgeBase}\n` : '';

  const prompt = `
業種: ${businessType}
${websiteInfo}
${knowledgeInfo}
「顧客ニーズと市場の動向」のセクションで、以下のデータ項目について情報収集します：
- データ項目ID: ${dataItemId}
- データ項目名: ${dataItemLabel}

# タスク

この業種に最適な、会話形式の小質問を3-5個生成してください。

## 質問作成の方針

1. **端的に答えられる質問**: Yes/No、選択式、または1-2行で答えられる質問
2. **業種に特化した質問**: この業種特有の表現や状況を考慮
3. **回答例を提示**: 理想的な回答例をplaceholderに記載（虚偽でなければOK）
4. **定性的な表現**: 「少し増えた」「かなり減った」など、数値ではなく感覚で答えられる選択肢
5. **自然な会話**: 形式的ではなく、会話しているような自然な質問文
6. **複数選択を優先**: 選択肢がある場合は、できるだけ"multi_select"を使用（ユーザーが複数回答できるようにする）

既に収集済みの情報:
${JSON.stringify(collectedData, null, 2)}

# 出力形式（JSON）

必ず以下のJSON形式で回答してください：

{
  "questions": [
    {
      "id": "conv-1",
      "text": "主なお客様の年齢層を教えてください（複数選択可）",
      "type": "multi_select",
      "options": ["10代以下", "20代", "30代", "40代", "50代", "60代以上", "幅広い年齢層"],
      "example": ["30代", "40代"]
    },
    {
      "id": "conv-2",
      "text": "お客様の特徴を教えてください（複数選択可）",
      "type": "multi_select",
      "options": ["ファミリー層が多い", "カップルが多い", "一人客が多い", "団体客が多い", "ビジネス利用が多い"],
      "example": ["ファミリー層が多い", "カップルが多い"]
    },
    {
      "id": "conv-3",
      "text": "他に特徴はありますか？",
      "type": "text",
      "placeholder": "例：リピーターが多い",
      "example": "リピーターが多い",
      "optional": true
    }
  ]
}

type は以下のいずれか:
- "text": 短い回答（1行） - 補足情報や任意回答に使用
- "textarea": 長い回答（複数行） - 詳細な説明が必要な場合
- "number": 数値
- "single_select": 選択肢から1つだけ選択（optionsも含める） - 排他的な選択肢の場合のみ使用
- "multi_select": 選択肢から複数選択（optionsも含める）【推奨】 - 基本的にこれを使用

**重要**:
1. 選択肢がある質問は、原則として"multi_select"を使用してください。
2. **必ず最後の選択肢に「その他」を追加してください**。ユーザーが予想外の回答をする場合に備えます。
3. optional: true の場合、「他にもありますか？」のような任意質問

**「その他」選択肢の例**:
{
  "id": "conv-1",
  "text": "主なお客様の年齢層を教えてください（複数選択可）",
  "type": "multi_select",
  "options": ["10代以下", "20代", "30代", "40代", "50代", "60代以上", "幅広い年齢層", "その他"],
  "example": ["30代", "40代"]
}

「その他」を選択した場合、次の質問でテキスト入力を求めます。
`;

  return prompt;
}

/**
 * 回答統合用のプロンプト構築
 */
function buildConsolidationPrompt(businessType, dataItemId, dataItemLabel, conversationAnswers) {
  const prompt = `
業種: ${businessType}
データ項目: ${dataItemLabel}

以下の会話の回答を、自然な文章（2-3文）に統合してください。
数値は使わず、定性的な表現にしてください。

会話の回答:
${JSON.stringify(conversationAnswers, null, 2)}

# 出力形式

である調（常体）で、自然な文章として統合してください。
文章のみを返してください（JSONではありません）。

例:
「主な顧客は30代〜40代の女性が中心で、ファミリー層が多い。週末は家族連れの来店が特に目立つ。」
`;

  return prompt;
}

/**
 * Phase 3 会話形式質問生成
 *
 * 業種に応じた会話形式の小質問を生成（自社の強み）
 */
exports.generatePhase3ConversationalQuestions = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { businessType, dataItemId, dataItemLabel, collectedData } = data;

    try {
      console.log(`[generatePhase3ConversationalQuestions] User: ${userId}, Business: ${businessType}, DataItem: ${dataItemId}`);

      // Webサイトの情報を取得（Q1-0のwebsiteまたはQ1-0-websiteから）
      let websiteSummary = '';
      let websiteUrl = '';

      // Q1-0のGoogle Maps情報からwebsiteを取得
      if (collectedData && collectedData['Q1-0'] && collectedData['Q1-0'].website) {
        websiteUrl = collectedData['Q1-0'].website;
      }

      // Q1-0-website（手動入力）があればそちらを優先
      if (collectedData && collectedData['Q1-0-website']) {
        websiteUrl = collectedData['Q1-0-website'];
      }

      if (websiteUrl) {
        websiteSummary = await fetchAndSummarizeWebsite(websiteUrl);
      }

      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '小規模事業者持続化補助金の申請書（様式2）作成を支援する質問生成の専門家です。「自社の強み」セクション向けの会話形式で、端的に答えられる小質問を生成してください。',
          },
          {
            role: 'user',
            content: buildPhase3QuestionsPrompt(businessType, dataItemId, dataItemLabel, collectedData, websiteSummary),
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const resultText = completion.choices[0].message.content.trim();
      const result = JSON.parse(resultText);

      console.log(`[generatePhase3ConversationalQuestions] Success. Generated ${result.questions?.length || 0} questions`);

      return result;
    } catch (error) {
      console.error('[generatePhase3ConversationalQuestions] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `OpenAI APIエラー: ${error.message}`
        );
      }

      throw error;
    }
  });

/**
 * Phase 3 回答統合
 *
 * 会話形式の小質問の回答を自然な文章に統合（自社の強み）
 */
exports.consolidatePhase3Answers = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { businessType, dataItemId, dataItemLabel, conversationAnswers } = data;

    try {
      console.log(`[consolidatePhase3Answers] User: ${userId}, DataItem: ${dataItemId}`);

      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '申請書作成のアシスタントとして、会話の回答を自然な文章に統合してください。である調（常体）で記述し、具体的な強みや差別化ポイントを明確に表現してください。',
          },
          {
            role: 'user',
            content: buildPhase3ConsolidationPrompt(businessType, dataItemId, dataItemLabel, conversationAnswers),
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const consolidatedText = completion.choices[0].message.content.trim();

      console.log(`[consolidatePhase3Answers] Success`);

      return { consolidatedText };
    } catch (error) {
      console.error('[consolidatePhase3Answers] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError(
          'internal',
          `OpenAI APIエラー: ${error.message}`
        );
      }

      throw error;
    }
  });

/**
 * Phase 3 会話形式質問生成用のプロンプト構築
 */
function buildPhase3QuestionsPrompt(businessType, dataItemId, dataItemLabel, collectedData, websiteSummary = '') {
  const websiteInfo = websiteSummary ? `\n\n# 公式Webサイトからの情報\n\n${websiteSummary}\n` : '';

  // 知識ベースを読み込む（Phase 3は「強み」セクション）
  const knowledgeBase = loadKnowledgeBase(businessType, '強み');
  const knowledgeInfo = knowledgeBase ? `\n\n# 参考知識（外部コンテンツから抽出）\n\nあなたは中小企業診断士レベルのAIです。以下の知識を参考に、採択率の高い質問を生成してください。\n\n${knowledgeBase}\n` : '';

  const prompt = `
業種: ${businessType}
${websiteInfo}
${knowledgeInfo}
「自社の強み」のセクションで、以下のデータ項目について情報収集します：
- データ項目ID: ${dataItemId}
- データ項目名: ${dataItemLabel}

# タスク

この業種に最適な、会話形式の小質問を3-5個生成してください。

## 質問作成の方針

1. **端的に答えられる質問**: Yes/No、選択式、または1-2行で答えられる質問
2. **業種に特化した質問**: この業種特有の強みや差別化ポイントを引き出す
3. **回答例を提示**: 理想的な回答例をplaceholderに記載（虚偽でなければOK）
4. **具体性を重視**: 「品質が良い」ではなく、「どのような品質のこだわりがあるか」を聞く
5. **自然な会話**: 形式的ではなく、会話しているような自然な質問文
6. **複数選択を優先**: 選択肢がある場合は、できるだけ"multi_select"を使用（ユーザーが複数回答できるようにする）

既に収集済みの情報:
${JSON.stringify(collectedData, null, 2)}

# 業種別の質問例

## 飲食業の場合:
- 「お客様から特に評価されている料理やメニューはありますか？（複数選択可）」
- 「食材や調理方法でこだわっている点は何ですか？（複数選択可）」
- 「競合店と比べて、あなたのお店ならではの特徴は何ですか？（複数選択可）」
- 「Google Mapsの口コミで、よく褒められるポイントは何ですか？（複数選択可）」
`;

  return prompt;
}

/**
 * Q1-0回答後に立地データを自動取得
 *
 * 取得データ:
 * 1. 最寄り駅からの距離（Distance Matrix API）
 * 2. 半径1km以内の競合店舗数（Nearby Search API）
 * 3. 競合店舗の平均評価
 */
exports.fetchLocationData = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック（オプション：必要に応じて有効化）
    // if (!context.auth) {
    //   throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
    // }

    const { lat, lng, businessType, address } = data;

    console.log(`[fetchLocationData] Start: lat=${lat}, lng=${lng}, businessType=${businessType}`);

    if (!lat || !lng) {
      throw new functions.https.HttpsError('invalid-argument', '緯度経度が必要です');
    }

    try {
      // 1. 最寄り駅を検索して距離を取得
      const stationData = await getNearestStationDistance(lat, lng);
      console.log('[fetchLocationData] Station data:', stationData);

      // 2. 競合店舗数を取得
      const competitorsData = await getNearbyCompetitors(lat, lng, businessType);
      console.log('[fetchLocationData] Competitors data:', competitorsData);

      return {
        nearestStation: stationData,
        competitors: competitorsData
      };
    } catch (error) {
      console.error('[fetchLocationData] Error:', error);

      // エラーでも処理を続行（データなしでも質問は進める）
      return {
        nearestStation: null,
        competitors: null,
        error: error.message
      };
    }
  });

/**
 * 最寄り駅からの距離を取得
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Promise<Object|null>} { name, walkingTime, walkingDistance }
 */
async function getNearestStationDistance(lat, lng) {
  const GOOGLE_MAPS_API_KEY = functions.config().google?.maps_api_key || process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[getNearestStationDistance] Google Maps API key not configured');
    return null;
  }

  try {
    // Step 1: 最寄りの駅を検索（Nearby Search APIでtype=train_station）
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&type=train_station&key=${GOOGLE_MAPS_API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      console.log('[getNearestStationDistance] No train station found');
      return null;
    }

    const nearestStation = searchData.results[0];
    const stationName = nearestStation.name;
    const stationLat = nearestStation.geometry.location.lat;
    const stationLng = nearestStation.geometry.location.lng;

    console.log(`[getNearestStationDistance] Nearest station: ${stationName}`);

    // Step 2: Distance Matrix APIで徒歩時間・距離を取得
    const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${stationLat},${stationLng}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`;

    const distanceResponse = await fetch(distanceUrl);
    const distanceData = await distanceResponse.json();

    const element = distanceData.rows[0]?.elements[0];

    if (!element || element.status !== 'OK') {
      console.log('[getNearestStationDistance] Distance calculation failed');
      return null;
    }

    return {
      name: stationName,
      walkingTime: element.duration.text, // "15 mins"
      walkingDistance: element.distance.text // "1.2 km"
    };
  } catch (error) {
    console.error('[getNearestStationDistance] Error:', error);
    return null;
  }
}

/**
 * 半径1km以内の競合店舗を取得
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @param {string} businessType - 業種
 * @returns {Promise<Object|null>} { radius, count, avgRating }
 */
async function getNearbyCompetitors(lat, lng, businessType) {
  const GOOGLE_MAPS_API_KEY = functions.config().google?.maps_api_key || process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[getNearbyCompetitors] Google Maps API key not configured');
    return null;
  }

  try {
    // 業種に応じたGoogle Places APIのtypeを設定
    const typeMap = {
      'カフェ': 'cafe',
      'レストラン': 'restaurant',
      '飲食店': 'restaurant',
      '居酒屋': 'bar',
      'バー': 'bar',
      '美容室': 'beauty_salon',
      '理容室': 'hair_care',
      'エステ': 'spa',
      'ネイルサロン': 'beauty_salon',
      'マッサージ': 'spa',
      '小売店': 'store',
      '雑貨店': 'store',
      'アパレル': 'clothing_store',
      '書店': 'book_store',
      '食品販売': 'store'
    };

    // 業種キーワードでマッチング
    let placeType = 'store'; // デフォルト
    for (const [keyword, type] of Object.entries(typeMap)) {
      if (businessType && businessType.includes(keyword)) {
        placeType = type;
        break;
      }
    }

    console.log(`[getNearbyCompetitors] Searching for type: ${placeType}`);

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1000&type=${placeType}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) {
      console.log('[getNearbyCompetitors] No results');
      return null;
    }

    const places = data.results;
    const count = places.length;

    // 評価がある店舗のみで平均を計算
    const placesWithRating = places.filter(p => p.rating);
    const avgRating = placesWithRating.length > 0
      ? (placesWithRating.reduce((sum, p) => sum + p.rating, 0) / placesWithRating.length).toFixed(1)
      : null;

    console.log(`[getNearbyCompetitors] Found ${count} places, avg rating: ${avgRating}`);

    return {
      radius: 1000, // メートル
      count: count,
      avgRating: avgRating ? parseFloat(avgRating) : null
    };
  } catch (error) {
    console.error('[getNearbyCompetitors] Error:', error);
    return null;
  }
}

/**
 * Phase 3 回答統合用のプロンプト構築
 */
function buildPhase3ConsolidationPrompt(businessType, dataItemId, dataItemLabel, conversationAnswers) {
  const prompt = `
業種: ${businessType}
データ項目: ${dataItemLabel}

以下の会話の回答を、自然な文章（2-3文）に統合してください。
具体的な強みや差別化ポイントを明確に表現してください。

会話の回答:
${JSON.stringify(conversationAnswers, null, 2)}

# 出力形式

である調（常体）で、自然な文章として統合してください。
文章のみを返してください（JSONではありません）。

# 統合の方針

1. 具体的な強みを箇条書きではなく、自然な文章で表現
2. 顧客評価や差別化ポイントを明確に記述
3. 数値は使わず、定性的な表現にする
4. 「〜である」「〜だ」など、である調で統一

例（飲食業の場合）:
「当店の最大の強みは、イタリアで修行したシェフによる本格的なパスタである。地元の有機野菜を使用し、手作りにこだわることで、料理の味と雰囲気の両面で高い評価を得ている。リピーターからは「他では味わえない本場の味」との声が多く寄せられている。」

例（サービス業の場合）:
「当店の強みは、一人ひとりのお客様に合わせたカウンセリングと技術力である。10年以上の経験を持つスタッフが丁寧に対応し、お客様の要望を的確に形にすることで高い満足度を実現している。口コミでは「技術力の高さ」「親身な対応」が特に評価されている。」
`;

  return prompt;
}


/**
 * 外部WebサイトURL（食べログ・ホットペッパー等）から構造化データを取得
 */
exports.fetchWebsiteData = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
    }

    const { url } = data;
    if (!url) {
      throw new functions.https.HttpsError('invalid-argument', 'URLが指定されていません');
    }

    console.log('[fetchWebsiteData] Fetching:', url);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AidantBot/1.0)' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const html = await response.text();
      const htmlSnippet = html.substring(0, 30000);

      let prompt = '';
      if (url.includes('tabelog.com')) {
        prompt = `以下の食べログページのHTMLから、以下の情報をJSON形式で抽出してください：
1. rating (評価点数、数値、例: 3.5)
2. reviewCount (口コミ件数、数値のみ)
3. budget (予算、文字列、例: "¥3,000～¥3,999")
4. popularDishes (人気メニュー、文字列配列、最大3つ)
5. keywords (よく使われているキーワード、文字列配列、最大5つ)
情報が見つからない場合はnullを返してください。JSONのみを返してください。
HTML: ${htmlSnippet}`;
      } else if (url.includes('hotpepper.jp')) {
        prompt = `以下のホットペッパービューティーページのHTMLから、以下の情報をJSON形式で抽出してください：
1. rating (評価点数、数値、例: 4.5)
2. reviewCount (口コミ件数、数値のみ)
3. popularMenus (人気メニュー、文字列配列、最大3つ)
4. priceRange (価格帯、文字列、例: "¥5,000～¥10,000")
5. keywords (よく使われているキーワード、文字列配列、最大5つ)
情報が見つからない場合はnullを返してください。JSONのみを返してください。
HTML: ${htmlSnippet}`;
      } else {
        throw new functions.https.HttpsError('invalid-argument', 'サポートされていないURL');
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'WebページからJSON形式でデータを抽出してください。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const extractedData = JSON.parse(completion.choices[0].message.content.trim());
      console.log('[fetchWebsiteData] Success:', extractedData);

      return {
        success: true,
        data: { ...extractedData, sourceUrl: url, fetchedAt: admin.firestore.Timestamp.now() },
      };
    } catch (error) {
      console.error('[fetchWebsiteData] Error:', error);
      throw new functions.https.HttpsError('internal', `エラー: ${error.message}`);
    }
  });

/**
 * 公式WebサイトURLから要約を生成
 */
exports.summarizeWebsite = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
    }

    const { url } = data;
    if (!url) {
      throw new functions.https.HttpsError('invalid-argument', 'URLが指定されていません');
    }

    console.log('[summarizeWebsite] Fetching:', url);

    try {
      const summary = await fetchAndSummarizeWebsite(url);

      if (!summary) {
        throw new Error('要約の生成に失敗しました');
      }

      console.log('[summarizeWebsite] Success');

      return {
        success: true,
        summary: summary,
      };
    } catch (error) {
      console.error('[summarizeWebsite] Error:', error);
      throw new functions.https.HttpsError('internal', `エラー: ${error.message}`);
    }
  });

/**
 * 会話履歴を記録（Phase 2-6の詳細な会話記録）
 *
 * 記録される情報:
 * - AI生成質問とユーザー回答
 * - 生成されたプロンプト
 * - 様式2の内容
 * - ユーザーのフィードバック・修正
 */
exports.saveConversationHistory = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { conversationId, phase, questionData, answer, metadata } = data;

    try {
      console.log(`[saveConversationHistory] User: ${userId}, Phase: ${phase}, Conversation: ${conversationId}`);

      const db = admin.firestore();

      // 会話履歴コレクション
      const conversationRef = db.collection('conversation_history').doc(conversationId);

      // conversationIdが新規の場合、ドキュメントを作成
      const conversationDoc = await conversationRef.get();

      if (!conversationDoc.exists) {
        // 新規会話の場合、基本情報を作成
        await conversationRef.set({
          userId: userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          businessType: metadata?.businessType || '',
          category: metadata?.category || '',
          phases: {}
        });
      }

      // Phaseごとのデータを更新
      const phaseData = {
        questions: admin.firestore.FieldValue.arrayUnion({
          questionId: questionData?.id || '',
          questionText: questionData?.text || '',
          questionType: questionData?.type || '',
          generatedPrompt: questionData?.prompt || '',
          answer: answer,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      };

      await conversationRef.update({
        [`phases.${phase}`]: phaseData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`[saveConversationHistory] Success`);

      return { success: true };
    } catch (error) {
      console.error('[saveConversationHistory] Error:', error);
      throw new functions.https.HttpsError('internal', `エラー: ${error.message}`);
    }
  });

/**
 * 様式2生成時に完全な会話履歴とフィードバックを記録
 */
exports.saveForm2Generation = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { conversationId, generatedForm2, allAnswers } = data;

    try {
      console.log(`[saveForm2Generation] User: ${userId}, Conversation: ${conversationId}`);

      const db = admin.firestore();
      const conversationRef = db.collection('conversation_history').doc(conversationId);

      await conversationRef.update({
        generatedForm2: {
          content: generatedForm2,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          allAnswers: allAnswers
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`[saveForm2Generation] Success`);

      return { success: true };
    } catch (error) {
      console.error('[saveForm2Generation] Error:', error);
      throw new functions.https.HttpsError('internal', `エラー: ${error.message}`);
    }
  });

/**
 * ユーザーが様式2を修正した内容を記録
 */
exports.saveUserFeedback = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const userId = context.auth.uid;
    const { conversationId, section, originalText, correctedText, rating } = data;

    try {
      console.log(`[saveUserFeedback] User: ${userId}, Conversation: ${conversationId}, Section: ${section}`);

      const db = admin.firestore();
      const conversationRef = db.collection('conversation_history').doc(conversationId);

      const feedback = {
        section: section,
        originalText: originalText,
        correctedText: correctedText,
        rating: rating || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };

      await conversationRef.update({
        userFeedback: admin.firestore.FieldValue.arrayUnion(feedback),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`[saveUserFeedback] Success`);

      return { success: true };
    } catch (error) {
      console.error('[saveUserFeedback] Error:', error);
      throw new functions.https.HttpsError('internal', `エラー: ${error.message}`);
    }
  });

/**
 * 架空の店舗経営者として質問に回答するAI
 *
 * 中小企業診断士AIが生成した質問に対して、
 * 架空の飲食店経営者として具体的かつ自然な回答を生成する。
 *
 * テストデータ生成、質問パターン改善、様式2品質評価に活用。
 */
exports.generateMockAnswer = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const { question, storeProfile, questionType, options } = data;

    try {
      console.log(`[generateMockAnswer] Question: ${question?.substring(0, 50)}...`);

      if (!question || !storeProfile) {
        throw new functions.https.HttpsError('invalid-argument', '質問と店舗プロフィールが必要です');
      }

      // 店舗プロフィールに基づいたプロンプト構築
      const prompt = buildMockAnswerPrompt(question, storeProfile, questionType, options);

      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '飲食店経営者として、具体的で現実的な回答をしてください。数値や具体例を含め、説得力のある回答を心がけてください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const answer = completion.choices[0].message.content.trim();

      console.log(`[generateMockAnswer] Success. Answer length: ${answer.length}`);

      return {
        answer,
        storeProfile: storeProfile.name
      };
    } catch (error) {
      console.error('[generateMockAnswer] Error:', error);

      if (error.status) {
        throw new functions.https.HttpsError('internal', `OpenAI APIエラー: ${error.message}`);
      }

      throw new functions.https.HttpsError('internal', `エラー: ${error.message}`);
    }
  });

/**
 * 架空経営者回答用のプロンプト構築
 */
function buildMockAnswerPrompt(question, storeProfile, questionType, options) {
  // 店舗プロフィール情報の整形
  const profileInfo = `
【店舗情報】
- 店舗名: ${storeProfile.name}
- 業種: ${storeProfile.businessType}
- 立地: ${storeProfile.location}
- 特徴: ${storeProfile.feature}
- 主な顧客: ${storeProfile.customerBase}
- Google Maps評価: ${storeProfile.rating}点（${storeProfile.reviewCount || 100}件のレビュー）
- 営業年数: ${storeProfile.yearsInBusiness || 3}年
- 月間売上: ${storeProfile.monthlySales ? `約${storeProfile.monthlySales}万円` : '非公開'}
- 従業員数: ${storeProfile.employees || 2}名
`;

  // 質問タイプに応じた回答形式の指示
  let answerFormat = '';

  if (questionType === 'multi_select' && options) {
    answerFormat = `
【回答形式】
この質問は複数選択式です。以下の選択肢から2-3個を選び、それぞれについて簡単に説明してください。

選択肢: ${options.join(', ')}

回答例:
「〇〇」と「△△」を選びます。
〇〇については、当店では～という理由で重視しています。
△△については、～という点で他店との差別化を図っています。
`;
  } else if (questionType === 'single_select' && options) {
    answerFormat = `
【回答形式】
この質問は単一選択式です。以下の選択肢から1つを選び、その理由を説明してください。

選択肢: ${options.join(', ')}

回答例:
「〇〇」を選びます。当店では～という理由からです。
`;
  } else {
    answerFormat = `
【回答形式】
具体的な数値やエピソードを含めて、2-3文で回答してください。
`;
  }

  const prompt = `
あなたは「${storeProfile.name}」の経営者です。中小企業診断士から補助金申請のためのヒアリングを受けています。

${profileInfo}

${answerFormat}

【質問】
${question}

【注意事項】
1. この店舗の経営者として、一人称（「私は」「当店では」）で回答してください
2. 具体的な数値や事例を含めて、説得力のある回答をしてください
3. 抽象的な表現（「良い」「素晴らしい」）ではなく、具体的な説明をしてください
4. Google Maps評価やレビュー内容と矛盾しない回答をしてください

【回答】
`;

  return prompt;
}

/**
 * ディープリサーチ（市場調査）
 * 
 * Google Maps情報と業種情報から市場調査を実施
 */
exports.performMarketResearch = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const { answers, placeData } = data;

    try {
      console.log('[performMarketResearch] Starting market research...');
      
      // ディープリサーチ実行
      const researchReport = await performDeepResearch(answers, placeData);
      
      console.log('[performMarketResearch] Research completed successfully');
      
      return {
        success: true,
        report: researchReport
      };
      
    } catch (error) {
      console.error('[performMarketResearch] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        '市場調査中にエラーが発生しました: ' + error.message
      );
    }
  });

/**
 * Q0-2回答のAI判定
 *
 * ウェブ関連費のみ・補助対象外・回答の具体性をチェック
 */
exports.validateQ0_2Answer = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const { answer, previousAnswers } = data;

    try {
      console.log('[validateQ0_2Answer] Validating Q0-2 answer...');
      console.log('[validateQ0_2Answer] Answer:', answer);

      // AI判定実行
      const validationResult = await validateQ0_2Answer(answer, previousAnswers);

      console.log('[validateQ0_2Answer] Validation completed');
      console.log('[validateQ0_2Answer] Result:', validationResult);

      return {
        success: true,
        ...validationResult
      };

    } catch (error) {
      console.error('[validateQ0_2Answer] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Q0-2判定中にエラーが発生しました: ' + error.message
      );
    }
  });

/**
 * AIによる販売費及び一般管理費の推定
 *
 * 業種別の業界平均値と売上規模から経費内訳を自動推定
 */
exports.estimateExpenses = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const { businessType, revenue, employees } = data;

    try {
      console.log('[estimateExpenses] Estimating expenses...');
      console.log('[estimateExpenses] Business type:', businessType);
      console.log('[estimateExpenses] Revenue:', revenue);

      // 業種別の経費比率（業界平均値）
      const industryRatios = {
        '飲食業': {
          personnel_costs: 0.30, // 人件費 30%
          rent: 0.10,            // 地代家賃 10%
          advertising: 0.03,     // 広告宣伝費 3%
          utilities: 0.06,       // 水道光熱費 6%
          communication: 0.01,   // 通信費 1%
          transportation: 0.02,  // 旅費交通費 2%
          supplies: 0.02,        // 消耗品費 2%
          depreciation: 0.03,    // 減価償却費 3%
          insurance: 0.01,       // 保険料 1%
          taxes: 0.01,           // 租税公課 1%
          repairs: 0.02,         // 修繕費 2%
          other: 0.04            // その他 4%
        },
        '小売業': {
          personnel_costs: 0.25,
          rent: 0.12,
          advertising: 0.05,
          utilities: 0.03,
          communication: 0.01,
          transportation: 0.03,
          supplies: 0.02,
          depreciation: 0.04,
          insurance: 0.01,
          taxes: 0.01,
          repairs: 0.02,
          other: 0.05
        },
        'サービス業（美容・理容業）': {
          personnel_costs: 0.35,
          rent: 0.15,
          advertising: 0.04,
          utilities: 0.05,
          communication: 0.02,
          transportation: 0.01,
          supplies: 0.03,
          depreciation: 0.05,
          insurance: 0.02,
          taxes: 0.01,
          repairs: 0.02,
          other: 0.05
        },
        'サービス業（その他）': {
          personnel_costs: 0.35,
          rent: 0.10,
          advertising: 0.03,
          utilities: 0.03,
          communication: 0.02,
          transportation: 0.03,
          supplies: 0.02,
          depreciation: 0.04,
          insurance: 0.01,
          taxes: 0.01,
          repairs: 0.02,
          other: 0.04
        },
        '宿泊業・娯楽業': {
          personnel_costs: 0.30,
          rent: 0.08,
          advertising: 0.05,
          utilities: 0.08,
          communication: 0.02,
          transportation: 0.02,
          supplies: 0.03,
          depreciation: 0.06,
          insurance: 0.02,
          taxes: 0.01,
          repairs: 0.03,
          other: 0.05
        },
        '製造業その他': {
          personnel_costs: 0.28,
          rent: 0.08,
          advertising: 0.02,
          utilities: 0.05,
          communication: 0.01,
          transportation: 0.03,
          supplies: 0.03,
          depreciation: 0.07,
          insurance: 0.02,
          taxes: 0.01,
          repairs: 0.04,
          other: 0.06
        }
      };

      // 業種が見つからない場合はデフォルト値
      const ratios = industryRatios[businessType] || industryRatios['サービス業（その他）'];

      // 売上から各経費を推定
      const estimates = {};
      for (const [key, ratio] of Object.entries(ratios)) {
        estimates[key] = Math.round(revenue * ratio);
      }

      // 合計を計算
      const total = Object.values(estimates).reduce((sum, value) => sum + value, 0);

      console.log('[estimateExpenses] Estimation completed');
      console.log('[estimateExpenses] Total:', total);

      return {
        success: true,
        estimates,
        total,
        confidence: 'medium', // 推定精度: medium
        message: `業種「${businessType}」の業界平均値から推定しました。後で修正可能です。`
      };

    } catch (error) {
      console.error('[estimateExpenses] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        '経費推定中にエラーが発生しました: ' + error.message
      );
    }
  });

/**
 * 画像からのOCR処理（Google Cloud Vision API）
 *
 * 販売費及び一般管理費内訳書から数値を抽出
 */
exports.extractExpensesFromImage = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const { imageUrl } = data;

    try {
      console.log('[extractExpensesFromImage] Processing image...');

      // OpenAI Vision APIで画像を解析
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `あなたは販売費及び一般管理費内訳書から数値を抽出する専門家です。
画像から以下の経費項目の金額を抽出してください：

1. 人件費（役員報酬＋給料手当）
2. 地代家賃
3. 広告宣伝費
4. 水道光熱費
5. 通信費
6. 旅費交通費
7. 消耗品費
8. 減価償却費
9. 保険料
10. 租税公課
11. 修繕費
12. その他

JSON形式で出力してください。単位は万円です。
見つからない項目は省略してください。

出力例：
{
  "personnel_costs": 500,
  "rent": 120,
  "utilities": 30
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'この画像から販売費及び一般管理費の内訳を抽出してください'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const response = completion.choices[0].message.content;
      console.log('[extractExpensesFromImage] OCR response:', response);

      // JSONをパース
      let extractedData;
      try {
        // JSONブロックから抽出（```json ... ``` の形式に対応）
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;
        extractedData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('[extractExpensesFromImage] JSON parse error:', parseError);
        throw new Error('画像からの数値抽出に失敗しました');
      }

      // 合計を計算
      const total = Object.values(extractedData).reduce((sum, value) => sum + value, 0);

      console.log('[extractExpensesFromImage] Extraction completed');

      return {
        success: true,
        extractedData,
        total,
        message: '画像から経費内訳を抽出しました。内容を確認してください。'
      };

    } catch (error) {
      console.error('[extractExpensesFromImage] Error:', error);
      return {
        success: false,
        message: 'OCR処理に失敗しました。手動で入力してください。',
        error: error.message
      };
    }
  });

/**
 * PDFからのOCR処理
 *
 * 販売費及び一般管理費内訳書から数値を抽出
 */
exports.extractExpensesFromPDF = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const { pdfUrl } = data;

    try {
      console.log('[extractExpensesFromPDF] Processing PDF...');

      // PDFをダウンロード
      const response = await fetch(pdfUrl);
      const pdfBuffer = await response.arrayBuffer();

      // Note: PDF処理は複雑なため、一旦画像変換を推奨
      console.log('[extractExpensesFromPDF] PDF processing not fully implemented');

      return {
        success: false,
        message: 'PDF処理は現在対応していません。画像ファイル（JPG、PNG）をアップロードしてください。'
      };

    } catch (error) {
      console.error('[extractExpensesFromPDF] Error:', error);
      return {
        success: false,
        message: 'PDF処理に失敗しました。画像ファイルをお試しください。',
        error: error.message
      };
    }
  });
