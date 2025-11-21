/**
 * 深堀り質問ロジック
 * 各質問に対してAIが追加で質問するパターンを定義
 */

/**
 * 回答に基づいて動的にplaceholderを生成
 */
const generateDynamicPlaceholder = (questionType, answer, placeInfo, businessType) => {
  // ターゲット顧客の年齢層
  if (questionType === 'age') {
    if (answer.match(/女性/)) {
      return '例：30代〜40代の女性';
    } else if (answer.match(/男性/)) {
      return '例：40代〜50代の男性';
    }
    return '例：30代〜40代';
  }

  // 性別の割合
  if (questionType === 'gender') {
    if (answer.match(/女性/)) {
      return '例：女性が7〜8割';
    }
    return '例：男性と女性は半々';
  }

  // ファミリー層
  if (questionType === 'family') {
    if (businessType.includes('飲食')) {
      return '例：週末のランチタイムは家族連れが多い';
    } else if (businessType.includes('小売')) {
      return '例：日曜日は家族連れの来店が増える';
    }
    return '例：週末は家族連れも多い';
  }

  // カップル層
  if (questionType === 'couple') {
    if (businessType.includes('飲食')) {
      return '例：夜はカップルが多い';
    }
    return '例：デート利用も多い';
  }

  // シニア層
  if (questionType === 'senior') {
    if (businessType.includes('飲食')) {
      return '例：平日昼間はシニア層が中心';
    }
    return '例：午前中はシニア層が多い';
  }

  // 接客・サービス
  if (questionType === 'service') {
    if (businessType.includes('美容')) {
      return '例：カウンセリングの丁寧さ';
    } else if (businessType.includes('飲食')) {
      return '例：スタッフの笑顔と気配り';
    }
    return '例：スタッフの丁寧な対応';
  }

  // 雰囲気
  if (questionType === 'atmosphere') {
    if (businessType.includes('飲食')) {
      return '例：落ち着いた雰囲気でゆっくりできる';
    } else if (businessType.includes('美容')) {
      return '例：清潔感があり居心地が良い';
    }
    return '例：落ち着いた雰囲気';
  }

  // 味・品質
  if (questionType === 'quality') {
    if (businessType.includes('飲食')) {
      return '例：地元の新鮮な食材を使用';
    }
    return '例：品質にこだわっている';
  }

  // コスパ
  if (questionType === 'value') {
    if (businessType.includes('飲食')) {
      return '例：ボリュームがあって価格も手頃';
    }
    return '例：品質の割に価格が手頃';
  }

  // アクセス
  if (questionType === 'access') {
    if (placeInfo.address && placeInfo.address.includes('駅')) {
      return '例：駅から徒歩3分で便利';
    }
    return '例：駅から近くてアクセスが良い';
  }

  return '例：';
};

/**
 * 回答に基づいて深堀り質問を生成
 * @param {string} questionId - 質問ID
 * @param {string} answer - ユーザーの回答
 * @param {Object} allAnswers - 全ての回答データ
 * @returns {Object} - { confirmMessage, followUps } を含むオブジェクト
 */
export const generateFollowUpQuestions = (questionId, answer, allAnswers) => {
  const followUps = [];
  let confirmMessage = ''; // 確認メッセージ

  // Google Maps情報を取得
  const placeInfo = allAnswers['Q1-0'] || {};
  const businessType = allAnswers['Q1-1'] || '';
  const rating = placeInfo.rating || 0;
  const reviews = placeInfo.reviews || [];
  const userRatingsTotal = placeInfo.userRatingsTotal || 0;

  // P2-1: ターゲット顧客
  if (questionId === 'P2-1') {
    confirmMessage = `「${answer}」ですね。`;

    // 幅広い年齢層を示す表現がある場合は、詳細な年齢を聞かない
    const isBroadAge = answer.match(/子供|子ども|お年寄り|老若男女|幅広い|様々|色々|いろいろ|全年齢|年齢問わず|誰でも/);

    // 年齢層の詳細を確認（幅広い年齢層でない場合のみ）
    if (!isBroadAge && !answer.match(/\d+代/)) {
      followUps.push({
        id: `${questionId}-followup-1`,
        text: '年齢層は具体的にどれくらいですか？',
        type: 'text',
        placeholder: generateDynamicPlaceholder('age', answer, placeInfo, businessType)
      });
    }

    // 性別が明記されていない場合（幅広い年齢層の場合は性別も問わない可能性が高いのでスキップ）
    if (!isBroadAge && !answer.match(/男性|女性|カップル|ファミリー|男女|老若男女/)) {
      followUps.push({
        id: `${questionId}-followup-2`,
        text: '男性客も来店されますか？それとも女性が多いですか？',
        type: 'text',
        placeholder: generateDynamicPlaceholder('gender', answer, placeInfo, businessType)
      });
    }

    // Google Maps口コミから客層を推測して確認
    if (reviews.length > 0) {
      const reviewKeywords = reviews.map(r => r.text).join(' ');

      // ファミリー層の兆候
      if (reviewKeywords.match(/子供|子ども|ファミリー|家族/) && !answer.match(/家族|ファミリー|子供|子ども/)) {
        followUps.push({
          id: `${questionId}-followup-family`,
          text: '口コミを見ると、ファミリー層も来られているようですね。家族連れのお客様も多いですか？',
          type: 'text',
          placeholder: generateDynamicPlaceholder('family', answer, placeInfo, businessType)
        });
      }

      // カップル・デート層の兆候
      if (reviewKeywords.match(/デート|カップル|二人/) && !answer.match(/カップル|デート/)) {
        followUps.push({
          id: `${questionId}-followup-couple`,
          text: 'デート利用の口コミもありますね。カップルのお客様も多いですか？',
          type: 'text',
          placeholder: generateDynamicPlaceholder('couple', answer, placeInfo, businessType)
        });
      }

      // 高齢者層の兆候
      if (reviewKeywords.match(/高齢|シニア|お年寄り/) && !answer.match(/高齢|シニア|お年寄り/)) {
        followUps.push({
          id: `${questionId}-followup-senior`,
          text: 'シニア層からの口コミもありますね。高齢のお客様も多いですか？',
          type: 'text',
          placeholder: generateDynamicPlaceholder('senior', answer, placeInfo, businessType)
        });
      }
    }

    // その他の層がいるか確認（口コミ分析で追加されていなければ）
    if (followUps.length < 2) {
      followUps.push({
        id: `${questionId}-followup-3`,
        text: 'それ以外にも、来店される方はいますか？',
        type: 'text',
        placeholder: '例：週末は家族連れも多い'
      });
    }
  }

  // P2-2: 選ばれる理由
  if (questionId === 'P2-2') {
    confirmMessage = `なるほど、「${answer}」が理由なんですね。`;

    // Google Maps口コミから強みを分析
    if (reviews.length > 0) {
      // 実際の口コミテキストから関連する文を抽出する関数
      const extractRelevantReview = (keywords) => {
        for (const review of reviews) {
          for (const keyword of keywords) {
            if (review.text.includes(keyword)) {
              // 該当キーワードを含む文を抽出（最大50文字）
              const sentences = review.text.split(/[。、\n]/);
              for (const sentence of sentences) {
                if (sentence.includes(keyword) && sentence.length > 5) {
                  return sentence.substring(0, 50);
                }
              }
            }
          }
        }
        return null;
      };

      const reviewKeywords = reviews.map(r => r.text).join(' ');

      // 接客・サービスへの言及
      const serviceKeywords = ['接客', 'スタッフ', '店員', '丁寧', '親切', '優しい', '対応'];
      const serviceReview = extractRelevantReview(serviceKeywords);
      if (reviewKeywords.match(/接客|スタッフ|店員|丁寧|親切|優しい/) && !answer.match(/接客|スタッフ|店員|丁寧|親切/)) {
        const reviewQuote = serviceReview ? `「${serviceReview}」` : '「接客が良い」';
        followUps.push({
          id: `${questionId}-followup-service`,
          text: `口コミで${reviewQuote}と評価されていますね。スタッフの対応も理由の一つですか？`,
          type: 'text',
          placeholder: generateDynamicPlaceholder('service', answer, placeInfo, businessType)
        });
      }

      // 雰囲気・空間への言及
      const atmosphereKeywords = ['雰囲気', '空間', '落ち着', 'おしゃれ', 'インテリア', '居心地', '素敵'];
      const atmosphereReview = extractRelevantReview(atmosphereKeywords);
      if (reviewKeywords.match(/雰囲気|空間|落ち着|おしゃれ|インテリア/) && !answer.match(/雰囲気|空間|落ち着|おしゃれ/)) {
        const reviewQuote = atmosphereReview ? `「${atmosphereReview}」` : '「雰囲気が良い」';
        followUps.push({
          id: `${questionId}-followup-atmosphere`,
          text: `口コミで${reviewQuote}という評価も多いですね。お店の雰囲気も魅力ですか？`,
          type: 'text',
          placeholder: generateDynamicPlaceholder('atmosphere', answer, placeInfo, businessType)
        });
      }

      // 味・品質への言及
      const qualityKeywords = ['美味し', 'おいしい', '味', '品質', '新鮮', '美味', '旨'];
      const qualityReview = extractRelevantReview(qualityKeywords);
      if (reviewKeywords.match(/美味し|おいしい|味|品質|新鮮/) && !answer.match(/美味し|おいしい|味|品質/)) {
        const reviewQuote = qualityReview ? `「${qualityReview}」` : '「美味しい」';
        followUps.push({
          id: `${questionId}-followup-quality`,
          text: `口コミで${reviewQuote}との評価もありますね。味や品質にもこだわりがありますか？`,
          type: 'text',
          placeholder: generateDynamicPlaceholder('quality', answer, placeInfo, businessType)
        });
      }

      // コスパへの言及
      const valueKeywords = ['安い', 'お得', 'コスパ', 'リーズナブル', '手頃', '値段'];
      const valueReview = extractRelevantReview(valueKeywords);
      if (reviewKeywords.match(/安い|お得|コスパ|リーズナブル/) && !answer.match(/安い|価格|お得|コスパ/)) {
        const reviewQuote = valueReview ? `「${valueReview}」` : 'コスパを評価する';
        followUps.push({
          id: `${questionId}-followup-value`,
          text: `口コミで${reviewQuote}という声もありますね。価格設定も選ばれるポイントですか？`,
          type: 'text',
          placeholder: generateDynamicPlaceholder('value', answer, placeInfo, businessType)
        });
      }

      // アクセス・立地への言及
      const accessKeywords = ['駅近', 'アクセス', '便利', '近い', '立地', '駅'];
      const accessReview = extractRelevantReview(accessKeywords);
      if (reviewKeywords.match(/駅近|アクセス|便利|近い/) && !answer.match(/駅|アクセス|便利|立地/)) {
        const reviewQuote = accessReview ? `「${accessReview}」` : 'アクセスの良さを評価する';
        followUps.push({
          id: `${questionId}-followup-access`,
          text: `口コミで${reviewQuote}という声もありますね。立地も強みですか？`,
          type: 'text',
          placeholder: generateDynamicPlaceholder('access', answer, placeInfo, businessType)
        });
      }
    }

    // 理由が1つしか書かれていない場合（口コミ分析で追加されていなければ）
    if (!answer.includes('、') && !answer.includes('と') && followUps.length === 0) {
      followUps.push({
        id: `${questionId}-followup-1`,
        text: '他にも選ばれている理由はありますか？',
        type: 'text',
        placeholder: '例：接客が丁寧'
      });
    }

    // お客様の声を確認（最大3問なので、まだ余裕があれば）
    if (followUps.length < 2) {
      followUps.push({
        id: `${questionId}-followup-2`,
        text: 'お客様から直接言われたことはありますか？',
        type: 'text',
        placeholder: '例：「雰囲気が落ち着いていて良い」と言われる'
      });
    }
  }

  // P2-3: 顧客ニーズ
  if (questionId === 'P2-3') {
    // 具体性が低い場合
    if (answer.length < 15) {
      followUps.push({
        id: `${questionId}-followup-1`,
        text: 'もう少し詳しく教えてください。お客様は何を期待して来店されていますか？',
        type: 'text',
        placeholder: '例：美味しい料理だけでなく、ゆっくり会話できる空間'
      });
    }

    // 他のニーズを確認
    followUps.push({
      id: `${questionId}-followup-2`,
      text: '他にお客様が求めているものはありますか？',
      type: 'text',
      placeholder: '例：SNS映えする商品'
    });
  }

  // P2-4: ニーズの変化
  if (questionId === 'P2-4') {
    // 変化ありの場合
    if (answer !== '変化なし' && !answer.includes('ない')) {
      followUps.push({
        id: `${questionId}-followup-1`,
        text: 'その変化に対して、何か対応されていますか？',
        type: 'text',
        placeholder: '例：テイクアウトメニューを増やした'
      });
    }
  }

  // P2-5: 市場の動向
  if (questionId === 'P2-5') {
    // 競合について触れていない場合
    if (!answer.match(/競合|ライバル|他店|同業/)) {
      followUps.push({
        id: `${questionId}-followup-1`,
        text: '近隣に競合店は増えていますか？',
        type: 'text',
        placeholder: '例：最近2店舗ほど増えた'
      });
    }

    // 顧客層の変化について触れていない場合
    if (!answer.match(/客層|お客様|高齢化|若い/)) {
      followUps.push({
        id: `${questionId}-followup-2`,
        text: '地域の客層に変化はありますか？',
        type: 'text',
        placeholder: '例：若い世代が増えている'
      });
    }
  }

  // P2-6: 競合比較
  if (questionId === 'P2-6') {
    confirmMessage = `「${answer}」とのことですね。`;

    console.log('[P2-6 Follow-Up] Generating follow-ups for answer:', answer);
    console.log('[P2-6 Follow-Up] Context:', { rating, userRatingsTotal });

    // Google Maps評価を活用
    if (rating >= 4.0 && !answer.match(/評価|口コミ|高い/)) {
      console.log('[P2-6 Follow-Up] Adding rating follow-up');
      followUps.push({
        id: `${questionId}-followup-rating`,
        text: `ちなみに、Google Mapsの評価が${rating}と高いですね。競合と比べてもこの評価は高いですか？`,
        type: 'text',
        placeholder: '例：近隣店舗より高い評価'
      });
    }

    // 口コミ数が多い場合
    if (userRatingsTotal >= 50 && !answer.match(/口コミ|レビュー/)) {
      console.log('[P2-6 Follow-Up] Adding reviews follow-up');
      followUps.push({
        id: `${questionId}-followup-reviews`,
        text: `口コミ数が${userRatingsTotal}件ありますね。これは競合と比べて多いほうですか？`,
        type: 'text',
        placeholder: '例：競合より口コミが多い'
      });
    }

    // リピーターが多い場合
    if (answer.match(/リピーター|常連|多い/)) {
      console.log('[P2-6 Follow-Up] Adding repeat customer follow-up');
      followUps.push({
        id: `${questionId}-followup-1`,
        text: 'リピーターの方は、どれくらいの頻度で来店されますか？',
        type: 'text',
        placeholder: '例：週1回、月2〜3回など'
      });
    }

    // 新規客について触れていない場合
    if (!answer.match(/新規|初めて|新しい/) && followUps.length < 2) {
      console.log('[P2-6 Follow-Up] Adding new customer follow-up');
      followUps.push({
        id: `${questionId}-followup-2`,
        text: '新規のお客様は増えていますか？',
        type: 'text',
        placeholder: '例：SNSからの新規客が増えている'
      });
    }

    console.log('[P2-6 Follow-Up] Total follow-ups generated:', followUps.length);
    console.log('[P2-6 Follow-Up] Follow-up IDs:', followUps.map(f => f.id));
  }

  // Phase 3: 自社の強み
  if (questionId === 'P3-1') {
    confirmMessage = `「${answer}」ですね。`;

    console.log('[P3-1 Follow-Up] Analyzing answer for strengths:', answer);
    console.log('[P3-1 Follow-Up] Context:', { rating, userRatingsTotal, businessType });

    // 「わかりません」「特になし」など、具体的な強みが答えられていない場合
    const isVagueAnswer = answer.match(/わかりません|分かりません|わからない|特になし|なし|思いつかない|ない/);

    if (isVagueAnswer || answer.length < 10) {
      console.log('[P3-1 Follow-Up] Vague answer detected - providing comprehensive support');

      // 1. Google Maps口コミから強みを抽出
      if (reviews && reviews.length > 0) {
        // 実際の口コミテキストから関連する文を抽出する関数
        const extractRelevantReview = (keywords) => {
          for (const review of reviews) {
            for (const keyword of keywords) {
              if (review.text.includes(keyword)) {
                // 該当キーワードを含む文を抽出（最大50文字）
                const sentences = review.text.split(/[。、\n]/);
                for (const sentence of sentences) {
                  if (sentence.includes(keyword) && sentence.length > 5) {
                    return sentence.substring(0, 50);
                  }
                }
              }
            }
          }
          return null;
        };

        const reviewTexts = reviews.map(r => r.text).join(' ');

        // 接客・サービス
        const serviceKeywords = ['丁寧', '親切', '優しい', '感じが良い', '対応', '接客', '笑顔'];
        const serviceReview = extractRelevantReview(serviceKeywords);
        if (reviewTexts.match(/丁寧|親切|優しい|感じが良い|対応|接客|笑顔/)) {
          const reviewQuote = serviceReview ? `「${serviceReview}」` : '「接客が丁寧」';
          followUps.push({
            id: `${questionId}-followup-service`,
            text: `口コミで${reviewQuote}という評価がありますね。スタッフの対応やサービスで意識していることはありますか？`,
            type: 'text',
            placeholder: '例：お客様一人ひとりに丁寧なカウンセリング'
          });
        }

        // 品質・味
        const qualityKeywords = ['美味しい', 'おいしい', '味', 'クオリティ', '品質', '技術', '上手', '美味', '旨い'];
        const qualityReview = extractRelevantReview(qualityKeywords);
        if (reviewTexts.match(/美味しい|おいしい|味|クオリティ|品質|技術|上手/)) {
          const reviewQuote = qualityReview ? `「${qualityReview}」` : '「味が良い」「技術が高い」';
          followUps.push({
            id: `${questionId}-followup-quality`,
            text: `口コミで${reviewQuote}と評価されていますね。こだわっているポイントはありますか？`,
            type: 'text',
            placeholder: '例：厳選した食材、独自の製法'
          });
        }

        // 雰囲気・環境
        const atmosphereKeywords = ['雰囲気', '落ち着く', '居心地', '清潔', '綺麗', 'おしゃれ', '素敵', 'きれい'];
        const atmosphereReview = extractRelevantReview(atmosphereKeywords);
        if (reviewTexts.match(/雰囲気|落ち着く|居心地|清潔|綺麗|おしゃれ|素敵/)) {
          const reviewQuote = atmosphereReview ? `「${atmosphereReview}」` : '「雰囲気が良い」';
          followUps.push({
            id: `${questionId}-followup-atmosphere`,
            text: `口コミで${reviewQuote}と言われていますね。店舗の環境で工夫していることはありますか？`,
            type: 'text',
            placeholder: '例：落ち着いた照明、清潔な店内'
          });
        }

        // コスパ・価格
        const priceKeywords = ['安い', 'お得', 'コスパ', 'リーズナブル', '手頃', '値段'];
        const priceReview = extractRelevantReview(priceKeywords);
        if (reviewTexts.match(/安い|お得|コスパ|リーズナブル|手頃/)) {
          const reviewQuote = priceReview ? `「${priceReview}」` : '「価格が手頃」';
          followUps.push({
            id: `${questionId}-followup-price`,
            text: `口コミで${reviewQuote}という評価がありますね。価格設定で意識していることはありますか？`,
            type: 'text',
            placeholder: '例：地域最安値を目指している'
          });
        }
      }

      // 2. 口コミ情報が少ない、または追加で業種別の典型的な強みを質問
      if (followUps.length < 2) {
        // 業種別の強み質問
        if (businessType.includes('飲食') || businessType.includes('レストラン') || businessType.includes('カフェ')) {
          followUps.push({
            id: `${questionId}-followup-food`,
            text: '料理や食材でこだわっているポイントはありますか？',
            type: 'text',
            placeholder: '例：地元の新鮮な野菜を使用、手作りにこだわっている'
          });
        } else if (businessType.includes('美容') || businessType.includes('理容') || businessType.includes('サロン')) {
          followUps.push({
            id: `${questionId}-followup-beauty`,
            text: '技術やサービス内容で他店と違うところはありますか？',
            type: 'text',
            placeholder: '例：最新のトリートメント技術、マンツーマン対応'
          });
        } else if (businessType.includes('小売') || businessType.includes('販売')) {
          followUps.push({
            id: `${questionId}-followup-retail`,
            text: '商品の品揃えや仕入れで工夫していることはありますか？',
            type: 'text',
            placeholder: '例：他店にない珍しい商品、独自の仕入れルート'
          });
        } else {
          // 一般的な質問
          followUps.push({
            id: `${questionId}-followup-general`,
            text: 'お客様がリピートしてくれる理由は何だと思いますか？',
            type: 'text',
            placeholder: '例：常連さんとの信頼関係、アフターサービス'
          });
        }
      }

      // 3. 経験・資格について質問
      if (followUps.length < 3) {
        followUps.push({
          id: `${questionId}-followup-experience`,
          text: 'あなたやスタッフの経験や資格で、サービスに活かしているものはありますか？',
          type: 'text',
          placeholder: '例：10年の業界経験、国家資格保有'
        });
      }

      console.log('[P3-1 Follow-Up] Generated comprehensive support questions:', followUps.length);
    } else {
      // 具体的な回答がある場合は、追加の強みを確認
      if (!answer.includes('、') && !answer.includes('と')) {
        followUps.push({
          id: `${questionId}-followup-1`,
          text: '他にも強みはありますか？',
          type: 'text',
          placeholder: '例：経験豊富なスタッフ'
        });
      }
    }

    console.log('[P3-1 Follow-Up] Total follow-ups generated:', followUps.length);
  }

  // Phase 4: 経営方針
  if (questionId === 'P4-1') {
    // 抽象的な回答の場合
    if (answer.length < 20) {
      followUps.push({
        id: `${questionId}-followup-1`,
        text: 'もう少し具体的に教えてください。どのような価値を提供したいですか？',
        type: 'text',
        placeholder: '例：地域の人々が気軽に集まれる場所を作りたい'
      });
    }
  }

  // Phase 5: 補助事業の内容
  if (questionId === 'P5-1') {
    // 導入するものが具体的でない場合
    if (answer.length < 10) {
      followUps.push({
        id: `${questionId}-followup-1`,
        text: '具体的に何を導入しますか？',
        type: 'text',
        placeholder: '例：タブレット型POSレジ、予約管理システム'
      });
    }
  }

  // 確認メッセージと最大3問の深堀り質問を返す
  return {
    confirmMessage,
    followUps: followUps.slice(0, 3)
  };
};

/**
 * 深堀り質問のIDかどうか判定
 */
export const isFollowUpQuestion = (questionId) => {
  return questionId.includes('-followup-');
};

/**
 * 元の質問IDを取得
 */
export const getOriginalQuestionId = (followUpQuestionId) => {
  return followUpQuestionId.split('-followup-')[0];
};
