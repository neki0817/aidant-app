/**
 * AI質問生成サービス（小規模事業者持続化補助金申請サポート）
 *
 * ⚠️ 注意: このモジュールは現在、セキュリティ上の理由でOpenAI API呼び出しを無効化しています。
 * 将来的にCloud Functions経由で実装予定です。
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
 * @version 3.0.0
 * @updated 2025-10-24
 */

/**
 * Google Mapsの情報とこれまでの回答を分析してAIが質問を生成
 * @param {Object} placeData - Google Mapsから取得した店舗情報
 * @param {Object} previousAnswers - これまでの回答内容
 * @returns {Promise<Array>} 生成された質問リスト
 */
export const generateAIQuestions = async (placeData, previousAnswers) => {
  try {
    console.log('[AI Question Generator] ⚠️ OpenAI API is disabled for security. Returning default questions.');
    console.log('[AI Question Generator] Place:', {
      placeName: placeData?.name,
      answersCount: Object.keys(previousAnswers).length
    });

    // ⚠️ OpenAI API呼び出しは無効化されています（セキュリティ対策）
    // デフォルトの質問を返します
    return {
      analysis: "事業の成長に向けて、販路開拓の具体的な計画を立てる必要があります。",
      questions: [
        {
          id: "Q4-AI-1",
          text: "現在抱えている最も大きな経営課題は何ですか？",
          type: "textarea",
          placeholder: "例：新規顧客の獲得が難しい、リピート率が低い、客単価が上がらない など",
          helpText: "補助金で解決したい課題を明確にしましょう",
          reasoning: "基本的な課題把握"
        },
        {
          id: "Q4-AI-2",
          text: "お客様からよく寄せられる要望や意見を教えてください",
          type: "textarea",
          placeholder: "例：駐車場がほしい、営業時間を延長してほしい、オンライン注文に対応してほしい など",
          helpText: "顧客ニーズを把握し、補助事業に活かしましょう",
          reasoning: "顧客ニーズの把握"
        },
        {
          id: "Q4-AI-3",
          text: "今回の補助金で解決したい具体的な課題を教えてください",
          type: "textarea",
          placeholder: "例：新規顧客を月20名獲得したい、客単価を3,000円から3,500円に上げたい など",
          helpText: "具体的な数値目標を設定しましょう",
          reasoning: "補助金活用の明確化"
        }
      ]
    };
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
    console.log('[AI Question Generator] ⚠️ OpenAI API is disabled for security. Follow-up questions are not available.');

    // ⚠️ OpenAI API呼び出しは無効化されています（セキュリティ対策）
    // 追加質問機能は将来的にCloud Functions経由で実装予定
    return null;
  } catch (error) {
    console.error('[AI Question Generator] Error generating follow-up:', error);
    return null;
  }
};

export default { generateAIQuestions, generateFollowUpQuestion };
