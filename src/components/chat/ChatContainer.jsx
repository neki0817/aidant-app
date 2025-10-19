import React, { useState, useEffect, useRef } from 'react';
import { useApplication } from '../../contexts/ApplicationContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../hooks/usePoints';
import { enhanceAnswer, generateAnswerDraft } from '../../services/openai/openai';
import { generateAIQuestions, generateFollowUpQuestion } from '../../services/openai/aiQuestionGenerator';
import { runAutonomousLoop, checkProgressAndSuggestNextFocus, runFinalCheck, resetAgentSession } from '../../services/ai/autonomousAgent';
import { calculateOverallCompleteness, generateProgressSummary } from '../../services/ai/completionTracker';
import { getNextStep1Question, isStep1Complete, getAutoAnswerFromGoogleMaps } from '../../services/ai/conversationalQuestionsStep1';
import { isUserQuestion, answerUserQuestion } from '../../services/ai/conversationalFlow';
import MessageBubble from './MessageBubble';
import QuestionInput from './QuestionInput';
import ProgressBar from './ProgressBar';
import CompletenessIndicator from './CompletenessIndicator';
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
  const [aiQuestions, setAiQuestions] = useState([]); // AI生成質問リスト
  const [aiQuestionIndex, setAiQuestionIndex] = useState(0); // 現在のAI質問インデックス
  const [aiAnalysis, setAiAnalysis] = useState(''); // AI分析結果

  // 完全自律AIエージェント用の状態
  const [autonomousMode, setAutonomousMode] = useState(true); // 自律モードON/OFF
  const [completenessScore, setCompletenessScore] = useState(0); // 完成度スコア
  const [showCompletenessDetails, setShowCompletenessDetails] = useState(false); // 完成度詳細表示

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

        // helpTextがあれば、別の吹き出しで表示
        if (question.helpText) {
          addAIMessage(question.helpText);
        }

        // placeholderをGoogle Maps情報から動的生成
        let placeholderText = question.placeholder;

        // Q1-3の場合、Google Mapsの業種情報から例を生成
        if (question.id === 'Q1-3' && answers['Q1-0']) {
          const placeInfo = answers['Q1-0'];
          if (placeInfo.types && placeInfo.types.length > 0) {
            const serviceHint = inferServicesFromPlaceTypes(placeInfo.types, placeInfo.name);
            if (serviceHint) {
              placeholderText = `💡 Google Mapsの情報から「${serviceHint}」のようです。`;
            }
          }
        }

        // placeholderがあれば、例として表示
        if (placeholderText) {
          addAIMessage(placeholderText);
        }
      }
    }
  }, [currentApplication]);

  // Step 4開始時にAI質問を生成
  useEffect(() => {
    const initializeStep4 = async () => {
      // Step 4で、まだAI質問が生成されていない場合
      if (currentStep === 4 && aiQuestions.length === 0 && Object.keys(answers).length > 0) {
        console.log('[AI Questions] Initializing Step 4 with AI questions...');

        try {
          setIsLoading(true);
          addAIMessage('口コミ情報とこれまでの回答を分析しています...');

          // Google Maps情報と既存回答を取得
          const placeData = answers['Q2-0'];
          const result = await generateAIQuestions(placeData, answers);

          console.log('[AI Questions] Generated:', result);

          // AI分析結果を表示
          setAiAnalysis(result.analysis);
          addAIMessage(`【分析結果】\n${result.analysis}\n\nこれらを踏まえて、いくつか質問させてください。`);

          // AI質問を保存
          setAiQuestions(result.questions);
          setAiQuestionIndex(0);

          // 最初の質問を表示
          if (result.questions.length > 0) {
            const firstQuestion = result.questions[0];
            setCurrentQuestion(firstQuestion);
            addAIMessage(firstQuestion.text, firstQuestion);
          }

          setIsLoading(false);
        } catch (error) {
          console.error('[AI Questions] Error:', error);
          addAIMessage('AI質問の生成中にエラーが発生しました。標準的な質問を使用します。');
          setIsLoading(false);

          // エラー時は通常のStep 4質問を使用
          const question = getCurrentQuestion();
          if (question) {
            setCurrentQuestion(question);
            addAIMessage(question.text, question);
          }
        }
        return;
      }
    };

    initializeStep4();
  }, [currentStep, answers]);

  // 現在の質問を取得
  useEffect(() => {
    console.log('useEffect triggered - currentStep:', currentStep, 'answers:', answers);

    // Step 4の場合はAI質問を使用
    if (currentStep === 4 && aiQuestions.length > 0) {
      return; // AI質問モードでは通常の質問取得をスキップ
    }

    // Step 1の場合、Google Mapsから自動回答できるかチェック
    if (currentStep === 1) {
      const autoAnswer = getAutoAnswerFromGoogleMaps(answers);
      if (autoAnswer) {
        console.log('[Auto Answer] Google Mapsから自動回答:', autoAnswer);

        // 自動回答を適用
        addAIMessage(`💡 Google Mapsの営業時間情報から「${autoAnswer.answer}」と判断しました。`);
        updateAnswer(autoAnswer.questionId, autoAnswer.answer);
        return; // 次の質問へ
      }
    }

    const question = getCurrentQuestion();
    console.log('Setting currentQuestion to:', question?.id || 'null');

    // 質問が変わった場合のみ更新
    if (question && question.id !== currentQuestion?.id) {
      setCurrentQuestion(question);

      // 最初の質問以外はチャットに表示
      if (Object.keys(answers).length > 0) {
        addAIMessage(question.text, question);

        // Q1-3の場合、Google Mapsの業種情報から3段階で提示
        if (question.id === 'Q1-3' && answers['Q1-0']) {
          const placeInfo = answers['Q1-0'];
          if (placeInfo.types && placeInfo.types.length > 0) {
            const serviceHint = inferServicesFromPlaceTypes(placeInfo.types, placeInfo.name);
            if (serviceHint) {
              // ②Google Mapsから推測した内容を提示
              addAIMessage(`💡 Google Mapsの情報から、${placeInfo.name}のサービスは「${serviceHint}」です。`);

              // ③修正・追加の案内
              addAIMessage('この内容で問題なければそのまま送信、修正や追加がある場合は入力してください。');
            }
          }
        } else if (question.placeholder) {
          // 通常のplaceholder表示
          addAIMessage(`💡 ${question.placeholder}`);
        }
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

    // Step 4のAI質問モードの場合の処理
    if (currentStep === 4 && aiQuestions.length > 0) {
      console.log('[AI Questions] Handling answer for AI question:', {
        questionId,
        currentIndex: aiQuestionIndex,
        totalQuestions: aiQuestions.length
      });

      try {
        setIsLoading(true);

        // ユーザーメッセージを追加
        const answerText = formatAnswerText(questionId, answer);
        addUserMessage(answerText, answer);

        // 回答を保存
        const questionCost = 10; // AI質問のコストは一律10pt
        await saveAnswer(questionId, answer, questionCost);

        // 次のAI質問へ進む、または完了
        const nextIndex = aiQuestionIndex + 1;
        if (nextIndex < aiQuestions.length) {
          // まだAI質問がある場合
          setAiQuestionIndex(nextIndex);
          const nextQuestion = aiQuestions[nextIndex];
          setCurrentQuestion(nextQuestion);
          addAIMessage(nextQuestion.text, nextQuestion);
        } else {
          // すべてのAI質問が完了
          console.log('[AI Questions] All AI questions completed');
          addAIMessage('課題分析が完了しました。次のステップに進みます。');

          // AI質問モードをリセット
          setAiQuestions([]);
          setAiQuestionIndex(0);
          setCurrentQuestion(null);

          // Step 4完了
          setTimeout(() => {
            handleStepComplete();
          }, 2000);
        }

        setIsLoading(false);
        return; // AI質問モードでは以降の処理をスキップ
      } catch (error) {
        console.error('[AI Questions] Error handling answer:', error);
        addAIMessage('回答の保存に失敗しました。もう一度お試しください。');
        setIsLoading(false);
        return;
      }
    }

    // Q2-6: 従業員数の上限チェック
    if (questionId === 'Q2-6') {
      const limit = getEmployeeLimit();
      const employeeCount = answer;

      // 従業員数を数値に変換
      let count = 0;
      if (employeeCount.includes('0人')) count = 0;
      else if (employeeCount.includes('1人')) count = 1;
      else if (employeeCount.includes('2人')) count = 2;
      else if (employeeCount.includes('3人')) count = 3;
      else if (employeeCount.includes('4人')) count = 4;
      else if (employeeCount.includes('5人')) count = 5;
      else if (employeeCount.includes('6～10人')) count = 8;
      else if (employeeCount.includes('11～20人')) count = 15;
      else if (employeeCount.includes('21人以上')) count = 21;

      if (count > limit) {
        addAIMessage(`⚠️ 重要なお知らせ\n\nあなたの業種（${answers['Q1-1']}）の場合、常時雇用従業員は${limit}人以下が対象です。\n\n現在の従業員数（${employeeCount}）では、この補助金の対象外となる可能性があります。\n\n従業員数をご確認の上、もう一度選択し直してください。`);
        setIsLoading(false);
        return;
      }
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

      // 【対話型】ユーザーが質問しているかチェック
      if (typeof answer === 'string' && isUserQuestion(answer)) {
        console.log('[Conversational] User is asking a question:', answer);

        // ユーザーの質問を表示
        addUserMessage(answer, answer);

        // AIが回答
        const aiAnswer = await answerUserQuestion(currentQ, answer, { answers });
        addAIMessage(aiAnswer);

        // 同じ質問を再表示
        setIsLoading(false);
        return;
      }

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

          // Google Maps情報(Q1-0)または旧形式の店舗情報(Q2-0)を取得
          const placeInfo = answers['Q1-0'] || answers['Q2-0'];

          const context = {
            storeName: placeInfo?.name,
            storeAddress: placeInfo?.address,
            philosophy: answers['Q2-5'],
            // Google Mapsの口コミ情報を追加
            rating: placeInfo?.rating,
            userRatingsTotal: placeInfo?.userRatingsTotal,
            reviews: placeInfo?.reviews, // 口コミテキスト配列
            businessType: answers['Q1-1'] // 業種情報
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

      // 【完全自律AI】回答保存後、自律エージェントを起動
      // ただし、Step 1は対話型フローを使用するため、自律エージェントはスキップ
      if (currentStep === 1) {
        console.log('[Conversational Flow] Step 1 - Using conversational flow (autonomous AI disabled)');
      } else if (autonomousMode && currentQuestion) {
        console.log('[Autonomous AI] Analyzing answer with autonomous agent...');

        const updatedAnswers = { ...answers, [questionId]: answer };

        try {
          const agentAction = await runAutonomousLoop(
            questionId,
            currentQuestion,
            answer,
            updatedAnswers,
            { placeInfo: answers['Q2-0'], currentStep }
          );

          console.log('[Autonomous AI] Agent action:', agentAction);

          // エージェントのアクションに応じて処理
          console.log('[ChatContainer] Processing agent action:', agentAction.action);

          if (agentAction.action === 'deep_dive' && agentAction.data) {
            // 深堀り質問を表示
            console.log('[ChatContainer] Showing deep dive question:', agentAction.data);
            addAIMessage(agentAction.message);
            setCurrentQuestion(agentAction.data);
            addAIMessage(agentAction.data.text, agentAction.data);
            return; // 通常フローをスキップ
          } else if (agentAction.action === 'business_detail_question' && agentAction.data) {
            // 業態・特性確認質問を表示
            console.log('[ChatContainer] Showing business detail question:', agentAction.data);
            addAIMessage(agentAction.message);
            setCurrentQuestion(agentAction.data);
            addAIMessage(agentAction.data.text, agentAction.data);
            return; // 通常フローをスキップ
          } else if (agentAction.action === 'industry_question' && agentAction.data) {
            // 業種別の深堀り質問を表示
            console.log('[ChatContainer] Showing industry question:', agentAction.data);
            addAIMessage(agentAction.message);
            setCurrentQuestion(agentAction.data);
            addAIMessage(agentAction.data.text, agentAction.data);
            return; // 通常フローをスキップ
          } else if (agentAction.action === 'flag_critical_issue') {
            // 重大な問題を指摘
            console.log('[ChatContainer] Flagging critical issue');
            addAIMessage(agentAction.message);
          } else if (agentAction.action === 'flag_high_priority_issue') {
            // 高優先度の問題を指摘
            console.log('[ChatContainer] Flagging high priority issue');
            addAIMessage(agentAction.message);
          } else if (agentAction.action === 'suggest_improvement') {
            // 改善提案を表示
            console.log('[ChatContainer] Suggesting improvement');
            if (agentAction.message) {
              addAIMessage(agentAction.message);
            }
          } else if (agentAction.action === 'proceed') {
            console.log('[ChatContainer] Agent says proceed with normal flow');
          }

          // 完成度スコアを更新
          const completeness = calculateOverallCompleteness(updatedAnswers);
          setCompletenessScore(completeness.overallScore);
          console.log('[Autonomous AI] Completeness updated:', completeness.overallScore + '%');

        } catch (agentError) {
          console.error('[Autonomous AI] Agent error:', agentError);
          // エラーでも処理を続行
        }
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
      'Q2-0': 0, 'Q2-1': 0, 'Q2-2': 10, 'Q2-2-1': 10, 'Q2-3': 10, 'Q2-4': 10, 'Q2-5': 10,
      'Q2-6': 10, 'Q2-7-1': 10, 'Q2-7-2': 10, 'Q2-7-3': 10, 'Q2-7-1-profit': 10, 'Q2-7-2-profit': 10, 'Q2-7-3-profit': 10, 'Q2-9': 10, 'Q2-10': 0, 'Q2-11': 10, 'Q2-12': 10, 'Q2-13': 10,
      'Q3-1': 10, 'Q3-1-1': 10, 'Q3-2': 0, 'Q3-3': 10, 'Q3-4': 10, 'Q3-5': 10, 'Q3-6': 20, 'Q3-7': 10, 'Q3-8': 10, 'Q3-9': 10,
      'Q4-1': 10, 'Q4-2': 10, 'Q4-3': 10, 'Q4-4': 10, 'Q4-5': 10,
      'Q4-6': 10, 'Q4-7': 10, 'Q4-8': 20, 'Q4-9': 20, 'Q4-10': 10, 'Q4-11': 10,
      'Q5-1': 20, 'Q5-2': 20, 'Q5-3': 15, 'Q5-4': 15, 'Q5-5': 15, 'Q5-6': 15, 'Q5-6-1': 0,
      'Q5-7': 30, 'Q5-8': 10, 'Q5-9': 10, 'Q5-10': 20, 'Q5-11': 10, 'Q5-12': 10, 'Q5-13': 10, 'Q5-14': 10, 'Q5-15': 10
    };
    return costs[questionId] || 0;
  };

  // 現在の質問を取得（回答済み質問を除外）
  const getCurrentQuestion = () => {
    // Step 1は対話型フローを使用
    if (currentStep === 1) {
      const nextQuestion = getNextStep1Question(answers);
      console.log('[Conversational] Step 1 next question:', nextQuestion?.id || 'complete');

      // Step 1完了チェック
      if (!nextQuestion && isStep1Complete(answers)) {
        console.log('[Conversational] Step 1 complete!');
        return null; // Step 1完了
      }

      return nextQuestion;
    }

    // Step 2以降は従来のフロー
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

  // 業種別の従業員数上限を取得
  const getEmployeeLimit = () => {
    const businessType = answers['Q1-1'] || '';

    // 業種別の従業員数上限
    const limits = {
      '飲食店': 5,
      '小売業': 5,
      '美容・理容業': 5,
      '生活関連サービス': 5,
      '宿泊業': 20,
      '娯楽業': 20,
      '教育・学習支援業': 5,
      '医療・福祉': 5,
      'その他サービス業': 5
    };

    for (const [key, limit] of Object.entries(limits)) {
      if (businessType.includes(key)) {
        return limit;
      }
    }

    return 5; // デフォルト
  };

  // 従業員数のヘルプテキストを動的生成
  const getEmployeeHelpText = () => {
    const limit = getEmployeeLimit();
    return `【常時雇用従業員とは】フルタイム勤務の正社員。経営者本人、同居家族、パート・アルバイトは含まない。あなたの業種は${limit}人以下が対象です。`;
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
        text: `${latestFiscalYear - 3}年度（${latestFiscalYear - 2}年${fiscalMonth}期決算）の会社全体の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：1200',
        helpText: '万円単位で入力してください（例：1200万円の場合は「1200」と入力）。決算書・確定申告書に記載されている会社全体の売上高を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-1-profit',
        text: `${latestFiscalYear - 3}年度（${latestFiscalYear - 2}年${fiscalMonth}期決算）の経常利益を教えてください`,
        type: 'number',
        placeholder: '例：150（黒字の場合）、-50（赤字の場合）',
        helpText: '万円単位で入力してください。赤字の場合はマイナスを付けて入力（例：-50）。決算書・確定申告書に記載されている経常利益を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2',
        text: `${latestFiscalYear - 2}年度（${latestFiscalYear - 1}年${fiscalMonth}期決算）の会社全体の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：1100',
        helpText: '万円単位で入力してください。決算書・確定申告書に記載されている会社全体の売上高を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2-profit',
        text: `${latestFiscalYear - 2}年度（${latestFiscalYear - 1}年${fiscalMonth}期決算）の経常利益を教えてください`,
        type: 'number',
        placeholder: '例：100（黒字の場合）、-30（赤字の場合）',
        helpText: '万円単位で入力してください。赤字の場合はマイナスを付けて入力（例：-30）。決算書・確定申告書に記載されている経常利益を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3',
        text: `${latestFiscalYear - 1}年度（${latestFiscalYear}年${fiscalMonth}期決算）の会社全体の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：900',
        helpText: '万円単位で入力してください。決算書・確定申告書に記載されている会社全体の売上高を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3-profit',
        text: `${latestFiscalYear - 1}年度（${latestFiscalYear}年${fiscalMonth}期決算）の経常利益を教えてください`,
        type: 'number',
        placeholder: '例：80（黒字の場合）、-20（赤字の場合）',
        helpText: '万円単位で入力してください。赤字の場合はマイナスを付けて入力（例：-20）。決算書・確定申告書に記載されている経常利益を入力してください。',
        required: true
      });
    } else if (fiscalYearsCount === 2) {
      // 2期 → 2期分の売上・利益 + 見込み
      salesQuestions.push({
        id: 'Q2-7-1',
        text: `${latestFiscalYear - 2}年度（${latestFiscalYear - 1}年${fiscalMonth}期決算）の会社全体の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：800',
        helpText: '万円単位で入力してください。決算書・確定申告書に記載されている会社全体の売上高を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-1-profit',
        text: `${latestFiscalYear - 2}年度（${latestFiscalYear - 1}年${fiscalMonth}期決算）の経常利益を教えてください`,
        type: 'number',
        placeholder: '例：60（黒字の場合）、-40（赤字の場合）',
        helpText: '万円単位で入力してください。赤字の場合はマイナスを付けて入力。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2',
        text: `${latestFiscalYear - 1}年度（${latestFiscalYear}年${fiscalMonth}期決算予定）の会社全体の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：1000',
        helpText: '万円単位で入力してください。確定していない場合は見込み額を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2-profit',
        text: `${latestFiscalYear - 1}年度（${latestFiscalYear}年${fiscalMonth}期決算予定）の経常利益を教えてください`,
        type: 'number',
        placeholder: '例：80（黒字の場合）、-20（赤字の場合）',
        helpText: '万円単位で入力してください。確定していない場合は見込み額を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3',
        text: `${latestFiscalYear}年度（${latestFiscalYear + 1}年${fiscalMonth}期決算予定）の会社全体の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：1200',
        helpText: '万円単位で見込み額を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3-profit',
        text: `${latestFiscalYear}年度（${latestFiscalYear + 1}年${fiscalMonth}期決算予定）の経常利益見込みを教えてください`,
        type: 'number',
        placeholder: '例：100',
        helpText: '万円単位で見込み額を入力してください。',
        required: true
      });
    } else if (fiscalYearsCount === 1) {
      // 1期終了 → 前期実績・利益 + 当期見込み + 次期見込み
      salesQuestions.push({
        id: 'Q2-7-1',
        text: `${latestFiscalYear - 1}年度（${latestFiscalYear}年${fiscalMonth}期決算）の会社全体の年間売上を教えてください`,
        type: 'number',
        placeholder: '例：600',
        helpText: '万円単位で入力してください。決算書・確定申告書に記載されている会社全体の売上高を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-1-profit',
        text: `${latestFiscalYear - 1}年度（${latestFiscalYear}年${fiscalMonth}期決算）の経常利益を教えてください`,
        type: 'number',
        placeholder: '例：50（黒字の場合）、-30（赤字の場合）',
        helpText: '万円単位で入力してください。決算書・確定申告書に記載されている経常利益を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2',
        text: `${latestFiscalYear}年度（${latestFiscalYear + 1}年${fiscalMonth}期決算予定）の会社全体の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：800',
        helpText: '万円単位で見込み額を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2-profit',
        text: `${latestFiscalYear}年度（${latestFiscalYear + 1}年${fiscalMonth}期決算予定）の経常利益見込みを教えてください`,
        type: 'number',
        placeholder: '例：70',
        helpText: '万円単位で見込み額を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3',
        text: `${latestFiscalYear + 1}年度（${latestFiscalYear + 2}年${fiscalMonth}期決算予定）の会社全体の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：1000',
        helpText: '万円単位で見込み額を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3-profit',
        text: `${latestFiscalYear + 1}年度（${latestFiscalYear + 2}年${fiscalMonth}期決算予定）の経常利益見込みを教えてください`,
        type: 'number',
        placeholder: '例：90',
        helpText: '万円単位で見込み額を入力してください。',
        required: true
      });
    } else {
      // 開業前または開業間もない → 見込みのみ3期分
      const firstYear = latestFiscalYear >= currentYear ? latestFiscalYear : currentYear;
      salesQuestions.push({
        id: 'Q2-7-1',
        text: `${firstYear - 1}年度（${firstYear}年${fiscalMonth}期決算予定）の会社全体の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：500',
        helpText: '万円単位で見込み額を入力してください。初年度の売上見込みを入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-1-profit',
        text: `${firstYear - 1}年度（${firstYear}年${fiscalMonth}期決算予定）の経常利益見込みを教えてください`,
        type: 'number',
        placeholder: '例：40',
        helpText: '万円単位で見込み額を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2',
        text: `${firstYear}年度（${firstYear + 1}年${fiscalMonth}期決算予定）の会社全体の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：700',
        helpText: '万円単位で見込み額を入力してください。2年目の売上見込みを入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-2-profit',
        text: `${firstYear}年度（${firstYear + 1}年${fiscalMonth}期決算予定）の経常利益見込みを教えてください`,
        type: 'number',
        placeholder: '例：60',
        helpText: '万円単位で見込み額を入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3',
        text: `${firstYear + 1}年度（${firstYear + 2}年${fiscalMonth}期決算予定）の会社全体の年間売上見込みを教えてください`,
        type: 'number',
        placeholder: '例：900',
        helpText: '万円単位で見込み額を入力してください。3年目の売上見込みを入力してください。',
        required: true
      });
      salesQuestions.push({
        id: 'Q2-7-3-profit',
        text: `${firstYear + 1}年度（${firstYear + 2}年${fiscalMonth}期決算予定）の経常利益見込みを教えてください`,
        type: 'number',
        placeholder: '例：80',
        helpText: '万円単位で見込み額を入力してください。',
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
          options: [
            '飲食店（レストラン・カフェ・居酒屋等）',
            '小売業（服飾・雑貨・食品販売等）',
            '美容・理容業（美容室・理容室・ネイルサロン等）',
            '生活関連サービス（クリーニング・修理・整体・マッサージ等）',
            '宿泊業（ホテル・旅館・民泊等）',
            '娯楽業（カラオケ・ボウリング・スポーツ施設等）',
            '教育・学習支援業（学習塾・音楽教室・スポーツ教室等）',
            '医療・福祉（整骨院・鍼灸院・デイサービス等）',
            'その他サービス業'
          ],
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
          text: '今回申請する事業で、具体的にどんな取組を検討していますか？（複数選択可）',
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
          helpText: '複数事業を展開している場合は、今回補助金を申請する事業での取組を選択してください。',
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
          id: 'Q2-2-1',
          text: '現在行っている事業内容を教えてください（複数事業を行っている場合はすべて記載）',
          type: 'textarea',
          maxLength: 200,
          placeholder: '例：飲食店経営、ケータリングサービス\n例：建設業、宿泊業（グランピング施設）',
          helpText: '複数の事業を展開している場合は、すべての事業を記載してください。今回の申請は、その中の一つの事業に対して行います。',
          required: true
        },
        {
          id: 'Q2-3',
          text: '今回申請する事業の開業年月を教えてください',
          type: 'date',
          format: 'YYYY-MM',
          helpText: '【重要】今回補助金を申請する事業を開始した年月を入力してください。例：会社は2016年設立（建設業）で、2023年にグランピング施設を開始した場合、グランピング施設で申請するなら「2023年〇月」と入力します。単一事業のみの場合は、会社設立年月または開業届提出年月を入力してください。',
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
          text: '事業を始めた時の想いや、大切にしている理念を教えてください',
          type: 'textarea',
          maxLength: 300,
          placeholder: '簡潔に記入してください（AIが詳しく補完します）',
          examples: [
            '地元の方が気軽に通える場所を作りたかった',
            '高品質なサービスを手頃な価格で提供したい',
            '地域に貢献できる事業を目指しています'
          ],
          helpText: '開業した理由、こだわり、大切にしている価値観などを簡潔に記入してください。AIが申請書に適した文章に補完します',
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
            '6～10人',
            '11～20人',
            '21人以上'
          ],
          helpText: getEmployeeHelpText(),
          required: true
        },
        ...generateSalesQuestions(), // 動的に生成された売上質問を挿入（売上・経常利益セット）
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
        },
        {
          id: 'Q2-10',
          text: '店舗や商品の写真はお持ちですか？',
          type: 'single_select',
          options: [
            'はい、店舗外観・内観・商品写真がある',
            'はい、店舗写真のみある',
            'はい、商品写真のみある',
            'いいえ、写真はない'
          ],
          helpText: '申請書には視覚資料（写真・イラスト）があると審査で有利になります。申請書生成時に【ここに画像を挿入】という提案を記載します。',
          required: true
        },
        {
          id: 'Q2-11',
          text: '平均的な客単価を教えてください',
          type: 'number',
          placeholder: '例：3000',
          helpText: '円単位で入力してください。おおよその平均額で構いません。',
          required: true
        },
        {
          id: 'Q2-12',
          text: '1日あたりの平均来客数（または利用者数）を教えてください',
          type: 'text',
          placeholder: '例：平日20名、休日50名',
          helpText: '平日と休日で分けて記載してください。オンライン事業の場合は月間の注文件数などを記載。',
          required: true
        },
        {
          id: 'Q2-13',
          text: '主力商品・サービスの営業利益率（おおよそ）を教えてください',
          type: 'text',
          placeholder: '例：コーヒー豆 約6%、贈答用セット 約4%',
          helpText: '売上が多い商品や利益率が高い商品について、わかる範囲で記載してください。不明な場合は「不明」と記載。',
          required: false
        }
      ],
      3: [
        {
          id: 'Q3-1',
          text: 'ターゲット顧客の年代層を教えてください（複数選択可）',
          type: 'multi_select',
          options: [
            '10代',
            '20代',
            '30代',
            '40代',
            '50代',
            '60代',
            '70代以上',
            '年齢は問わない'
          ],
          required: true
        },
        {
          id: 'Q3-1-1',
          text: 'ターゲット顧客の属性を教えてください（複数選択可）',
          type: 'multi_select',
          options: [
            'ファミリー層（家族連れ）',
            'カップル・夫婦',
            '友人同士',
            '単身者',
            'ビジネスパーソン',
            '観光客・旅行者',
            '地域住民',
            '学生',
            '主婦・主夫',
            'シニア世代',
            'その他'
          ],
          helpText: '年代とは別に、顧客の属性や利用シーンを選択してください',
          required: true
        },
        {
          id: 'Q3-2',
          text: 'お客様が利用する主な目的は何ですか？（複数選択可）',
          type: 'multi_select',
          options: [
            '日常的な利用',
            '特別な日・記念日',
            'ビジネス利用',
            '観光・レジャー',
            '自分へのご褒美',
            '友人・家族との時間',
            '健康・美容目的',
            '学習・スキルアップ',
            'その他'
          ],
          required: true
        },
        {
          id: 'Q3-3',
          text: '現在、お客様はどのようにあなたの事業を知りますか？（複数選択可）',
          type: 'multi_select',
          options: [
            '知人の紹介・口コミ',
            'Googleマップ・検索',
            'Instagram・SNS',
            '通りがかり',
            'チラシ・ポスター',
            '地域情報誌・フリーペーパー',
            'ホームページ',
            '予約サイト・ポータルサイト',
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
          text: '商圏内の主な競合事業者の状況を教えてください',
          type: 'textarea',
          maxLength: 300,
          placeholder: '簡潔に記入してください（AIが詳しく補完します）',
          examples: [
            '周辺に同業態3店舗。価格帯は当店より低め',
            '競合は多いが高級路線は少ない',
            '駅前に大手チェーンあり。個人店は当店のみ'
          ],
          helpText: '競合の数、価格帯、サービス内容の違いなどを簡潔に記入してください',
          required: true
        },
        {
          id: 'Q3-6',
          text: 'お客様からよく要望される内容は何ですか？（複数選択可）',
          type: 'multi_select',
          options: [
            'オンライン予約の導入',
            'SNSでの情報発信',
            'キャッシュレス決済',
            '営業時間の延長',
            '駐車場の確保',
            '新しいサービス・メニューの追加',
            '店舗の雰囲気改善',
            'スタッフ対応の向上',
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
            'GoogleマップやSNSのビジネスアカウントのみ'
          ],
          required: true
        },
        {
          id: 'Q3-8',
          text: 'お客様の居住地域はどちらが多いですか？（複数選択可）',
          type: 'multi_select',
          options: [
            '店舗と同じ市区町村',
            '隣接する市区町村',
            '同じ都道府県内',
            '他の都道府県',
            '海外',
            '把握していない'
          ],
          helpText: '記載例では地域別の顧客割合を分析しています。おおよその傾向で構いません。',
          required: true
        },
        {
          id: 'Q3-9',
          text: 'あなたの事業の商圏（お客様が来る範囲）はどのくらいですか？',
          type: 'single_select',
          options: [
            '徒歩圏内（半径1km程度）',
            '自転車圏内（半径3km程度）',
            '車で15分圏内（半径5-10km）',
            '車で30分圏内（半径10-20km）',
            '県内全域',
            '全国（オンライン中心）',
            '把握していない'
          ],
          helpText: '主なお客様がどのくらいの範囲から来店・利用されるかを選択してください',
          required: true
        }
      ],
      4: [
        // Step 4はAI自律質問に完全移行
        // 業種ごとの詳細な質問はAIが動的に生成
      ],
      5: [
        {
          id: 'Q5-1',
          text: '【販路開拓の具体的な計画】これまでの分析を踏まえ、今回の補助金で取り組む販路開拓の内容を教えてください',
          type: 'textarea',
          maxLength: 300,
          placeholder: '簡潔に記入してください（AIが詳しく補完します）',
          examples: [
            'Web予約システムを導入し、24時間予約可能にすることで新規顧客を月30組増やす',
            'InstagramとGoogle広告を組み合わせて認知度を高め、来店客数を20%増加させる',
            'ホームページと看板リニューアルで店舗イメージを一新し、客単価を15%向上させる'
          ],
          helpText: '課題分析の結果を踏まえ、具体的な取組内容と目標を記入してください',
          required: true
        },
        {
          id: 'Q5-2',
          text: '【実施する取組の選択】上記の計画を実現するために、実際に実施する取組を選択してください（複数選択可）',
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
          text: '予想される経費の内訳を教えてください（経費区分と金額）',
          type: 'textarea',
          maxLength: 800,
          placeholder: '例：\n②広報費：チラシ制作 30万円\n③ウェブサイト関連費：HP制作 20万円\n①機械装置等費：厨房機器 50万円',
          helpText: '【重要】経費区分を明記してください。①機械装置等費 ②広報費 ③ウェブサイト関連費 ④展示会等出展費 ⑤旅費 ⑥開発費 ⑦資料購入費 ⑧雑役務費 ⑨借料 ⑩設備処分費 ⑪委託・外注費。ウェブサイト関連費は総額の1/4以内（最大50万円）を守ってください。',
          required: true
        },
        {
          id: 'Q5-6-1',
          text: 'ウェブサイト関連費の制約を確認してください',
          type: 'single_select',
          options: [
            '確認しました（ウェブサイト関連費は総額の1/4以内、最大50万円、単独申請ではない）',
            'ウェブサイト関連費は含まれていません'
          ],
          helpText: '【申請の重要ルール】ウェブサイト関連費（HP制作、ECサイト構築等）は、(1)総額の1/4以内 (2)最大50万円 (3)単独申請不可（他の経費と組み合わせ必須）。このルールを守らないと申請書全体が不備扱いになります。',
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
        },
        {
          id: 'Q5-15',
          text: '【業務効率化（任意）】今回の取組で業務効率化も実現できますか？',
          type: 'textarea',
          maxLength: 300,
          placeholder: '例：Web予約システムで電話対応時間が1日2時間削減され、その時間でSNS発信や新メニュー開発に注力できる',
          helpText: '業務効率化を記載する場合は、削減された時間やコストを「販路開拓（新規顧客獲得・売上向上）」にどう活用するかを必ず記載してください。記載は任意です。',
          required: false
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

  // Google Mapsから推測された回答を取得
  const getSuggestedAnswer = (questionId) => {
    // Q1-3の場合、Google Mapsから商品・サービスを推測
    if (questionId === 'Q1-3' && answers['Q1-0']) {
      const placeInfo = answers['Q1-0'];
      if (placeInfo.types && placeInfo.types.length > 0) {
        const serviceHint = inferServicesFromPlaceTypes(placeInfo.types, placeInfo.name);
        return serviceHint || null;
      }
    }
    return null;
  };

  // 前の質問の回答を取得
  const getPreviousAnswer = (currentQuestionId) => {
    // Step 1は対話型フローを使用
    if (currentStep === 1) {
      // Q1-0-confirmの場合、Q1-0のGoogle Maps情報を返す
      if (currentQuestionId === 'Q1-0-confirm') {
        return answers['Q1-0'];
      }
      // その他のStep 1質問の場合も依存関係から前の質問を取得
      return null; // 現時点では不要
    }

    // Step 2以降は従来のフロー
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

      {/* 完成度インジケーター */}
      {completenessScore > 0 && (
        <CompletenessIndicator
          completenessData={calculateOverallCompleteness(answers)}
          onClick={() => setShowCompletenessDetails(!showCompletenessDetails)}
        />
      )}

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
          suggestedAnswer={getSuggestedAnswer(currentQuestion.id)}
          aiDraft={aiDraft}
          onGoBack={handleGoBack}
          canGoBack={Object.keys(answers).length > 0}
          allAnswers={answers}
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

/**
 * Google Maps typesから商品・サービスを推測
 */
const inferServicesFromPlaceTypes = (types, name) => {
  // Google Maps types mapping
  const typeMapping = {
    'restaurant': 'イタリア料理・ワイン販売',
    'bar': 'バー・ワイン販売',
    'cafe': 'カフェ・軽食',
    'bakery': 'パン・焼き菓子販売',
    'meal_takeaway': 'テイクアウト料理',
    'clothing_store': '衣類販売',
    'shoe_store': '靴販売',
    'jewelry_store': 'ジュエリー販売',
    'beauty_salon': '美容・ヘアカット',
    'hair_care': 'ヘアケア・美容',
    'spa': 'エステ・スパ',
    'gym': 'フィットネス・トレーニング',
    'hardware_store': '工具・建築資材販売',
    'florist': '花・フラワーアレンジメント'
  };

  // typesから最初にマッチしたものを返す
  for (const type of types) {
    if (typeMapping[type]) {
      return typeMapping[type];
    }
  }

  // 店名からヒントを得る（例: "Crear Bacchus" → イタリア料理・ワイン）
  if (name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('wine') || nameLower.includes('bacchus')) {
      return 'イタリア料理・ワイン販売';
    }
    if (nameLower.includes('cafe') || nameLower.includes('coffee')) {
      return 'カフェ・コーヒー';
    }
    if (nameLower.includes('salon')) {
      return '美容・ヘアカット';
    }
  }

  return null;
};

export default ChatContainer;
