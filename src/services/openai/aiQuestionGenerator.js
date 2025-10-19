import OpenAI from 'openai';

/**
 * AI質問生成サービス（小規模事業者持続化補助金申請サポート）
 *
 * 【知識ベース】
 * このモジュールは以下の参考資料に基づいて質問を生成します：
 *
 * 1. 留意点.md - 小規模事業者持続化補助金 申請書作成時の留意点
 *    - 審査で評価される11のポイント
 *    - 制度上の重要な制約（ウェブサイト関連費1/4以内、後払い制度等）
 *    - 様式2（経営計画書）作成の留意点
 *    - 様式3（経費明細表）作成の留意点
 *
 * 2. 参考資料フォルダ内のPDFファイル
 *    - 採択事例（飲食店、美容業、小売業等）
 *    - 公募要領、ガイドブック、Q&A
 *    - 採択戦略資料
 *
 * 【重要な評価ポイント】
 * 1. 審査項目に沿った記述
 * 2. 誰にでも分かりやすい表現
 * 3. ターゲットの具体性（年齢層・地域・性別・職業）
 * 4. 論理的構成（課題→原因→解決策→実行→効果）
 * 5. 数値による裏付け（売上目標、客数、客単価）
 * 6. ビフォーアフターの明示
 * 7. 強み・弱みと市場ニーズの把握
 * 8. 経営方針と補助事業の整合性
 * 9. デジタル技術の活用
 * 10. 費用の透明性・適切性
 * 11. 箇条書きでの情報整理
 *
 * 【制度上の制約】
 * - ウェブサイト関連費：補助金総額の1/4以内かつ最大50万円、単独申請不可
 * - 数値目標：実績値の1.2〜1.3倍が現実的
 * - 投資回収期間：3年以内が望ましい
 * - 補助金は後払い
 *
 * @version 2.0.0
 * @updated 2025-01-19
 */

// OpenAI APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Google Mapsの情報とこれまでの回答を分析してAIが質問を生成
 * @param {Object} placeData - Google Mapsから取得した店舗情報
 * @param {Object} previousAnswers - これまでの回答内容
 * @returns {Promise<Array>} 生成された質問リスト
 */
export const generateAIQuestions = async (placeData, previousAnswers) => {
  try {
    console.log('[AI Question Generator] Generating questions based on:', {
      placeName: placeData?.name,
      answersCount: Object.keys(previousAnswers).length
    });

    // Google Mapsデータの要約
    const placeInfo = {
      name: placeData?.name || '不明',
      rating: placeData?.rating || 'N/A',
      totalReviews: placeData?.user_ratings_total || 0,
      reviews: placeData?.reviews || [],
      address: placeData?.formatted_address || '不明',
    };

    // 口コミの分析（最大5件）
    const reviewSummary = placeInfo.reviews.slice(0, 5).map((review, idx) => ({
      rating: review.rating,
      text: review.text?.substring(0, 200) || '（テキストなし）'
    }));

    // これまでの回答の要約
    const answersSummary = {
      businessType: previousAnswers['Q1-1'] || '不明',
      goals: previousAnswers['Q1-2'] || [],
      initiatives: previousAnswers['Q1-3'] || [],
      philosophy: previousAnswers['Q2-5'] || '不明'
    };

    const prompt = `あなたは小規模事業者持続化補助金の申請サポートAIです。
店舗のGoogle Maps情報と事業者の回答を分析し、「販路開拓（新規顧客獲得・売上向上）につながる具体的な計画」を引き出す質問を3-5個生成してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【最重要】補助金の目的は「販路開拓」です
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 内装工事、設備導入、スマートロックなどは「業務効率化」や「設備投資」に見えます
- しかし、それらが「どのように新規顧客獲得や売上向上につながるか」を明確にする必要があります
- 質問を通じて、取組と販路開拓のつながりを具体化させてください

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【審査で評価される11のポイント】※質問生成時に必ず意識すること
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 審査項目に沿った記述がされているか
2. 誰にでも分かりやすい表現か（専門用語を避ける）
3. ターゲットが具体的か（年齢層・地域・性別・職業など）
4. 論理的な構成でストーリーが描けているか（課題→原因→解決策→実行→効果）
5. 数字で裏付けがあるか（売上目標、客数、客単価など）
6. ビフォーアフターの変化が明示されているか
7. 自社の強み・弱みと市場・顧客ニーズを正確に把握しているか
8. 経営方針・目標と補助事業計画の整合性があるか
9. 新たな価値の創造とデジタル技術の活用があるか
10. 費用の透明性と適切性があるか（見積書・積算根拠）
11. 箇条書きで情報が整理されているか

【重要な制度上の制約】※質問で確認が必要な場合がある
- ウェブサイト関連費は補助金総額の1/4以内かつ最大50万円、単独申請不可
- 汎用性の高いもの（パソコン、文房具等）は対象外
- 10万円超の支払いは銀行振込必須
- 補助金は後払いのため、資金繰り計画が必要
- 投資回収期間は3年以内が望ましい

【数値目標の現実性】
- 売上目標は実績値の1.2〜1.3倍程度が現実的
- 短期間で2倍・3倍は非現実的と見なされるリスク
- 必ず根拠（広告反応率、来店見込み、客単価向上等）を示す

【デジタル技術活用の重要性】
- デジタル活用を全く記載しないと評価が下がる可能性
- 最低でもSNS情報発信、オンライン注文、キャッシュレス決済等を検討
- デジタル技術が販路開拓にどう貢献するかを明確化

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【店舗情報（Google Maps）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
店舗名: ${placeInfo.name}
評価: ${placeInfo.rating}点（${placeInfo.totalReviews}件）
住所: ${placeInfo.address}

【口コミサマリー（最新5件）】
${reviewSummary.map((r, i) => `${i + 1}. [${r.rating}★] ${r.text}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【事業者の回答】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
業種: ${answersSummary.businessType}
目標: ${Array.isArray(answersSummary.goals) ? answersSummary.goals.join('、') : answersSummary.goals}
検討中の取組: ${Array.isArray(answersSummary.initiatives) ? answersSummary.initiatives.join('、') : answersSummary.initiatives}
経営理念: ${answersSummary.philosophy}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【業種別の質問例】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 飲食店: 食材のこだわり、メニュー開発、客席数、客単価、デジタル注文導入
- 小売業: 商品の仕入れ先、品揃え、陳列方法、接客スタイル、ECサイト構築
- 美容・理容業: 使用する商材、技術力、顧客管理、リピート施策、予約システム
- 教室・学習塾: カリキュラム、講師の経歴、生徒募集方法、オンライン授業
- 整体・マッサージ: 施術内容、資格・経験、患者管理、リピート率、Web予約
- その他: 業種の特性に応じた強み・弱み・課題、デジタル活用

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【質問生成のポイント】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 口コミから見える強み・弱みを踏まえて質問する（評価ポイント7）
2. 検討中の取組が「販路開拓」にどうつながるか深堀りする（評価ポイント4・8）
   例：「壁紙交換」→「どんな客層を新たに獲得したいですか？」
   例：「スマートロック」→「削減された時間で何をして売上を増やしますか？」
   例：「内装工事」→「改装後、客単価や客数はどう変わる見込みですか？」
3. 具体的な数値（客数、売上、客単価）を引き出す質問にする（評価ポイント5）
   - 現実的な目標値（実績の1.2〜1.3倍）を意識させる
   - 根拠（広告反応率、来店見込み等）を求める
4. ターゲット顧客を具体化する質問をする（評価ポイント3）
   - 年齢層、地域、性別、職業、年収帯など
5. ビフォーアフターを明確化する質問をする（評価ポイント6）
   - 現状の課題 → 補助事業 → 期待効果の流れ
6. デジタル技術活用を確認する質問を含める（評価ポイント9）
   - SNS広告、オンライン注文、キャッシュレス決済、予約システム等
7. 投資の妥当性と回収計画を確認する質問をする（評価ポイント10）
   - 費用対効果、投資回収期間（3年以内推奨）
8. Yes/Noではなく、詳細を引き出す質問にする
9. 3-5個の質問を生成する

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【質問例】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 「〇〇の取組で、具体的にどんな新しいお客様を獲得したいですか？（年齢層・利用目的・地域など）」
- 「改装後、客単価や来店頻度はどのくらい変わると予想していますか？（現状〇〇円→目標〇〇円のように）」
- 「口コミで『〇〇』という評価がありますが、この強みをどう活かして新規顧客を獲得しますか？」
- 「〇〇を導入することで削減される時間やコストを、どのように売上向上に使いますか？」
- 「今回の取組で、どのようなデジタル技術を活用する予定ですか？（SNS広告、予約システム、キャッシュレス決済等）」
- 「投資した費用を何年で回収できる見込みですか？その根拠は？」
- 「ターゲット顧客は誰ですか？（例：30代女性会社員、週末に家族連れで訪れる地域住民など）」

【出力形式】
JSON形式で以下の形式で返してください：
{
  "analysis": "口コミと回答の分析結果（2-3文で要約）。特に販路開拓の課題を指摘する。",
  "questions": [
    {
      "id": "Q4-AI-1",
      "text": "質問文",
      "type": "textarea",
      "placeholder": "回答例を示してください。具体的な数値や状況を含めた例文を記載。",
      "helpText": "質問の意図や回答のポイントを簡潔に説明",
      "reasoning": "この質問をする理由"
    },
    ...
  ]
}

【重要】placeholder（回答例）の記載方法：
- 具体的な数値を含めた例文を必ず記載する
- ユーザーが「この形式で答えればいいんだ」とすぐ分かるようにする
- 現実的な数値（実績の1.2〜1.3倍程度）を意識させる
- 例：「現状の客単価3,500円→目標4,200円（1.2倍）、来店頻度が月1回→月1.5回に増加見込み」
- 例：「30代カップル（記念日利用）を月10組獲得し、月売上30万円増を目指す」
- 例：「Instagram広告で月50件の問い合わせを獲得、うち20%（10件）が来店につながる見込み」`;

    console.log('[AI Question Generator] Calling OpenAI API...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは小規模事業者持続化補助金の申請サポート専門家です。

【あなたの役割】
1. Google Mapsの口コミと事業者の回答を分析し、採択率を高める質問を生成する
2. 審査で評価される11のポイントを意識した質問を作成する
3. 「販路開拓（新規顧客獲得・売上向上）」に焦点を当てた質問をする
4. 具体的な数値目標や根拠を引き出す質問をする
5. ターゲット顧客、ビフォーアフター、デジタル活用を明確化する質問をする

【重要な知識】
- ウェブサイト関連費：補助金総額の1/4以内かつ最大50万円、単独申請不可
- 数値目標：実績値の1.2〜1.3倍が現実的（2倍・3倍は非現実的）
- 投資回収期間：3年以内が望ましい
- デジタル活用：記載なしは評価が下がる可能性あり
- 論理的一貫性：課題→原因→解決策→実行→効果のストーリー

【質問生成の原則】
- 審査員（業界素人）でも理解できる平易な表現
- Yes/Noではなく、詳細を引き出す質問形式
- 補助事業と販路開拓のつながりを明確化させる
- 根拠のある具体的な数値目標を求める`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log('[AI Question Generator] Questions generated:', result);

    return result;
  } catch (error) {
    console.error('[AI Question Generator] Error:', error);

    // エラー時はデフォルトの質問を返す
    return {
      analysis: "AI分析中にエラーが発生しました。標準的な質問を使用します。",
      questions: [
        {
          id: "Q4-AI-1",
          text: "現在抱えている最も大きな経営課題は何ですか？",
          type: "textarea",
          reasoning: "基本的な課題把握"
        },
        {
          id: "Q4-AI-2",
          text: "お客様からよく寄せられる要望や意見を教えてください",
          type: "textarea",
          reasoning: "顧客ニーズの把握"
        },
        {
          id: "Q4-AI-3",
          text: "今回の補助金で解決したい具体的な課題を教えてください",
          type: "textarea",
          reasoning: "補助金活用の明確化"
        }
      ]
    };
  }
};

/**
 * ユーザーの回答に基づいて追加質問を生成
 * @param {string} previousQuestion - 前の質問
 * @param {string} userAnswer - ユーザーの回答
 * @param {Object} context - コンテキスト情報
 * @returns {Promise<Object|null>} 追加質問または null
 */
export const generateFollowUpQuestion = async (previousQuestion, userAnswer, context) => {
  try {
    console.log('[AI Question Generator] Generating follow-up question...');

    const prompt = `前の質問に対するユーザーの回答を分析し、必要に応じて追加質問を生成してください。

【前の質問】
${previousQuestion}

【ユーザーの回答】
${userAnswer}

【判断基準】
- 回答が不十分または曖昧な場合のみ追加質問する
- 回答が十分詳しい場合は追加質問不要
- 補助金申請に必要な情報が足りているかを判断

【不十分と判断するケース】
1. ターゲット顧客が不明確（「幅広い年齢層」など曖昧な表現）
2. 数値目標がない、または根拠が不明
3. 販路開拓とのつながりが不明確（業務効率化のみで終わっている）
4. ビフォーアフターが不明確
5. デジタル活用の記載がない
6. 投資回収の見込みが不明
7. 非現実的な目標（実績の2倍以上など）で根拠が薄い

【追加質問のポイント】
- 具体的な数値を引き出す（客数、売上、客単価など）
- ターゲットを明確化する（年齢層、地域、性別、職業など）
- 販路開拓への貢献を明確化する
- デジタル技術の活用を確認する
- 現実的な根拠を求める

【出力形式】
{
  "needFollowUp": true/false,
  "question": "追加質問文（needFollowUpがtrueの場合のみ）",
  "reasoning": "追加質問が必要/不要な理由"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは小規模事業者持続化補助金の申請サポート専門家です。
回答の十分性を判断し、採択率を高めるために必要な場合のみ追加質問を生成します。

【重要な評価基準】
- ターゲット顧客は具体的か（年齢層、地域、性別、職業など）
- 数値目標は具体的で根拠があるか（実績の1.2〜1.3倍が現実的）
- 販路開拓（新規顧客獲得・売上向上）とのつながりは明確か
- ビフォーアフターの変化は明確か
- デジタル技術の活用は記載されているか
- 投資回収の見込みは示されているか（3年以内推奨）

【追加質問が不要なケース】
- 上記の評価基準を十分に満たしている
- 補助金申請書作成に必要な情報が揃っている
- 具体的で実現可能な計画が示されている`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log('[AI Question Generator] Follow-up result:', result);

    return result.needFollowUp ? {
      id: `Q4-AI-followup-${Date.now()}`,
      text: result.question,
      type: "textarea",
      reasoning: result.reasoning
    } : null;
  } catch (error) {
    console.error('[AI Question Generator] Error generating follow-up:', error);
    return null;
  }
};

export default { generateAIQuestions, generateFollowUpQuestion };
