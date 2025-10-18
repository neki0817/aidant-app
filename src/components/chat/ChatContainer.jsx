import React, { useState, useEffect, useRef } from 'react';
import { useApplication } from '../../contexts/ApplicationContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../hooks/usePoints';
import { enhanceAnswer, generateAnswerDraft } from '../../services/openai/openai';
import MessageBubble from './MessageBubble';
import QuestionInput from './QuestionInput';
import ProgressBar from './ProgressBar';
import ApplicationDocument from '../document/ApplicationDocument';
import AiDraftOptions from './AiDraftOptions';
import './ChatContainer.css';

const ChatContainer = () => {
  const { currentUser: user } = useAuth();
  const {
    currentStep,
    answers,
    setAnswers,
    updateAnswer,
    nextStep,
    prevStep,
    currentApplication,
    createNewApplication,
    isApplicationComplete
  } = useApplication();

  const { pointBalance, consumePoints } = usePoints();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showDocument, setShowDocument] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState(null); // 補完待ちの回答
  const [aiDraft, setAiDraft] = useState(null); // AI生成下書き
  const [showAiOptions, setShowAiOptions] = useState(false); // AI提案の3択UI表示
  const messagesEndRef = useRef(null);

  // メッセージを自動スクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // コンポーネント初期化
  useEffect(() => {
    const initializeChat = async () => {
      if (!currentApplication && user && user.uid) {
        try {
          console.log('Initializing chat - creating new application');
          const newApp = await createNewApplication();
          console.log('Application created:', newApp);
        } catch (error) {
          console.error('Error creating application:', error);
        }
      } else if (currentApplication) {
        console.log('Application already exists:', currentApplication.id);
      }
    };

    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentApplication]); // currentApplicationを追加して、作成後に再実行されるようにする

  // メッセージの初期化（一度だけ実行）
  useEffect(() => {
    if (currentApplication && messages.length === 0) {
      const question = getCurrentQuestion();
      if (question) {
        addAIMessage(question.text, question);
      }
    }
  }, [currentApplication]);

  // 現在の質問を取得
  useEffect(() => {
    console.log('useEffect triggered - currentStep:', currentStep, 'answers:', answers);
    const question = getCurrentQuestion();
    console.log('Setting currentQuestion to:', question?.id || 'null');

    // 質問が変わった場合のみ更新
    if (question && question.id !== currentQuestion?.id) {
      setCurrentQuestion(question);

      // 最初の質問以外はチャットに表示
      if (Object.keys(answers).length > 0) {
        addAIMessage(question.text, question);

        // AI自動生成は無効化（ユーザー入力後にenhanceAnswerで補完する）
        // generateAiDraftForQuestion(question);
      }
    } else if (!question && currentQuestion) {
      // 質問がなくなった（ステップ完了）
      setCurrentQuestion(null);
      handleStepComplete();
    }
  }, [currentStep, answers]);

  // AIメッセージを追加
  const addAIMessage = (text, question = null) => {
    setMessages(prev => {
      // 同じテキストのメッセージが既に存在するかチェック
      const existingMessage = prev.find(msg => 
        msg.type === 'ai' && msg.text === text
      );
      
      if (existingMessage) {
        return prev; // 既に存在する場合は追加しない
      }
      
      const message = {
        id: `ai-${Date.now()}-${Math.random()}`,
        type: 'ai',
        text,
        question,
        timestamp: new Date()
      };
      
      return [...prev, message];
    });
  };

  // ユーザーメッセージを追加
  const addUserMessage = (text, answer) => {
    const message = {
      id: `user-${Date.now()}-${Math.random()}`,
      type: 'user',
      text,
      answer,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
  };

  // 回答を処理
  const handleAnswer = async (questionId, answer) => {
    console.log('===== handleAnswer START =====', {
      questionId,
      answerType: typeof answer,
      answerPreview: typeof answer === 'string' ? answer.substring(0, 30) : JSON.stringify(answer)
    });

    // 申請書が未作成の場合はエラーメッセージのみ
    console.log('handleAnswer called - currentApplication:', currentApplication ? currentApplication.id : 'null');
    if (!currentApplication) {
      console.error('Application is null - cannot process answer');
      addAIMessage('申請書の初期化中です。しばらくお待ちください。');
      return;
    }

    // Q1-3 & Q5-2: 取組内容の補助金規定チェック
    if (questionId === 'Q1-3' || questionId === 'Q5-2') {
      const webOnlyItems = [
        'ホームページ・ECサイト制作',
        'ホームページ制作・リニューアル',
        'Web予約システム導入',
        'SNS広告・ネット広告',
        'SNSマーケティング（Instagram等）',
        'デジタル広告運用（Google・SNS広告）',
        'ECサイト構築'
      ];
      const isWebOnly = Array.isArray(answer) &&
        answer.length > 0 &&
        answer.every(item => webOnlyItems.includes(item));

      if (isWebOnly) {
        addAIMessage('⚠️ 重要なお知らせ\n\nウェブ関連経費（ホームページ制作、Web予約システム、SNS広告、ECサイトなど）のみでの申請は認められていません。\n\n【補助金の規定】\n・ウェブ関連経費のみでは申請不可\n・他の取組（チラシ・看板・店舗改装など）と組み合わせる必要があります\n\n申請を成功させるため、もう一度選択し直してください。');
        setIsLoading(false);
        return;
      }
    }

    // Q2-1（place_confirm）は確認のみで、Firestoreに保存しない
    const currentQ = getCurrentQuestion();
    console.log('[handleAnswer] currentQ retrieved:', {
      currentQId: currentQ?.id,
      currentQType: currentQ?.type,
      questionId: questionId
    });

    if (currentQ && currentQ.type === 'place_confirm') {
      console.log('Q2-1 (place_confirm) - skipping Firestore save, just marking as confirmed');

      // ユーザーメッセージを追加（「確認しました」という意思表示）
      addUserMessage('店舗情報を確認しました', null);

      // 次の質問へ進むために、ローカルstateのみ更新（Firestoreには保存しない）
      setAnswers(prev => ({
        ...prev,
        [questionId]: 'confirmed'
      }));

      return;
    }

    try {
      setIsLoading(true);

      // ポイント消費チェック
      const questionCost = getQuestionCost(questionId);
      if (questionCost > 0) {
        const hasEnoughPoints = await checkPointBalance(questionCost);
        if (!hasEnoughPoints) {
          addAIMessage('ポイントが不足しています。ポイントを購入してください。');
          setIsLoading(false);
          return;
        }
      }

      // ユーザーメッセージを先に追加（次の質問より前に表示するため）
      const answerText = formatAnswerText(questionId, answer);
      addUserMessage(answerText, answer);

      console.log('[handleAnswer] Checking enhancement conditions:', {
        questionId,
        hasCurrentQ: !!currentQ,
        questionType: currentQ?.type,
        answerType: typeof answer,
        isString: typeof answer === 'string',
        answerLength: typeof answer === 'string' ? answer.length : 'N/A'
      });

      // テキストエリアの回答はAIで補完
      if (currentQ && currentQ.type === 'textarea' && typeof answer === 'string' && answer.length >= 5) {
        try {
          console.log('[Enhancement] Starting for:', {
            questionId,
            answerLength: answer.length,
            answer: answer.substring(0, 50)
          });

          const context = {
            storeName: answers['Q2-0']?.name,
            storeAddress: answers['Q2-0']?.address,
            philosophy: answers['Q2-5']
          };

          addAIMessage('回答を補完しています...');

          const enhancedText = await enhanceAnswer(questionId, currentQ.text, answer, context);

          console.log('[Enhancement] Result:', {
            hasEnhancement: !!enhancedText,
            enhancedLength: enhancedText?.length || 0
          });

          if (enhancedText) {
            // 補完された回答を3択UIで表示
            addAIMessage(`AIが回答を補完しました。内容をご確認ください。`);
            setAiDraft(enhancedText);
            setShowAiOptions(true);
            setPendingAnswer({ questionId, original: answer, enhanced: enhancedText });
            setIsLoading(false);
            return; // 確認待ちで一時停止
          } else {
            console.log('[Enhancement] No enhancement returned - proceeding with original');
            // AI補完がない場合のみ保存
            await saveAnswer(questionId, answer, questionCost);
          }
        } catch (error) {
          console.error('Error enhancing answer:', error);
          // エラーの場合は元の回答で続行
          await saveAnswer(questionId, answer, questionCost);
        }
      } else {
        // テキストエリア以外の質問は通常保存
        await saveAnswer(questionId, answer, questionCost);
      }

    } catch (error) {
      console.error('Error handling answer:', error);
      addAIMessage('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };


  // 回答を保存する共通関数
  const saveAnswer = async (questionId, answer, questionCost) => {
    try {
      console.log('Saving answer:', { questionId, answer, answerType: Array.isArray(answer) ? 'array' : typeof answer });

      // updateAnswerがApplicationContext内でsetAnswersを呼び出す
      // answersが更新されると、useEffectが発火してcurrentQuestionが更新され、次の質問が表示される
      await updateAnswer(questionId, answer);

      // ポイント消費
      if (questionCost > 0) {
        await consumePoints(questionCost, `質問回答: ${questionId}`);
      }
    } catch (e) {
      console.error('saveAnswer failed:', e);
      addAIMessage('回答の保存に失敗しました。ネットワーク状態を確認してもう一度お試しください。');
      throw e;
    }
  };

  // AI下書きを生成
  const generateAiDraftForQuestion = async (question) => {
    // 自動生成対象外の質問（選択肢形式とGoogle Maps関連）
    const skipQuestions = ['Q2-0', 'Q2-1', 'Q2-2', 'Q2-3', 'Q2-4', 'Q2-6'];

    // テキスト入力（textarea, text）のみAI提案を表示
    const aiSupportedTypes = ['textarea', 'text'];

    if (skipQuestions.includes(question.id) ||
        question.type === 'place_search' ||
        question.type === 'place_confirm' ||
        !aiSupportedTypes.includes(question.type)) {
      return;
    }

    try {
      setIsLoading(true);
      addAIMessage('回答を自動生成しています...');

      const context = {
        placeInfo: answers['Q2-0'],
        marketData: null, // TODO: marketDataがある場合は追加
        answers
      };

      const draft = await generateAnswerDraft(question.id, question, context);

      if (draft) {
        setAiDraft(draft);
        setShowAiOptions(true);
        addAIMessage(`回答を生成しました。内容をご確認ください。`);
      }
    } catch (error) {
      console.error('Error generating AI draft:', error);
      // エラーの場合はスキップして通常の入力へ
      setShowAiOptions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // AI補完を承認（そのまま使う）
  const handleAcceptDraft = async () => {
    if (!aiDraft || !pendingAnswer) return;

    try {
      setIsLoading(true);
      setShowAiOptions(false);

      // 補完された内容をユーザーメッセージとして追加
      const answerText = formatAnswerText(pendingAnswer.questionId, pendingAnswer.enhanced);
      addUserMessage(answerText, pendingAnswer.enhanced);

      addAIMessage('補完された回答で保存します。');

      const questionCost = getQuestionCost(pendingAnswer.questionId);
      await saveAnswer(pendingAnswer.questionId, pendingAnswer.enhanced, questionCost);

      setAiDraft(null);
      setPendingAnswer(null);
    } catch (error) {
      console.error('Error accepting draft:', error);
      addAIMessage('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // AI補完を修正
  const handleEditDraft = () => {
    if (!pendingAnswer) return;

    setShowAiOptions(false);
    addAIMessage('補完内容を修正してください。');

    // 補完された内容をQuestionInputに渡して編集モードに
    // TODO: QuestionInputに編集モード機能を追加する必要がある
    // 現時点では元の回答で保存
    alert('修正機能は今後実装予定です。一旦元の回答で保存します。');
    handleManualInput();
  };

  // 元の回答を使う
  const handleManualInput = async () => {
    if (!pendingAnswer) {
      setAiDraft(null);
      setShowAiOptions(false);
      addAIMessage('ご自身で入力してください。');
      return;
    }

    try {
      setIsLoading(true);
      setShowAiOptions(false);

      addAIMessage('元の回答で保存します。');

      const questionCost = getQuestionCost(pendingAnswer.questionId);
      await saveAnswer(pendingAnswer.questionId, pendingAnswer.original, questionCost);

      setAiDraft(null);
      setPendingAnswer(null);
    } catch (error) {
      console.error('Error using original answer:', error);
      addAIMessage('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // 前の質問に戻る
  const handleGoBack = async () => {
    const questions = getStepQuestions(currentStep);
    const answeredQuestions = Object.keys(answers).filter(qId =>
      questions.some(q => q.id === qId)
    );

    if (answeredQuestions.length > 0) {
      try {
        setIsLoading(true);

        // 最後の回答を削除
        const lastQuestionId = answeredQuestions[answeredQuestions.length - 1];

        // 削除する質問オブジェクトを取得
        const questionToDelete = questions.find(q => q.id === lastQuestionId);

        // Firestoreからも削除
        await updateAnswer(lastQuestionId, null);

        // メッセージを削除（質問とユーザーの回答）
        setMessages(prev => {
          // 最後から2つのメッセージを削除（AIの質問 + ユーザーの回答）
          return prev.slice(0, -2);
        });

        // 削除した質問を再表示
        if (questionToDelete) {
          setCurrentQuestion(questionToDelete);
          addAIMessage(`${lastQuestionId}の回答を削除しました。もう一度回答してください。`);
          addAIMessage(questionToDelete.text, questionToDelete);
        }
      } catch (error) {
        console.error('Error going back:', error);
        addAIMessage('戻る処理に失敗しました。もう一度お試しください。');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // ステップ完了処理
  const handleStepComplete = () => {
    if (currentStep < 5) {
      addAIMessage(`Step${currentStep}が完了しました！次のステップに進みます。`);
      setTimeout(() => {
        nextStep();
      }, 2000);
    } else {
      addAIMessage('お疲れ様でした！全ての質問が完了しました。申請書を生成できます。');
      setShowDocument(true);
    }
  };

  // ポイント残高チェック
  const checkPointBalance = async (requiredPoints) => {
    return pointBalance >= requiredPoints;
  };

  // 質問コスト取得
  const getQuestionCost = (questionId) => {
    const costs = {
      'Q1-1': 0, 'Q1-2': 0, 'Q1-3': 0,
      'Q2-0': 0, 'Q2-1': 0, 'Q2-2': 10, 'Q2-3': 10, 'Q2-4': 10, 'Q2-5': 10,
      'Q2-6': 10, 'Q2-7-1': 10, 'Q2-7-2': 10, 'Q2-7-3': 10, 'Q2-8': 10, 'Q2-9': 10,
      'Q3-1': 20, 'Q3-2': 0, 'Q3-3': 10, 'Q3-4': 10, 'Q3-5': 10, 'Q3-6': 20, 'Q3-7': 10,
      'Q4-1': 10, 'Q4-2': 10, 'Q4-3': 10, 'Q4-4': 10, 'Q4-5': 10,
      'Q4-6': 10, 'Q4-7': 10, 'Q4-8': 20, 'Q4-9': 20, 'Q4-10': 10, 'Q4-11': 10,
      'Q5-1': 20, 'Q5-2': 20, 'Q5-3': 15, 'Q5-4': 15, 'Q5-5': 15, 'Q5-6': 15,
      'Q5-7': 30, 'Q5-8': 10, 'Q5-9': 10, 'Q5-10': 20, 'Q5-11': 10, 'Q5-12': 10, 'Q5-13': 10, 'Q5-14': 10
    };
    return costs[questionId] || 0;
  };

  // 現在の質問を取得（回答済み質問を除外）
  const getCurrentQuestion = () => {
    const questions = getStepQuestions(currentStep);
    const answeredQuestions = Object.keys(answers).filter(qId => 
      questions.some(q => q.id === qId)
    );
    
    console.log('getCurrentQuestion:', {
      currentStep,
      questions: questions.map(q => q.id),
      answeredQuestions,
      answers,
      answersKeys: Object.keys(answers)
    });
    
    const nextQuestion = questions.find(q => !answeredQuestions.includes(q.id));
    console.log('nextQuestion:', nextQuestion?.id || 'none');
    return nextQuestion;
  };

  // 次の質問を取得
  const getNextQuestion = (currentQuestionId) => {
    const questions = getStepQuestions(currentStep);
    const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
    console.log('getNextQuestion:', {
      currentQuestionId,
      currentStep,
      questions: questions.map(q => q.id),
      currentIndex,
      nextQuestion: questions[currentIndex + 1]?.id || 'none'
    });
    return questions[currentIndex + 1];
  };

  // 営業年数を計算して売上質問を動的に生成
  const generateSalesQuestions = () => {
    const openingDate = answers['Q2-3']; // 開業年月
    const fiscalMonth = answers['Q2-4']; // 決算月

    if (!openingDate || !fiscalMonth) {
      return [];
    }

    // 開業年月をパース
    const [openYear, openMonth] = openingDate.split('-').map(Number);
    // 決算月をパース（例: "3月" → 3）
    const fiscalMonthNum = parseInt(fiscalMonth.replace('月', ''));

    // 今日の日付
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // 現在の決算期を計算（決算月より後なら今年、前なら去年が直近決算期）
    let latestFiscalYear;
    if (currentMonth >= fiscalMonthNum) {
      latestFiscalYear = currentYear;
    } else {
      latestFiscalYear = currentYear - 1;
    }

    // 開業年の決算期
    let openingFiscalYear;
    if (openMonth <= fiscalMonthNum) {
      openingFiscalYear = openYear;
    } else {
      openingFiscalYear = openYear + 1;
    }

    // 営業した決算期の数を計算
    const fiscalYearsCount = latestFiscalYear - openingFiscalYear + 1;

    console.log('Sales questions generation:', {
      openingDate,
      fiscalMonth,
      openYear,
      openMonth,
      fiscalMonthNum,
      latestFiscalYear,
      openingFiscalYear,
      fiscalYearsCount
    });

    const salesQuestions = [];

    if (fiscalYearsCount >= 3) {
      // 3期以上 → 3期分の売上を個別に質問
      salesQuestions.push({
        id: 'Q2-7-1',
        text: `${latestFiscalYear - 2}年${fiscalMonth}期（3期前）の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：1200',
        helpText: '万円単位で入力してください（例：1200万円の場合は「1200」と入力）',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2',
        text: `${latestFiscalYear - 1}年${fiscalMonth}期（2期前）の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：1100',
        helpText: '万円単位で入力してください',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3',
        text: `${latestFiscalYear}年${fiscalMonth}期（直近期）の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：900',
        helpText: '万円単位で入力してください',
        required: true
      });
    } else if (fiscalYearsCount === 2) {
      // 2期 → 2期分の売上 + 見込み
      salesQuestions.push({
        id: 'Q2-7-1',
        text: `${latestFiscalYear - 1}年${fiscalMonth}期（前期）の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：800',
        helpText: '万円単位で入力してください',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2',
        text: `${latestFiscalYear}年${fiscalMonth}期（当期）の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：1000',
        helpText: '万円単位で入力してください。確定していない場合は見込み額を入力してください',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3',
        text: `${latestFiscalYear + 1}年${fiscalMonth}期（次期）の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：1200',
        helpText: '万円単位で見込み額を入力してください',
        required: true
      });
    } else if (fiscalYearsCount === 1) {
      // 1期のみ → 当期実績 + 2期分の見込み
      salesQuestions.push({
        id: 'Q2-7-1',
        text: `${latestFiscalYear}年${fiscalMonth}期（当期）の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：600',
        helpText: '万円単位で入力してください。確定していない場合は見込み額を入力してください',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2',
        text: `${latestFiscalYear + 1}年${fiscalMonth}期（次期）の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：800',
        helpText: '万円単位で見込み額を入力してください',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3',
        text: `${latestFiscalYear + 2}年${fiscalMonth}期（次々期）の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：1000',
        helpText: '万円単位で見込み額を入力してください',
        required: true
      });
    } else {
      // 開業前または開業間もない → 見込みのみ3期分
      salesQuestions.push({
        id: 'Q2-7-1',
        text: `初年度の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：500',
        helpText: '万円単位で見込み額を入力してください',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2',
        text: `2年目の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：700',
        helpText: '万円単位で見込み額を入力してください',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3',
        text: `3年目の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：900',
        helpText: '万円単位で見込み額を入力してください',
        required: true
      });
    }

    return salesQuestions;
  };

  // ステップ別質問リスト
  const getStepQuestions = (step) => {
    // Step5の条件付き質問をフィルタリング
    const filterStep5Questions = (questions) => {
      const q5_2_answer = answers['Q5-2'] || [];

      return questions.filter(q => {
        // Q5-3: Web関連の取組を選択した場合のみ表示
        if (q.id === 'Q5-3') {
          return q5_2_answer.some(item =>
            item.includes('ホームページ') ||
            item.includes('Web予約') ||
            item.includes('ECサイト')
          );
        }

        // Q5-4: SNS・広告関連の取組を選択した場合のみ表示
        if (q.id === 'Q5-4') {
          return q5_2_answer.some(item =>
            item.includes('SNS') ||
            item.includes('広告')
          );
        }

        // その他の質問は常に表示
        return true;
      });
    };

    const stepQuestions = {
      1: [
        {
          id: 'Q1-1',
          text: 'あなたの事業は次のどれに該当しますか？',
          type: 'single_select',
          options: ['飲食店（レストラン・カフェ・居酒屋等）'],
          required: true
        },
        {
          id: 'Q1-2',
          text: '今回、補助金を活用して実現したいことは？（複数選択可）',
          type: 'multi_select',
          options: [
            '新規顧客を増やしたい',
            'リピート客を増やしたい',
            '客単価を上げたい',
            '売上を安定させたい',
            'ブランド力を高めたい'
          ],
          required: true
        },
        {
          id: 'Q1-3',
          text: '具体的にどんな取組を検討していますか？（複数選択可）',
          type: 'multi_select',
          options: [
            'ホームページ・ECサイト制作',
            'SNS広告・ネット広告',
            'チラシ・パンフレット作成',
            '看板・のぼり設置',
            'メニュー・パッケージ刷新',
            '店舗改装・内装工事',
            '厨房機器・設備導入',
            'その他'
          ],
          required: true
        }
      ],
      2: [
        {
          id: 'Q2-0',
          text: 'まず、お店の情報をGoogle Mapsから取得しましょう。店舗名または住所を入力して検索してください。',
          type: 'place_search',
          helpText: '店舗情報（名前、住所、電話番号など）が自動で取得されます',
          required: true
        },
        {
          id: 'Q2-1',
          text: '取得した店舗情報を確認してください。修正が必要な場合は編集できます。',
          type: 'place_confirm',
          required: true
        },
        {
          id: 'Q2-2',
          text: '代表者のお名前を教えてください',
          type: 'text',
          placeholder: '例：山田太郎',
          required: true
        },
        {
          id: 'Q2-3',
          text: '開業年月を教えてください',
          type: 'date',
          format: 'YYYY-MM',
          helpText: '個人事業主の方は、開業届を提出した年月、または実際に営業を開始した年月を入力してください',
          required: true
        },
        {
          id: 'Q2-4',
          text: '決算月は何月ですか？',
          type: 'single_select',
          options: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
          required: true
        },
        {
          id: 'Q2-5',
          text: 'お店を始めた時の想いや、大切にしている理念を教えてください',
          type: 'textarea',
          maxLength: 300,
          placeholder: '簡潔に記入してください（AIが詳しく補完します）',
          examples: [
            '地元食材で家族連れが楽しめる店を作りたかった',
            '本場フランスの味を日本の皆様に提供したい',
            '地域の人が毎日通える気軽なお店を目指しました'
          ],
          helpText: 'お店を開業した理由、こだわりなどを簡潔に記入してください。AIが申請書に適した文章に補完します',
          required: true
        },
        {
          id: 'Q2-6',
          text: '常時雇用している従業員は何人いますか？',
          type: 'single_select',
          options: [
            '0人（経営者のみ）',
            '1人',
            '2人',
            '3人',
            '4人',
            '5人',
            '6人以上（対象外の可能性があります）'
          ],
          helpText: '【常時雇用従業員とは】フルタイム勤務の正社員。経営者本人、同居家族、パート・アルバイトは含まない。飲食業は5人以下が対象です。',
          required: true
        },
        ...generateSalesQuestions(), // 動的に生成された売上質問を挿入
        {
          id: 'Q2-8',
          text: '直近期の経常利益の状況を選択してください',
          type: 'single_select',
          options: [
            '黒字（補助率2/3）',
            '赤字またはゼロ（補助率3/4の可能性）'
          ],
          helpText: '赤字の場合、賃金引上げ特例適用時に補助率が3/4に向上します',
          required: true
        },
        {
          id: 'Q2-9',
          text: '財務推移について教えてください',
          type: 'single_select',
          options: [
            '増加傾向',
            '横ばい',
            '減少傾向',
            'まだ判断できない（開業間もない）'
          ],
          required: true
        }
      ],
      3: [
        {
          id: 'Q3-1',
          text: 'ターゲット顧客層はどなたですか？（複数選択可）',
          type: 'multi_select',
          options: [
            '20代の若年層',
            '30-40代のファミリー層',
            '50-60代のシニア層',
            'ビジネスパーソン',
            '観光客',
            '地域住民',
            '美食家・グルメ愛好家',
            'その他'
          ],
          required: true
        },
        {
          id: 'Q3-2',
          text: 'お客様が来店する主な理由は何ですか？（複数選択可）',
          type: 'multi_select',
          options: [
            '日常的な食事',
            '記念日・特別な日',
            '接待・商談',
            'デート',
            '友人・家族との集まり',
            'テイクアウト・デリバリー',
            'その他'
          ],
          required: true
        },
        {
          id: 'Q3-3',
          text: '現在、お客様はどのようにお店を知りますか？（複数選択可）',
          type: 'multi_select',
          options: [
            '知人の紹介',
            '食べログ・Googleマップ',
            'Instagram・SNS',
            '通りがかり',
            'チラシ・ポスター',
            '地域情報誌',
            'ホームページ',
            'その他'
          ],
          helpText: '現在の主な認知経路を選択してください',
          required: true
        },
        {
          id: 'Q3-4',
          text: 'リピーター率はどのくらいですか？',
          type: 'single_select',
          options: [
            '80%以上',
            '60-80%',
            '40-60%',
            '20-40%',
            '20%未満',
            '把握していない'
          ],
          helpText: 'おおよその割合で構いません',
          required: true
        },
        {
          id: 'Q3-5',
          text: '商圏内の主な競合店舗の状況を教えてください',
          type: 'textarea',
          maxLength: 300,
          placeholder: '簡潔に記入してください（AIが詳しく補完します）',
          examples: [
            '周辺に同業態3店舗。価格帯はうちより低め',
            '競合は多いが高級路線は少ない',
            '駅前に大手チェーン2店舗あり'
          ],
          helpText: '競合の数、価格帯、特徴などを簡潔に記入してください',
          required: true
        },
        {
          id: 'Q3-6',
          text: 'お客様からよく要望される内容は何ですか？（複数選択可）',
          type: 'multi_select',
          options: [
            'オンライン予約の導入',
            'SNSでの情報発信',
            'テイクアウト・デリバリー',
            'アレルギー対応',
            'ベジタリアン・ヴィーガン対応',
            '個室・半個室',
            '駐車場',
            '営業時間の延長',
            'ランチ営業',
            'その他'
          ],
          required: true
        },
        {
          id: 'Q3-7',
          text: '現在、WebサイトやSNSは活用していますか？',
          type: 'single_select',
          options: [
            'ホームページあり・SNS運用中',
            'ホームページのみあり',
            'SNSのみ運用中',
            'どちらも未実施',
            '食べログ・Googleマップのみ'
          ],
          required: true
        }
      ],
      4: [
        {
          id: 'Q4-1',
          text: 'あなたのお店の最大の強みは何ですか？（複数選択可）',
          type: 'multi_select',
          options: [
            '料理の味・品質',
            'シェフの技術・経歴',
            '厳選した食材へのこだわり',
            '独自のメニュー・レシピ',
            '接客・ホスピタリティ',
            '店舗の雰囲気・内装',
            '立地・アクセス',
            '価格・コストパフォーマンス',
            'その他'
          ],
          required: true
        },
        {
          id: 'Q4-2',
          text: 'シェフやスタッフの経歴・特徴を教えてください',
          type: 'textarea',
          maxLength: 300,
          placeholder: '簡潔に記入してください（AIが詳しく補完します）',
          examples: [
            'シェフはフランスで3年修業しました',
            '都内有名店で10年経験、調理師免許あり',
            'イタリアンレストランで5年働いていました'
          ],
          helpText: '資格、修業先、受賞歴、専門分野などを簡潔に記入してください',
          required: true
        },
        {
          id: 'Q4-3',
          text: '食材へのこだわりについて教えてください',
          type: 'textarea',
          maxLength: 300,
          placeholder: '例：築地市場から毎朝仕入れる鮮魚、地元契約農家の無農薬野菜を使用しています。',
          helpText: '仕入れ先、品質基準、産地など具体的に記入してください',
          required: true
        },
        {
          id: 'Q4-4',
          text: '接客・サービスで工夫していることは何ですか？',
          type: 'textarea',
          maxLength: 300,
          placeholder: '例：お客様一人ひとりの好みを記録し、2回目以降の来店時に前回の内容を踏まえた提案を行っています。',
          helpText: '具体的な取組や独自のサービスを記入してください',
          required: true
        },
        {
          id: 'Q4-5',
          text: 'お客様から特に評価されているポイントは何ですか？',
          type: 'textarea',
          maxLength: 200,
          placeholder: '例：記念日のサプライズ演出、料理とワインのペアリング提案など',
          required: true
        },
        {
          id: 'Q4-6',
          text: '現在抱えている経営課題は何ですか？（複数選択可）',
          type: 'multi_select',
          options: [
            '新規顧客の獲得',
            'リピーター率の向上',
            '認知度の向上',
            '売上の増加',
            '利益率の改善',
            '人材確保・育成',
            '業務効率化',
            'コスト削減',
            'その他'
          ],
          required: true
        },
        {
          id: 'Q4-7',
          text: '新規顧客獲得の課題について詳しく教えてください',
          type: 'textarea',
          maxLength: 200,
          placeholder: '例：口コミ中心で新規顧客が限定的。Web予約システムがなく、営業時間外の予約機会を逃している。',
          required: true
        },
        {
          id: 'Q4-8',
          text: '直近1年間の顧客数の推移はどうですか？',
          type: 'single_select',
          options: [
            '大幅に増加（+20%以上）',
            '増加傾向（+10-20%）',
            '微増（+10%未満）',
            '横ばい',
            '減少傾向',
            '把握していない'
          ],
          required: true
        },
        {
          id: 'Q4-9',
          text: '現在の予約方法の内訳を教えてください',
          type: 'single_select',
          options: [
            '電話予約のみ',
            '電話予約80%以上',
            '電話とWeb予約が半々',
            'Web予約80%以上',
            'その他'
          ],
          helpText: 'おおよその割合で構いません',
          required: true
        },
        {
          id: 'Q4-10',
          text: 'スタッフの業務負担で課題に感じることは？（複数選択可）',
          type: 'multi_select',
          options: [
            '電話対応に時間がかかる',
            '予約管理が煩雑',
            '顧客情報の管理',
            '在庫管理',
            'シフト管理',
            '会計処理',
            '特になし',
            'その他'
          ],
          required: true
        },
        {
          id: 'Q4-11',
          text: '顧客情報はどのように管理していますか？',
          type: 'single_select',
          options: [
            '専用システムで管理',
            'Excelで管理',
            '紙の台帳で管理',
            '管理していない',
            'その他'
          ],
          required: true
        }
      ],
      5: [
        {
          id: 'Q5-1',
          text: '今回の補助金で最も実現したいことは何ですか？',
          type: 'textarea',
          maxLength: 300,
          placeholder: '簡潔に記入してください（AIが詳しく補完します）',
          examples: [
            'Web予約とSNSで新規顧客を増やしたい',
            'ホームページを作って認知度を上げたい',
            'デジタル広告で売上を25%増やしたい'
          ],
          helpText: '具体的な目標を簡潔に記入してください',
          required: true
        },
        {
          id: 'Q5-2',
          text: '具体的にどんな取組を実施しますか？（複数選択可）',
          type: 'multi_select',
          options: [
            'ホームページ制作・リニューアル',
            'Web予約システム導入',
            'SNSマーケティング（Instagram等）',
            'デジタル広告運用（Google・SNS広告）',
            'ECサイト構築',
            'チラシ・パンフレット制作',
            '看板・サイン制作',
            '店舗改装・内装工事',
            '厨房機器導入',
            'その他'
          ],
          required: true
        },
        {
          id: 'Q5-3',
          text: 'Webサイト・予約システムで実現したいことを教えてください',
          type: 'textarea',
          maxLength: 300,
          placeholder: '例：24時間予約受付、席の空き状況表示、アレルギー情報の事前入力、自動リマインドメール送信など',
          required: false
        },
        {
          id: 'Q5-4',
          text: 'SNS・デジタル広告で何を発信・訴求しますか？',
          type: 'textarea',
          maxLength: 300,
          placeholder: '例：料理写真、シェフの想い、お客様の声、季節メニュー、記念日サービスなど',
          required: false
        },
        {
          id: 'Q5-5',
          text: '取組の実施スケジュールを教えてください',
          type: 'textarea',
          maxLength: 300,
          placeholder: '例：\n4-5月：Webサイト制作\n6月：予約システム稼働開始\n7月〜：SNS運用・広告開始',
          required: true
        },
        {
          id: 'Q5-6',
          text: '予想される経費の内訳を教えてください',
          type: 'textarea',
          maxLength: 500,
          placeholder: '例：\nWebサイト制作：50万円\n予約システム導入：30万円\nSNS広告：月5万円×12ヶ月',
          helpText: '概算で構いません',
          required: true
        },
        {
          id: 'Q5-7',
          text: 'この取組でどのような効果を期待しますか？（複数選択可）',
          type: 'multi_select',
          options: [
            '新規顧客の獲得',
            'リピーター増加',
            '売上増加',
            '利益率改善',
            '認知度向上',
            '業務効率化',
            '顧客満足度向上',
            '地域活性化への貢献',
            'その他'
          ],
          required: true
        },
        {
          id: 'Q5-8',
          text: '新規顧客獲得の目標数値を教えてください',
          type: 'text',
          placeholder: '例：月間50組（現在20組から+30組）',
          required: true
        },
        {
          id: 'Q5-9',
          text: '売上増加の目標金額を教えてください',
          type: 'text',
          placeholder: '例：年間820万円増（3,200万円→4,020万円）',
          required: true
        },
        {
          id: 'Q5-10',
          text: 'この取組が地域経済にどう貢献しますか？',
          type: 'textarea',
          maxLength: 300,
          placeholder: '例：地元農家からの仕入れ増加、雇用拡大、地域のグルメ情報発信など',
          required: true
        },
        {
          id: 'Q5-11',
          text: '補助事業終了後も継続できる仕組みはありますか？',
          type: 'textarea',
          maxLength: 200,
          placeholder: '例：WebサイトとSNSフォロワーは資産として残り、継続的な集客が可能。',
          required: true
        },
        {
          id: 'Q5-12',
          text: 'コスト削減の見込みを教えてください',
          type: 'text',
          placeholder: '例：電話対応時間削減で月5万円の人件費削減',
          required: false
        },
        {
          id: 'Q5-13',
          text: '雇用拡大の予定はありますか？',
          type: 'single_select',
          options: [
            '1名増員予定',
            '2名以上増員予定',
            '増員予定あり（人数未定）',
            '現状維持',
            '未定'
          ],
          required: true
        },
        {
          id: 'Q5-14',
          text: '取組の成功をどのように測定しますか？',
          type: 'textarea',
          maxLength: 200,
          placeholder: '例：Web予約率60%達成、SNSフォロワー5,000人、年間売上4,000万円達成など',
          required: true
        }
      ]
    };

    const questions = stepQuestions[step] || [];

    // Step5の場合は条件付き質問をフィルタリング
    if (step === 5) {
      return filterStep5Questions(questions);
    }

    return questions;
  };

  // 前の質問の回答を取得
  const getPreviousAnswer = (currentQuestionId) => {
    const questions = getStepQuestions(currentStep);
    const currentIndex = questions.findIndex(q => q.id === currentQuestionId);

    if (currentIndex > 0) {
      const previousQuestionId = questions[currentIndex - 1].id;
      return answers[previousQuestionId];
    }

    return null;
  };

  // 回答テキストのフォーマット
  const formatAnswerText = (questionId, answer) => {
    // 店舗情報オブジェクトの場合
    if (answer && typeof answer === 'object' && !Array.isArray(answer) && answer.name) {
      return answer.name;
    }

    if (Array.isArray(answer)) {
      return answer.join('、');
    }
    return String(answer);
  };

  // 申請書表示切り替え
  if (showDocument && isApplicationComplete()) {
    return <ApplicationDocument onBack={() => setShowDocument(false)} />;
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>補助金申請サポート</h2>
        <div className="point-balance">
          ポイント残高: {pointBalance.toLocaleString()}pt
        </div>
      </div>

      <ProgressBar currentStep={currentStep} totalSteps={5} />

      <div className="chat-messages">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onAnswer={handleAnswer}
            isLoading={isLoading}
          />
        ))}
        {isLoading && (
          <div className="loading-message">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showAiOptions && aiDraft && (
        <AiDraftOptions
          draft={aiDraft}
          onAccept={handleAcceptDraft}
          onEdit={handleEditDraft}
          onManual={handleManualInput}
          isLoading={isLoading}
        />
      )}

      {currentQuestion && !showAiOptions && (
        <QuestionInput
          key={currentQuestion.id}
          question={currentQuestion}
          onAnswer={handleAnswer}
          isLoading={isLoading}
          previousAnswer={getPreviousAnswer(currentQuestion.id)}
          aiDraft={aiDraft}
          onGoBack={handleGoBack}
          canGoBack={Object.keys(answers).length > 0}
        />
      )}

      {!currentQuestion && currentStep === 5 && isApplicationComplete() && (
        <div className="completion-actions">
          <button onClick={() => setShowDocument(true)} className="generate-application-btn">
            📄 申請書を生成する
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
