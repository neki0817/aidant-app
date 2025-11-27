import React, { useState, useEffect, useRef } from 'react';
import { useApplication } from '../../contexts/ApplicationContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../hooks/usePoints';
import { enhanceAnswer, generateAnswerDraft } from '../../services/openai/openai';
import { generateAIQuestions } from '../../services/openai/aiQuestionGenerator';
import { runAutonomousLoop } from '../../services/ai/autonomousAgent';
import { calculateOverallCompleteness } from '../../services/ai/completionTracker';
import { PHASE0_QUESTIONS, getNextPhase0Question, isPhase0Complete } from '../../services/ai/phase0Questions';
import { STEP1_QUESTIONS, getNextStep1Question, isStep1Complete, getAutoAnswerFromGoogleMaps } from '../../services/ai/conversationalQuestionsStep1';
import { isUserQuestion, answerUserQuestion, isAcknowledgment } from '../../services/ai/conversationalFlow';
import { getFirstStep2Question, getNextStep2Question, isStep2Complete } from '../../services/ai/conversationalQuestionsStep2';
import { getNextPhaseQuestion, isPhaseComplete, generateFollowUpQuestions, isFollowUpQuestion } from '../../services/ai/phaseHelpers';
import { ConversationalPhase2Manager } from '../../services/ai/conversationalPhase2';
import { ConversationalPhase3Manager } from '../../services/ai/conversationalPhase3';
import { executeAutoAnalysis } from '../../services/ai/autoAnalysisHandler';
import { executeFollowupAnalysis } from '../../services/ai/aiFollowupHandler';
import { searchPlaceByText, getPlaceDetails } from '../../services/googleMaps/placesSearch';
import { checkCompletenessAndDecideNext } from '../../services/aiAnalysis';
import { fetchWebsiteData, detectUrlType } from '../../services/fetchWebsiteData';
import { handleWebsiteUrl, handleGoogleMapsWebsite } from '../../services/websiteDataHandler';
import { performMarketResearch } from '../../services/deepResearch';
import { validateQ0_2Answer } from '../../services/validateQ0-2Service';
import MessageBubble from './MessageBubble';
import QuestionInput from './QuestionInput';
import ProgressBar from './ProgressBar';
import CompletenessIndicator from './CompletenessIndicator';
import ApplicationDocument from '../document/ApplicationDocument';
import QualityReport from '../document/QualityReport';
import AiDraftOptions from './AiDraftOptions';
import './ChatContainer.css';
import StoreProfileEditor from './StoreProfileEditor';
import FileUpload from './FileUpload';
import ManualExpenseInput from './ManualExpenseInput';
import AIExpenseEstimation from './AIExpenseEstimation';
import SupplierTableInput from './SupplierTableInput';

const ChatContainer = () => {
  const { currentUser: user } = useAuth();
  const {
    currentStep,
    answers,
    setAnswers,
    updateAnswer,
    updateMarketData,
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
  const [showQualityReport, setShowQualityReport] = useState(false); // 品質レポート表示
  const [pendingAnswer, setPendingAnswer] = useState(null); // 補完待ちの回答
  const [aiDraft, setAiDraft] = useState(null); // AI生成下書き
  const [showAiOptions, setShowAiOptions] = useState(false); // AI提案の3択UI表示
  const [aiQuestions, setAiQuestions] = useState([]); // AI生成質問リスト
  const [aiQuestionIndex, setAiQuestionIndex] = useState(0); // 現在のAI質問インデックス
  const [aiAnalysis, setAiAnalysis] = useState(''); // AI分析結果

  // 深堀り質問用の状態
  const [followUpQueue, setFollowUpQueue] = useState([]); // 深堀り質問キュー
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0); // 現在の深堀り質問インデックス

  // 完全自律AIエージェント用の状態
  const [autonomousMode, setAutonomousMode] = useState(true); // 自律モードON/OFF
  const [completenessScore, setCompletenessScore] = useState(0); // 完成度スコア
  const [showCompletenessDetails, setShowCompletenessDetails] = useState(false); // 完成度詳細表示

  // Phase 2 会話形式マネージャー
  const [phase2Manager, setPhase2Manager] = useState(null);

  // Phase 3 会話形式マネージャー
  const [phase3Manager, setPhase3Manager] = useState(null);

  const messagesEndRef = useRef(null);

  // メッセージを自動スクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentQuestion]);

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
      // 最初に挨拶メッセージを表示（welcomeタイプで「始める」ボタン表示）
      const welcomeQuestion = {
        id: 'welcome',
        type: 'welcome',
        text: 'こんにちは！補助金AI申請アシスタントです🤖 小規模事業者持続化補助金の申請書を、私が対話形式でお手伝いします。\n\n所要時間は約20分です。途中で保存もできるので、ご安心ください。'
      };

      addAIMessage(welcomeQuestion.text, welcomeQuestion);
      setCurrentQuestion(welcomeQuestion);
    }
  }, [currentApplication]);

  // welcomeメッセージ後の最初の質問表示
  useEffect(() => {
    if (currentApplication && answers['welcome'] === 'started' && !currentQuestion) {
      // welcomeが完了したら、最初の質問を表示
      const question = getCurrentQuestion();
      if (question) {
        setCurrentQuestion(question);
        addAIMessage(question.text, question);

        // helpTextがあれば、別の吹き出しで表示
        if (question.helpText) {
          addAIMessage(question.helpText);
        }
      }
    }
  }, [answers, currentApplication, currentQuestion]);

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

    // welcomeが回答されていない場合は他の質問を設定しない
    if (!answers['welcome']) {
      console.log('[Welcome] Waiting for welcome answer');
      return;
    }

    // 深堀り質問モード中は通常の質問取得をスキップ
    if (followUpQueue.length > 0) {
      console.log('[Follow-Up] Skipping normal question flow - in follow-up mode');
      return;
    }

    // Step 4の場合はAI質問を使用
    if (currentStep === 4 && aiQuestions.length > 0) {
      return; // AI質問モードでは通常の質問取得をスキップ
    }

    // Step 1の場合、Google Mapsから自動回答できるかチェック
    if (currentStep === 1 || currentStep === 2) {
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

    // AI質問生成フラグが立っている場合（Phase 2）
    // Phase 2の会話形式マネージャーを初期化
    // ⚠️ 最優先でチェック（他のどの処理よりも先に実行）
    if (question && question.ai_generation === true && question.phase === 2) {
      console.log('[Phase 2 Conversational] Initializing manager...');

      if (!phase2Manager) {
        const businessType = answers['Q1-1'] || '飲食業';
        const manager = new ConversationalPhase2Manager(businessType, answers);
        setPhase2Manager(manager);

        setIsLoading(true);
        addAIMessage('Gemini 3.0で業種に合わせた質問を生成中...');

        // 最初の質問を生成（Gemini 3.0 動的質問生成を試行）
        manager.startDataItemConversation()
          .then(firstQuestion => {
            setIsLoading(false);
            if (firstQuestion) {
              console.log('[Phase 2 Conversational] First question:', firstQuestion);

              // Gemini 3.0で業種判定された場合、業種情報を表示
              const industryInfo = manager.getIndustryInfo();
              if (industryInfo && manager.hasGeminiQuestions()) {
                addAIMessage(`【業種判定】${industryInfo.category}\n\n業種に特化した質問を用意しました。`);
              }

              setCurrentQuestion(firstQuestion);
              addAIMessage(firstQuestion.text, firstQuestion);
            } else {
              // エラー処理
              console.error('[Phase 2 Conversational] Failed to generate first question');
              addAIMessage('質問の生成に失敗しました。もう一度お試しください。');
            }
          })
          .catch(error => {
            setIsLoading(false);
            console.error('[Phase 2 Conversational] Error:', error);
            addAIMessage('エラーが発生しました。もう一度お試しください。');
          });
      } else {
        // マネージャーは既に初期化済み（質問生成中）
        console.log('[Phase 2 Conversational] Manager already initialized, waiting for questions...');
      }

      return; // これ以上の処理をスキップ
    }

    // AI質問生成フラグが立っている場合（Phase 3）
    // Phase 3の会話形式マネージャーを初期化
    if (question && question.ai_generation === true && question.phase === 3) {
      console.log('[Phase 3 Conversational] Initializing manager...');

      if (!phase3Manager) {
        const businessType = answers['Q1-1'] || '飲食業';
        const manager = new ConversationalPhase3Manager(businessType, answers);
        setPhase3Manager(manager);

        setIsLoading(true);
        addAIMessage('あなたのお店の強みについて教えてください...');

        // 最初の質問を生成
        manager.getNextQuestion()
          .then(firstQuestion => {
            setIsLoading(false);
            if (firstQuestion) {
              console.log('[Phase 3 Conversational] First question:', firstQuestion);
              setCurrentQuestion(firstQuestion);
              addAIMessage(firstQuestion.text, firstQuestion);
            } else {
              // エラー処理
              console.error('[Phase 3 Conversational] Failed to generate first question');
              addAIMessage('質問の生成に失敗しました。もう一度お試しください。');
            }
          })
          .catch(error => {
            setIsLoading(false);
            console.error('[Phase 3 Conversational] Error:', error);
            addAIMessage('エラーが発生しました。もう一度お試しください。');
          });
      } else {
        // マネージャーは既に初期化済み（質問生成中）
        console.log('[Phase 3 Conversational] Manager already initialized, waiting for questions...');
      }

      return; // これ以上の処理をスキップ
    }

    // 質問が変わった場合のみ更新
    if (question && question.id && question.id !== currentQuestion?.id) {
      setCurrentQuestion(question);

      // autoProgressタイプの質問（welcome, ai_place_analysis, completion等）は自動的に次へ
      if (question.autoProgress && question.type !== 'place_confirm') {
        console.log('[Auto Progress] Detected auto-progress type:', question.type);
        const messageText = question.generateMessage ? question.generateMessage(answers) : question.text;
        addAIMessage(messageText, question);

        // welcomeタイプの場合は自動進行させない（ユーザーが「次へ」ボタンを押すまで待つ）
        if (question.type === 'welcome') {
          return;
        }

        // completionタイプの場合は、メッセージ表示後にPhase遷移
        if (question.type === 'completion') {
          console.log('[Auto Progress] Completion type - advancing to next phase');
          setTimeout(() => {
            if (currentApplication) {
              updateAnswer(question.id, 'auto_progressed');
            }
          }, 2000); // 2秒後にPhase遷移
          return;
        }

        // ai_place_analysisタイプの場合、ディープリサーチを実行
        if (question.type === 'ai_place_analysis') {
          console.log('[Deep Research] Starting market research in background...');

          // バックグラウンドでディープリサーチを実行（完了メッセージは後で表示）
          performMarketResearch(answers, answers['Q1-0'])
            .then(async (researchReport) => {
              console.log('[Deep Research] Market research completed');

              // 結果をFirestoreに保存
              if (currentApplication) {
                await updateMarketData(researchReport);
                console.log('[Deep Research] Research data saved to Firestore');
              }

              // 完了メッセージは削除（Q1-1表示時に出す）
            })
            .catch(error => {
              console.error('[Deep Research] Error:', error);
              // エラー時のみメッセージ表示
              addAIMessage('⚠️ 市場調査でエラーが発生しましたが、質問は続行します。');
            });

          // ディープリサーチは非同期で実行するため、すぐに次へ進む
          setTimeout(() => {
            if (currentApplication) {
              updateAnswer(question.id, 'auto_progressed');
            }
          }, 1500);
          return;
        }

        // その他のautoProgressタイプは自動的に次へ
        setTimeout(() => {
          if (currentApplication) {
            updateAnswer(question.id, 'auto_progressed');
          }
        }, 1500);
        return;
      }

      // 自動分析タイプの質問の場合、即座に実行
      if (question.type === 'auto_analyze_competitors' || question.type === 'auto_analyze_reviews' || question.type === 'ai_followup_analysis') {
        console.log('[Auto Analysis] Detected auto analysis type:', question.type);

        // 非同期で自動分析を実行
        (async () => {
          try {
            setIsLoading(true);

            let analysisResult;

            // タイプに応じた処理
            if (question.type === 'ai_followup_analysis') {
              // AI補完分析
              analysisResult = await executeFollowupAnalysis(answers);
            } else {
              // 競合・口コミ分析
              analysisResult = await executeAutoAnalysis(question.id, question.type, answers);
            }

            console.log('[Auto Analysis] Result:', analysisResult);

            // 結果を保存
            updateAnswer(question.id, analysisResult);

            setIsLoading(false);

            // 次の質問に自動遷移
            // useEffectが再度トリガーされて次の質問が表示される
          } catch (error) {
            console.error('[Auto Analysis] Error:', error);
            addAIMessage(`分析中にエラーが発生しました: ${error.message}\n\n手動で入力してください。`);
            setIsLoading(false);

            // エラー時は手動入力にフォールバック
            if (question.type === 'auto_analyze_competitors') {
              updateAnswer(question.id, { competitors: [], error: error.message });
            } else if (question.type === 'auto_analyze_reviews') {
              updateAnswer(question.id, { keywords: [], strengthsText: '', error: error.message });
            } else if (question.type === 'ai_followup_analysis') {
              updateAnswer(question.id, { questions: [], error: error.message });
            }
          }
        })();

        return; // これ以上の処理をスキップ
      }

      // 最初の質問以外はチャットに表示
      if (Object.keys(answers).length > 0) {
        // prependMessageがある場合は、質問の前にメッセージを表示
        if (question.prependMessage) {
          addAIMessage(question.prependMessage);
        }

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
        }
        // placeholderは入力フィールド内に表示されるため、別メッセージとして表示しない
      }
    } else if (!question && Object.keys(answers).length > 0) {
      // 質問がなくなった（ステップ完了）
      // Phase 0完了の場合
      if (currentStep === 0 && isPhase0Complete(answers)) {
        console.log('[Phase 0] Phase complete - moving to Phase 1');
        setCurrentQuestion(null);
        handleStepComplete();
      }
      // Step 1完了の場合
      else if (currentStep === 1 && isStep1Complete(answers)) {
        setCurrentQuestion(null);
        handleStepComplete();
      }
      // Phase 2-4完了の場合
      else if (currentStep >= 2 && currentStep <= 4 && isPhaseComplete(currentStep, answers)) {
        console.log(`[Phase ${currentStep}] Phase complete - moving to next step`);
        setCurrentQuestion(null);
        handleStepComplete();
      }
      // Phase 5完了の場合、AI分析を実行してから次へ進む
      else if (currentStep === 5 && isPhaseComplete(5, answers) && !isPhaseComplete(6, answers)) {
        console.log(`[Phase 5] Phase complete - running AI completeness analysis`);
        handlePhase5Complete();
      }
      // Phase 6完了の場合、申請書生成へ
      else if (currentStep === 5 && isPhaseComplete(5, answers) && isPhaseComplete(6, answers)) {
        console.log(`[Phase 6] Phase complete - ready to generate application`);
        setCurrentQuestion(null);
        handleStepComplete();
      }
      // Step 6（旧Step 2）完了の場合
      else if (currentStep === 6 && isStep2Complete(answers)) {
        setCurrentQuestion(null);
        handleStepComplete();
      }
      // その他のステップ
      else if (currentQuestion) {
        setCurrentQuestion(null);
        handleStepComplete();
      }
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

  // AI提案メッセージを追加（2つの吹き出しで表示）
  const addAISuggestion = (suggestion) => {
    if (!suggestion) return;

    // 1つ目の吹き出し: 提案内容
    const suggestionMessage = {
      id: `ai-suggestion-${Date.now()}-${Math.random()}`,
      type: 'ai',
      text: `💡 ${suggestion}`,
      isSuggestion: true,
      timestamp: new Date()
    };

    // 2つ目の吹き出し: コピー案内
    const instructionMessage = {
      id: `ai-instruction-${Date.now()}-${Math.random()}`,
      type: 'ai',
      text: '上記をコピーして使うこともできます。',
      timestamp: new Date()
    };

    // 2つのメッセージを順番に追加
    setMessages(prev => [...prev, suggestionMessage, instructionMessage]);
  };

  // currentQuestionが変わったときにAI提案を表示
  useEffect(() => {
    if (currentQuestion && currentQuestion.generateSuggestion && typeof currentQuestion.generateSuggestion === 'function') {
      try {
        const suggestion = currentQuestion.generateSuggestion(answers);
        console.log('[AI Suggestion] Question:', currentQuestion.id, 'Suggestion:', suggestion);
        if (suggestion) {
          addAISuggestion(suggestion);
        }
      } catch (error) {
        console.error('[AI Suggestion] Error:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]); // currentQuestion.idが変わったときのみ実行

  // 質問とAI提案を表示する共通関数
  const showQuestionWithSuggestion = (question) => {
    if (!question) return;

    // AI提案を生成して表示
    if (question.generateSuggestion && typeof question.generateSuggestion === 'function') {
      const suggestion = question.generateSuggestion(answers);
      if (suggestion) {
        addAISuggestion(suggestion);
      }
    }

    // 質問を表示
    setCurrentQuestion(question);
    addAIMessage(question.text, question);
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

    // 深堀り質問に対する回答の場合
    if (isFollowUpQuestion(questionId) && followUpQueue.length > 0) {
      console.log('[Follow-Up] Handling follow-up answer:', {
        questionId,
        currentIndex: currentFollowUpIndex,
        totalFollowUps: followUpQueue.length
      });

      try {
        setIsLoading(true);

        // ユーザーメッセージを追加
        const answerText = formatAnswerText(questionId, answer);
        addUserMessage(answerText, answer);

        // 回答を保存（深堀り質問はポイント消費なし）
        await updateAnswer(questionId, answer);

        // 簡単な確認メッセージ
        addAIMessage(`了解です。`);

        // 次の深堀り質問へ進む、または通常フローに戻る
        const nextIndex = currentFollowUpIndex + 1;
        console.log('[Follow-Up] Next index check:', {
          nextIndex,
          totalFollowUps: followUpQueue.length,
          hasMore: nextIndex < followUpQueue.length
        });

        if (nextIndex < followUpQueue.length) {
          // まだ深堀り質問がある場合
          console.log('[Follow-Up] Moving to next follow-up question:', followUpQueue[nextIndex].id);
          setCurrentFollowUpIndex(nextIndex);
          const nextFollowUp = followUpQueue[nextIndex];
          setCurrentQuestion(nextFollowUp);
          addAIMessage(nextFollowUp.text, nextFollowUp);
        } else {
          // 全ての深堀り質問が完了 - 通常フローに戻る
          console.log('[Follow-Up] All follow-up questions completed - returning to normal flow');
          console.log('[Follow-Up] Current step:', currentStep);
          console.log('[Follow-Up] Current answers:', Object.keys(answers));
          console.log('[Follow-Up] Last answered question:', questionId);
          addAIMessage('ありがとうございます。次の質問に進みますね。');

          // 深堀りモードを解除
          setFollowUpQueue([]);
          setCurrentFollowUpIndex(0);

          // 次の本質問を取得して表示
          console.log('[Follow-Up] Getting next main question...');
          console.log('[Follow-Up] Calling getCurrentQuestion()...');
          const nextQuestion = getCurrentQuestion();
          console.log('[Follow-Up] Next question:', nextQuestion);
          console.log('[Follow-Up] Next question ID:', nextQuestion ? nextQuestion.id : 'null');

          if (nextQuestion) {
            setCurrentQuestion(nextQuestion);
            addAIMessage(nextQuestion.text, nextQuestion);
          } else {
            // 質問がない場合はPhase完了チェック
            console.log('[Follow-Up] No more questions - checking if Phase is complete');
            setCurrentQuestion(null);

            // Phase 2-5の完了をチェック
            if (currentStep >= 2 && currentStep <= 5 && isPhaseComplete(currentStep, answers)) {
              console.log(`[Follow-Up] Phase ${currentStep} is complete - advancing to next step`);
              handleStepComplete();
            }
          }
        }

        setIsLoading(false);
        return; // 深堀り質問モードでは以降の処理をスキップ
      } catch (error) {
        console.error('[Follow-Up] Error handling answer:', error);
        addAIMessage('回答の保存に失敗しました。もう一度お試しください。');
        setIsLoading(false);
        return;
      }
    }

    // AI生成追加質問に対する回答の場合（Phase 5完了後）
    if (questionId.startsWith('AI-F') && currentQuestion && currentQuestion.isAIGenerated) {
      console.log('[AI Follow-Up] Handling AI-generated follow-up answer:', {
        questionId,
        targetSection: currentQuestion.targetSection,
        targetGap: currentQuestion.targetGap
      });

      try {
        setIsLoading(true);

        // ユーザーメッセージを追加
        const answerText = formatAnswerText(questionId, answer);
        addUserMessage(answerText, answer);

        // 回答を保存（AI追加質問はポイント消費なし）
        await updateAnswer(questionId, answer);

        addAIMessage('ありがとうございます。回答を分析しています...');

        // 再度完成度をチェック
        const placeData = answers['Q1-0'] || {};
        const analysisData = aiAnalysis ? JSON.parse(aiAnalysis) : null;

        // 前回の gaps から今回回答した gap を除外
        const remainingGaps = analysisData?.gaps?.filter(
          gap => gap.gap !== currentQuestion.targetGap
        ) || [];

        if (remainingGaps.length > 0) {
          // まだ不足情報がある → 次のAI質問を生成
          const { generateFollowUpQuestion } = await import('../../services/aiAnalysis');
          const result = await generateFollowUpQuestion(remainingGaps, answers, placeData);

          if (result.success) {
            const aiQuestion = result.question;
            const question = {
              id: aiQuestion.id,
              text: aiQuestion.text,
              type: aiQuestion.type,
              placeholder: aiQuestion.placeholder,
              helpText: aiQuestion.helpText,
              options: aiQuestion.options || undefined,
              targetSection: aiQuestion.targetSection,
              targetGap: aiQuestion.targetGap,
              isAIGenerated: true
            };

            setCurrentQuestion(question);
            addAIMessage(question.text, question);
            if (question.helpText) {
              addAIMessage(question.helpText);
            }

            // gaps を更新
            setAiAnalysis(JSON.stringify({
              completeness: analysisData?.completeness,
              gaps: remainingGaps
            }));
          } else {
            // AI質問生成失敗 → Phase 6へ
            proceedToPhase6();
          }
        } else {
          // 全ての不足情報を埋めた → Phase 6へ
          addAIMessage('追加情報が揃いました！\n\n最後に、文章スタイルの確認に進みます。');
          proceedToPhase6();
        }

        setIsLoading(false);
        return; // AI追加質問モードでは以降の処理をスキップ
      } catch (error) {
        console.error('[AI Follow-Up] Error handling answer:', error);
        addAIMessage('エラーが発生しました。Phase 6に進みます。');
        proceedToPhase6();
        setIsLoading(false);
        return;
      }
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
      const employeeCount = String(answer); // 文字列に変換

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

      // 【Google Maps検索】Q1-0（店舗名入力）の場合、Google Maps検索を実行
      if (questionId === 'Q1-0' && typeof answer === 'string' && answer.trim().length > 0) {
        console.log('[Google Maps Search] Searching for:', answer);

        try {
          // Google Maps検索を実行（複数候補を取得）
          addAIMessage('Google Mapsで店舗情報を検索しています...');
          const result = await searchPlaceByText(answer, true);

          console.log('[Google Maps Search] Search result:', result);

          // 複数候補がある場合、ユーザーに選択させる
          if (result.multiple && result.candidates && result.candidates.length > 1) {
            addAIMessage(`🔍 複数の候補が見つかりました。該当する店舗を選んでください：`);

            // 候補を選択肢として表示（「該当なし」「手動入力」オプション追加）
            const candidateOptions = result.candidates.map((candidate, index) => ({
              value: candidate.place_id,
              label: `${candidate.name}\n📍 ${candidate.address}${candidate.rating ? `\n⭐ ${candidate.rating} (${candidate.userRatingsTotal}件)` : ''}`
            }));

            // 「該当なし（再検索）」「手動で入力する」を追加
            candidateOptions.push({
              value: '__retry__',
              label: '📝 該当なし（別の名前で再検索する）'
            });
            candidateOptions.push({
              value: '__manual__',
              label: '✏️ Google Mapsに情報がない（手動で入力する）'
            });

            const candidateQuestion = {
              id: 'Q1-0-select',
              text: '',
              type: 'single_select',
              options: candidateOptions
            };

            setCurrentQuestion(candidateQuestion);
            // 質問のみ設定（空文字列のメッセージは作成しない）
            setIsLoading(false);
            return;
          }

          // 単一の結果の場合
          const placeData = result.multiple ? await getPlaceDetails(result.candidates[0].place_id) : result;
          console.log('[Google Maps Search] Place data retrieved:', placeData);

          // 検索結果を保存
          await saveAnswer(questionId, placeData, 0);

          // 検索成功メッセージ
          addAIMessage(`✅ 店舗情報を取得しました！\n\n【${placeData.name}】\n📍 ${placeData.address}`);

          // 次の質問を取得して表示
          const nextQuestion = getCurrentQuestion();
          if (nextQuestion) {
            setCurrentQuestion(nextQuestion);
            addAIMessage(nextQuestion.text, nextQuestion);
          }

          setIsLoading(false);
          return;
        } catch (error) {
          console.error('[Google Maps Search] Error:', error);
          addAIMessage(`❌ 店舗情報の取得に失敗しました\n\n${error.message}\n\n店舗名や住所を変えて、もう一度入力してください。`);
          setIsLoading(false);
          return;
        }
      }

      // 【候補選択】Q1-0-select（複数候補から選択）の場合
      if (questionId === 'Q1-0-select') {
        console.log('[Google Maps Select] User selected:', answer);

        // 「再検索」が選択された場合
        if (answer === '__retry__') {
          addAIMessage('では、別の店舗名や住所で再度検索します。\n\n例：「スターバックス 渋谷店」「東京都渋谷区○○」のように、より具体的に入力してください。');

          // Q1-0に戻る
          const q10Question = {
            id: 'Q1-0',
            text: 'あなたのお店や会社の名前を教えてください',
            type: 'text',
            placeholder: '例：スターバックス 渋谷店、東京都渋谷区○○'
          };
          setCurrentQuestion(q10Question);
          // 質問のみ設定（空文字列のメッセージは作成しない）
          setIsLoading(false);
          return;
        }

        // 「手動入力」が選択された場合
        if (answer === '__manual__') {
          addAIMessage('承知しました。Google Mapsの情報がない場合は、手動で基本情報を入力していただきます。');

          // Q1-0-manualに進む（手動入力フロー）
          const manualQuestion = {
            id: 'Q1-0-manual-name',
            text: 'お店や会社の正式名称を教えてください',
            type: 'text',
            placeholder: '例：株式会社○○、○○商店'
          };
          setCurrentQuestion(manualQuestion);
          addAIMessage(manualQuestion.text, manualQuestion);
          setIsLoading(false);
          return;
        }

        // 通常の候補選択（place_idが選ばれた場合）
        try {
          // Place IDから詳細情報を取得
          addAIMessage('選択された店舗の詳細情報を取得しています...');
          const placeData = await getPlaceDetails(answer);

          console.log('[Google Maps Select] Place data retrieved:', placeData);

          // Q1-0の回答として保存（Q1-0-selectではなく）
          await saveAnswer('Q1-0', placeData, 0);

          // 検索成功メッセージ
          addAIMessage(`✅ 店舗情報を取得しました！\n\n【${placeData.name}】\n📍 ${placeData.address}`);

          // 次の質問を取得して表示
          const nextQuestion = getCurrentQuestion();
          if (nextQuestion) {
            setCurrentQuestion(nextQuestion);
            addAIMessage(nextQuestion.text, nextQuestion);
          }

          setIsLoading(false);
          return;
        } catch (error) {
          console.error('[Google Maps Select] Error:', error);
          addAIMessage(`❌ 店舗情報の取得に失敗しました\n\n${error.message}`);
          setIsLoading(false);
          return;
        }
      }

      // 【手動入力フロー】Q1-0-manual-name（店舗名手動入力）
      if (questionId === 'Q1-0-manual-name') {
        console.log('[Manual Input] Business name:', answer);

        // 回答を保存（住所入力時に参照するため）
        await saveAnswer(questionId, answer, 0);

        const addressQuestion = {
          id: 'Q1-0-manual-address',
          text: '店舗・事務所の住所を教えてください',
          type: 'text',
          placeholder: '例：東京都渋谷区渋谷1-1-1'
        };
        setCurrentQuestion(addressQuestion);
        addAIMessage(addressQuestion.text, addressQuestion);
        setIsLoading(false);
        return;
      }

      // 【手動入力フロー】Q1-0-manual-address（住所手動入力）
      if (questionId === 'Q1-0-manual-address') {
        console.log('[Manual Input] Address:', answer);

        // 回答を保存
        await saveAnswer(questionId, answer, 0);

        // 次は営業日の質問
        const openingDaysQuestion = {
          id: 'Q1-0-manual-openingDays',
          text: '営業日を教えてください（週何日営業していますか？）',
          type: 'text',
          placeholder: '例：週6日、毎日、月〜金曜日'
        };
        setCurrentQuestion(openingDaysQuestion);
        addAIMessage(openingDaysQuestion.text, openingDaysQuestion);
        setIsLoading(false);
        return;
      }

      // 【手動入力フロー】Q1-0-manual-openingDays（営業日手動入力）
      if (questionId === 'Q1-0-manual-openingDays') {
        console.log('[Manual Input] Opening days:', answer);

        // 回答を保存
        await saveAnswer(questionId, answer, 0);

        // 次は口コミ評価の質問
        const ratingQuestion = {
          id: 'Q1-0-manual-rating',
          text: '口コミ評価はありますか？（Google Maps、食べログ等での評価）',
          type: 'text',
          placeholder: '例：★3.9 (169件)、評価なし'
        };
        setCurrentQuestion(ratingQuestion);
        addAIMessage(ratingQuestion.text, ratingQuestion);
        setIsLoading(false);
        return;
      }

      // 【手動入力フロー】Q1-0-manual-rating（口コミ評価手動入力）
      if (questionId === 'Q1-0-manual-rating') {
        console.log('[Manual Input] Rating:', answer);

        // 全ての手動入力データをまとめてplaceData形式で保存
        const businessName = answers['Q1-0-manual-name'];
        const address = answers['Q1-0-manual-address'];
        const openingDays = answers['Q1-0-manual-openingDays'];
        const rating = answer;

        const manualPlaceData = {
          place_id: null,
          name: businessName,
          address: address,
          location: null,
          rating: null,
          userRatingsTotal: 0,
          types: [],
          openingHours: openingDays ? { weekday_text: [openingDays] } : null,
          reviews: rating && rating !== '評価なし' ? [{ text: rating }] : [],
          phoneNumber: null,
          website: null,
          photos: [],
          isManualInput: true // 手動入力フラグ
        };

        // Q1-0の回答として保存
        await saveAnswer('Q1-0', manualPlaceData, 0);

        addAIMessage(`✅ 基本情報を登録しました！\n\n【${manualPlaceData.name}】\n📍 ${manualPlaceData.address}\n📅 ${openingDays}\n⭐ ${rating}`);

        // Q1-0-analysisをスキップして、Q1-1に進む
        // 手動入力の場合はGoogle Maps情報がないため、分析メッセージは不要
        await saveAnswer('Q1-0-analysis', 'skipped', 0); // Q1-0-analysisをスキップ済みとしてマーク

        // Q1-1（業種）の質問を表示
        const nextQuestion = getCurrentQuestion();
        if (nextQuestion && nextQuestion.id === 'Q1-1') {
          setCurrentQuestion(nextQuestion);
          addAIMessage(nextQuestion.text, nextQuestion);
        }

        setIsLoading(false);
        return;
      }

      // 【店舗プロフィール】Q1-0-profile（店舗プロフィール確認）
      if (questionId === 'Q1-0-profile') {
        console.log('[Store Profile] Profile confirmed:', answer);

        // プロフィール生成をスキップした場合（answer === null）
        if (answer === null) {
          console.log('[Store Profile] Profile generation skipped');
          
          // Q1-0-profileをスキップ済みとしてマーク
          await saveAnswer(questionId, 'skipped', 0);
          
          addAIMessage('プロフィール生成をスキップしました。通常の質問に進みます。');
          
          // 次の質問を取得して表示
          const nextQuestion = getCurrentQuestion();
          if (nextQuestion) {
            setTimeout(() => {
              addAIMessage(nextQuestion.text, nextQuestion);
              setCurrentQuestion(nextQuestion);
            }, 100);
          }
          
          setIsLoading(false);
          return;
        }

        // プロフィールを保存
        await saveAnswer(questionId, answer, 0);

        // プロフィールから残りのPhase 1質問に自動入力
        const { autoFillFromStoreProfile } = await import('./../../services/ai/conversationalQuestionsStep1');
        const autoAnswers = autoFillFromStoreProfile(answer);

        console.log('[Store Profile] Auto-filling answers:', autoAnswers);

        // 自動入力された回答を一括保存
        for (const [qId, qAnswer] of Object.entries(autoAnswers)) {
          await saveAnswer(qId, qAnswer, 0);
          setAnswers(prev => ({
            ...prev,
            [qId]: qAnswer
          }));
        }

// 次の質問を取得
        const nextQuestion = getCurrentQuestion();

        // 確認メッセージを先に表示
        addAIMessage(`✅ 店舗プロフィールを確認しました！\n\nいくつかの質問は自動入力しましたので、残りの質問に答えてください。`);

        // 次の質問は少し遅延して表示（メッセージが先に表示されるようにする）
        if (nextQuestion) {
          setTimeout(() => {
            addAIMessage(nextQuestion.text, nextQuestion);
            setCurrentQuestion(nextQuestion);
          }, 100);
        }

        setIsLoading(false);
        return;
      }

      // 【相槌】ユーザーの相槌（「はい」「そうです」など）をチェック
      if (typeof answer === 'string' && isAcknowledgment(answer)) {
        console.log('[Conversational] User acknowledgment:', answer);

        // ユーザーメッセージを表示
        addUserMessage(answer, answer);

        // 深堀り質問モード中の場合は次の深堀り質問へ
        if (followUpQueue.length > 0 && currentFollowUpIndex + 1 < followUpQueue.length) {
          const nextIndex = currentFollowUpIndex + 1;
          setCurrentFollowUpIndex(nextIndex);
          const nextFollowUp = followUpQueue[nextIndex];
          setCurrentQuestion(nextFollowUp);
          addAIMessage(nextFollowUp.text, nextFollowUp);
          setIsLoading(false);
          return;
        }

        // 深堀り質問がない場合は簡単な確認メッセージを表示して、回答を保存
        addAIMessage('了解です。');

        // Q1-0-website-checkで「はい」を選択した場合、説明メッセージを追加
        if (questionId === 'Q1-0-website-check' && answer === 'はい') {
          addAIMessage('💡 以下のようなURLが利用できます：\n\n【飲食店】食べログ、ぐるなび、ホットペッパーグルメ、公式HP、Instagram\n\n【美容室】ホットペッパービューティー、楽天ビューティー、公式HP、Instagram\n\n【小売・サービス】公式HP、Instagram、Facebook、ECサイト');
        }

        // 回答を保存（次の質問に進むため）
        const questionCost = getQuestionCost(questionId);
        await saveAnswer(questionId, answer, questionCost);

        // saveAnswer後に次の質問を表示
        const nextQuestion = getCurrentQuestion();
        if (nextQuestion) {
          showQuestionWithSuggestion(nextQuestion);
          if (nextQuestion.helpText) {
            addAIMessage(nextQuestion.helpText);
          }
        }

        setIsLoading(false);
        return;
      }

      // 【対話型】ユーザーが質問しているかチェック
      // ただし、深堀り質問モード中は質問として解釈しない
      const isInFollowUpMode = followUpQueue.length > 0;
      if (typeof answer === 'string' && !isInFollowUpMode && isUserQuestion(answer)) {
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
      console.log('[handleAnswer] Point check:', { questionCost, pointBalance, hasEnough: pointBalance >= questionCost });

      if (questionCost > 0) {
        const hasEnoughPoints = await checkPointBalance(questionCost);
        if (!hasEnoughPoints) {
          console.warn('[handleAnswer] Insufficient points!', { required: questionCost, current: pointBalance });
          addAIMessage(`ポイントが不足しています。この質問には${questionCost}ポイント必要ですが、現在${pointBalance}ポイントしかありません。ポイントを購入してください。`);
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

      // AI補完機能は無効化（対話形式で深堀りするため）
      // 全ての質問タイプで通常保存
      await saveAnswer(questionId, answer, questionCost);

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

      // 【深堀り質問】Phase 2-5の質問に対して、まず深堀り質問があるかチェック
      let hasFollowUps = false;
      if (currentStep >= 2 && currentStep <= 5 && !isFollowUpQuestion(questionId)) {
        const updatedAnswers = { ...answers, [questionId]: answer };
        const result = generateFollowUpQuestions(questionId, answer, updatedAnswers);

        if (result && result.followUps && result.followUps.length > 0) {
          console.log('[Follow-Up] Generated', result.followUps.length, 'follow-up questions');
          hasFollowUps = true;

          // 深堀り質問を先に設定（updateAnswerの前に）
          setFollowUpQueue(result.followUps);
          setCurrentFollowUpIndex(0);

          // 確認メッセージと最初の深堀り質問を準備
          const confirmMsg = result.confirmMessage;
          const firstFollowUp = result.followUps[0];

          // updateAnswerを実行
          await updateAnswer(questionId, answer);

          // ポイント消費
          if (questionCost > 0) {
            console.log('[saveAnswer] (Follow-up) Attempting to consume points:', { questionCost, questionId });
            try {
              await consumePoints(questionCost, `質問回答: ${questionId}`);
              console.log('[saveAnswer] (Follow-up) Points consumed successfully');
            } catch (error) {
              console.error('[saveAnswer] (Follow-up) Failed to consume points:', error);
              throw error;
            }
          } else {
            console.log('[saveAnswer] (Follow-up) No point cost for this question:', questionId);
          }

          // 確認メッセージを表示
          if (confirmMsg) {
            addAIMessage(confirmMsg);
          }

          // 最初の深堀り質問を表示
          setCurrentQuestion(firstFollowUp);
          addAIMessage(firstFollowUp.text, firstFollowUp);
          return; // 通常フローをスキップ
        }
      }

      // 深堀り質問がない場合は通常の保存処理
      // updateAnswerがApplicationContext内でsetAnswersを呼び出す
      // Q1-0-websiteの処理
      // Q1-0uff08Google Mapsu691cu7d22uff09u306ewebsiteu30d5u30a3u30fcu30ebu30c9u3092u51e6u7406
      if (questionId === "Q1-0" && answer && answer.website) {
        await handleGoogleMapsWebsite(answer.website, updateAnswer, addAIMessage);
      }

      if (questionId === "Q1-0-website") {
        await handleWebsiteUrl(answer, updateAnswer, addAIMessage);
      }

      // Q0-2: 購入・実施予定のものをAI判定
      if (questionId === "Q0-2") {
        console.log('[Q0-2 Validation] Starting AI validation...');

        addAIMessage('回答内容を確認しています...');

        const validationResult = await validateQ0_2Answer(answer, answers);

        console.log('[Q0-2 Validation] Result:', validationResult);

        // エラー判定（ウェブ関連費のみ、補助対象外など）
        const errors = validationResult.issues?.filter(issue => issue.severity === 'error') || [];

        if (errors.length > 0) {
          // エラーがある場合は警告メッセージを表示して、回答をやり直させる
          const errorMessages = errors.map(err => err.message).join('\n\n');
          addAIMessage(`⚠️ 補助対象の確認\n\n${errorMessages}\n\nもう一度、内容を見直して入力してください。`);
          setIsLoading(false);
          return; // 回答を保存せずに終了
        }

        // 警告（回答が曖昧など）
        const warnings = validationResult.issues?.filter(issue => issue.severity === 'warning') || [];

        if (warnings.length > 0) {
          const warningMessages = warnings.map(warn => warn.message).join('\n\n');
          addAIMessage(`💡 ${warningMessages}`);
        }

        // 深掘り質問がある場合
        if (validationResult.followUpQuestions && validationResult.followUpQuestions.length > 0) {
          console.log('[Q0-2 Validation] Follow-up questions detected:', validationResult.followUpQuestions);

          // 深掘り質問を順番に表示
          for (const followUp of validationResult.followUpQuestions) {
            addAIMessage(followUp.text);

            const followUpQuestion = {
              id: followUp.id,
              text: followUp.text,
              type: followUp.type || 'text',
              placeholder: followUp.placeholder,
              helpText: followUp.reason
            };

            setCurrentQuestion(followUpQuestion);
            setIsLoading(false);
            return; // 深掘り質問を待つ
          }
        }

        // 問題なし
        if (validationResult.isValid) {
          addAIMessage('✅ 内容を確認しました。補助対象として問題ありません。');
        }
      }

      // answersが更新されると、useEffectが発火してcurrentQuestionが更新され、次の質問が表示される
      await updateAnswer(questionId, answer);

      // ポイント消費
      if (questionCost > 0) {
        console.log('[saveAnswer] Attempting to consume points:', { questionCost, questionId });
        try {
          await consumePoints(questionCost, `質問回答: ${questionId}`);
          console.log('[saveAnswer] Points consumed successfully');
        } catch (error) {
          console.error('[saveAnswer] Failed to consume points:', error);
          throw error;
        }
      } else {
        console.log('[saveAnswer] No point cost for this question:', questionId);
      }

      // ⚠️ Phase 2の会話形式の場合
      if (currentStep === 2 && phase2Manager) {
        console.log('[Phase 2 Conversational] Saving answer to manager...');
        setIsLoading(true);

        try {
          const nextQuestion = await phase2Manager.saveAnswer(questionId, answer);

          // Phase 2完了チェック（nextQuestionがnullまたはisComplete()がtrue）
          if (!nextQuestion || phase2Manager.isComplete()) {
            // Phase 2完了
            console.log('[Phase 2 Conversational] Complete!');
            setCurrentQuestion(null);
            addAIMessage('Phase 2が完了しました。次のステップに進みます。');
            handleStepComplete();
          } else if (nextQuestion) {
            if (nextQuestion.isConfirmation) {
              // 確認質問
              console.log('[Phase 2 Conversational] Showing confirmation');
              setCurrentQuestion(nextQuestion);
              addAIMessage(nextQuestion.text, nextQuestion);
            } else if (nextQuestion.isEdit) {
              // 修正モード
              console.log('[Phase 2 Conversational] Showing edit mode');
              setCurrentQuestion(nextQuestion);
              addAIMessage('修正内容を入力してください', nextQuestion);
            } else {
              // 通常の次の質問
              console.log('[Phase 2 Conversational] Next question:', nextQuestion.id);

              // 一度nullにしてから新しい質問を設定（React状態を強制リセット）
              setCurrentQuestion(null);
              setTimeout(() => {
                setCurrentQuestion(nextQuestion);
                addAIMessage(nextQuestion.text, nextQuestion);
              }, 100);
            }
          }
        } catch (error) {
          console.error('[Phase 2 Conversational] Error:', error);
          addAIMessage('エラーが発生しました。');
        } finally {
          setIsLoading(false);
        }

        return; // 処理終了
      }

      // ⚠️ Phase 3の会話形式の場合
      if (currentStep === 3 && phase3Manager) {
        console.log('[Phase 3 Conversational] Saving answer to manager...');
        setIsLoading(true);

        try {
          const nextQuestion = await phase3Manager.saveAnswer(questionId, answer);

          if (phase3Manager.isComplete()) {
            // Phase 3完了
            console.log('[Phase 3 Conversational] Complete!');
            setCurrentQuestion(null);
            addAIMessage('Phase 3が完了しました。次のステップに進みます。');
            handleStepComplete();
          } else if (nextQuestion) {
            // 通常の次の質問
            console.log('[Phase 3 Conversational] Next question:', nextQuestion.id);
            setCurrentQuestion(nextQuestion);
            addAIMessage(nextQuestion.text, nextQuestion);
          }
        } catch (error) {
          console.error('[Phase 3 Conversational] Error:', error);
          addAIMessage('エラーが発生しました。');
        } finally {
          setIsLoading(false);
        }

        return; // 処理終了
      }

      // 【完全自律AI】回答保存後、自律エージェントを起動
      // ただし、Step 1, 2, 3は対話型フローを使用するため、自律エージェントはスキップ
      if (currentStep === 1 || currentStep === 2 || currentStep === 3) {
        console.log('[Conversational Flow] Step 1, 2 & 3 - Using conversational flow (autonomous AI disabled)');
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
            // 深堀り質問を表示（様式2作成に必要な情報を収集）
            console.log('[ChatContainer] Showing deep dive question:', agentAction.data);
            addAIMessage(agentAction.message);
            setCurrentQuestion(agentAction.data);
            addAIMessage(agentAction.data.text, agentAction.data);
            return; // 通常フローをスキップ
          } else if (agentAction.action === 'business_detail_question' && agentAction.data) {
            // 業態・特性確認質問を表示（様式2作成に必要な情報を収集）
            console.log('[ChatContainer] Showing business detail question:', agentAction.data);
            addAIMessage(agentAction.message);
            setCurrentQuestion(agentAction.data);
            addAIMessage(agentAction.data.text, agentAction.data);
            return; // 通常フローをスキップ
          } else if (agentAction.action === 'industry_question' && agentAction.data) {
            // 業種別の深堀り質問を表示（様式2作成に必要な情報を収集）
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
            // 改善提案を表示（質問途中のAI補完は不要なのでコメントアウト）
            console.log('[ChatContainer] Suggesting improvement (disabled)');
            // if (agentAction.message) {
            //   addAIMessage(agentAction.message);
            // }
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

      // 深堀り質問の処理は saveAnswer の最初で既に実行済み

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
    // Phase 1の場合は対話型フローを使用
    if (currentStep === 1) {
      const answeredIds = Object.keys(answers);

      if (answeredIds.length > 0) {
        try {
          setIsLoading(true);

          // 最後の回答を削除
          const lastQuestionId = answeredIds[answeredIds.length - 1];

          // 削除する質問オブジェクトを取得
          const questionToDelete = STEP1_QUESTIONS.find(q => q.id === lastQuestionId);

          // Firestoreからも削除
          await updateAnswer(lastQuestionId, null);

          // メッセージを削除（最後のAI質問 + ユーザーの回答）
          setMessages(prev => {
            // 最後から2つのメッセージを削除
            return prev.slice(0, -2);
          });

          // 削除した質問を再表示
          if (questionToDelete) {
            const questionText = typeof questionToDelete.text === 'function'
              ? questionToDelete.text(answers)
              : questionToDelete.text;

            setCurrentQuestion({
              ...questionToDelete,
              text: questionText
            });
            addAIMessage('前の質問に戻りました。');
            addAIMessage(questionText, questionToDelete);
          }
        } catch (error) {
          console.error('Error going back:', error);
          addAIMessage('戻る処理に失敗しました。もう一度お試しください。');
        } finally {
          setIsLoading(false);
        }
      }
      return;
    }

    // Phase 2以降の処理（元のロジック）
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
          addAIMessage('前の質問に戻りました。');
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
    // Phase 0~5まで存在するため、currentStep < 6に変更
    if (currentStep < 6) {
      const phaseNames = ['補助対象判定', '基本情報', '顧客ニーズと市場の動向', '自社の強み', '経営方針・目標', '補助事業の内容', '文章生成スタイルの確認'];
      const phaseName = phaseNames[currentStep] || `Phase ${currentStep}`;

      // Phase 0（補助対象判定）の場合はメッセージを表示せず、直接次のPhaseに進む
      if (currentStep === 0) {
        nextStep();
      } else {
        addAIMessage(`${phaseName}が完了しました！次のフェーズに進みます。`);
        setTimeout(() => {
          nextStep();
        }, 2000);
      }
    } else {
      addAIMessage('お疲れ様でした！全ての質問が完了しました。申請書を生成できます。');
      setShowDocument(true);
    }
  };

  // Phase 6に進む共通処理
  const proceedToPhase6 = () => {
    const phase6Question = getNextPhaseQuestion(6, answers);
    if (phase6Question) {
      setCurrentQuestion(phase6Question);
      addAIMessage(phase6Question.text, phase6Question);
      if (phase6Question.helpText) {
        addAIMessage(phase6Question.helpText);
      }
    }
  };

  // Phase 5完了時のAI分析処理
  const handlePhase5Complete = async () => {
    setIsLoading(true);

    try {
      addAIMessage('Phase 5が完了しました！\n\n回答内容を分析しています...');

      // Google Maps情報を取得
      const placeData = answers['Q1-0'] || {};

      // AI分析を実行
      const result = await checkCompletenessAndDecideNext(answers, placeData);

      if (result.action === 'proceed_to_phase6') {
        // 完成度90%以上 → Phase 6へ
        addAIMessage(result.message);

        const phase6Question = getNextPhaseQuestion(6, answers);
        if (phase6Question) {
          setCurrentQuestion(phase6Question);
          addAIMessage(phase6Question.text, phase6Question);
          if (phase6Question.helpText) {
            addAIMessage(phase6Question.helpText);
          }
        }
      } else if (result.action === 'ai_follow_up') {
        // 完成度90%未満 → AI追加質問
        addAIMessage(result.message);

        // AI生成質問を表示
        const aiQuestion = result.question;
        const question = {
          id: aiQuestion.id,
          text: aiQuestion.text,
          type: aiQuestion.type,
          placeholder: aiQuestion.placeholder,
          helpText: aiQuestion.helpText,
          options: aiQuestion.options || undefined,
          targetSection: aiQuestion.targetSection,
          targetGap: aiQuestion.targetGap,
          isAIGenerated: true
        };

        setCurrentQuestion(question);
        addAIMessage(question.text, question);
        if (question.helpText) {
          addAIMessage(question.helpText);
        }

        // 次回の分析のために gaps を保存
        setAiAnalysis(JSON.stringify({
          completeness: result.completeness,
          gaps: result.gaps
        }));
      }
    } catch (error) {
      console.error('[Phase 5 Complete] Error:', error);
      addAIMessage('分析中にエラーが発生しました。Phase 6に進みます。');

      // エラー時はフォールバック：Phase 6へ進む
      const phase6Question = getNextPhaseQuestion(6, answers);
      if (phase6Question) {
        setCurrentQuestion(phase6Question);
        addAIMessage(phase6Question.text, phase6Question);
        if (phase6Question.helpText) {
          addAIMessage(phase6Question.helpText);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ポイント残高チェック
  const checkPointBalance = async (requiredPoints) => {
    return pointBalance >= requiredPoints;
  };

  // 質問コスト取得
  const getQuestionCost = (questionId) => {
    const costs = {
      // Phase 1（申請資格確認）- 無料
      'Q1-1': 0, 'Q1-2': 0, 'Q1-3': 0,

      // Phase 2（顧客ニーズと市場の動向）- 10ポイント
      'P2-1': 10, 'P2-2': 10, 'P2-3': 10, 'P2-4': 10, 'P2-5': 10, 'P2-6': 10,

      // Phase 3（自社の強み）- 10-20ポイント
      'P3-1': 10, 'P3-2': 10, 'P3-3': 10, 'P3-4': 10, 'P3-5': 10, 'P3-6': 15, 'P3-7': 10,

      // Phase 4（経営方針・目標）- 10-20ポイント
      'P4-1': 10, 'P4-2': 10, 'P4-3': 10, 'P4-4': 10, 'P4-5': 10, 'P4-6': 15, 'P4-7': 15, 'P4-8': 20,

      // Phase 5（補助事業の内容）- 15-30ポイント
      'P5-1': 20, 'P5-2': 20, 'P5-3': 15, 'P5-4': 15, 'P5-5': 15, 'P5-6': 20, 'P5-7': 25, 'P5-8': 20, 'P5-9': 20, 'P5-10': 20, 'P5-11': 15, 'P5-12': 15,

      // Phase 6（文章スタイル確認）- 無料
      'P6-1': 0, 'P6-2': 0, 'P6-3': 0,

      // 旧形式（後方互換性のため残す）
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
    // Phase 0: 補助対象判定
    if (currentStep === 0) {
      const nextQuestion = getNextPhase0Question(answers);
      console.log('[Phase 0] Next question:', nextQuestion?.id || 'complete');

      // Phase 0完了チェック
      if (!nextQuestion && isPhase0Complete(answers)) {
        console.log('[Phase 0] Complete!');
        return null;
      }

      return nextQuestion;
    }

    // Step 1は対話型フローを使用（Phase 1: 申請資格確認）
    if (currentStep === 1) {
      const nextQuestion = getNextStep1Question(answers);
      console.log('[Conversational] Step 1 next question:', nextQuestion?.id || 'complete');

      // Step 1完了チェック
      if (!nextQuestion && isStep1Complete(answers)) {
        console.log('[Conversational] Step 1 complete!');
        return null; // Step 1完了
      }

      // 動的プロパティ（関数形式）を解決
      if (nextQuestion) {
        return {
          ...nextQuestion,
          text: typeof nextQuestion.text === 'function' ? nextQuestion.text(answers) : nextQuestion.text,
          options: typeof nextQuestion.options === 'function' ? nextQuestion.options(answers) : nextQuestion.options,
          helpText: typeof nextQuestion.helpText === 'function' ? nextQuestion.helpText(answers) : nextQuestion.helpText
        };
      }

      return nextQuestion;
    }

    // Step 2-5は新しいPhaseフローを使用
    if (currentStep >= 2 && currentStep <= 5) {
      const phase = currentStep; // Step 2 → Phase 2, Step 3 → Phase 3, etc.

      // ⚠️ Step 2の場合は会話形式マネージャーを使用
      if (currentStep === 2) {
        if (phase2Manager) {
          const question = phase2Manager.getCurrentQuestion();
          console.log('[Phase 2 Conversational] getCurrentQuestion:', question?.id || 'null');
          if (question) {
            return question;
          }
          // null = Phase 2完了
          return null;
        }
        // マネージャー未初期化（初期化待ち）
        console.log('[Phase 2 Conversational] Manager not initialized yet, flagging for init');
        return { ai_generation: true, phase: 2 };
      }

      // ⚠️ Step 3の場合は会話形式マネージャーを使用
      if (currentStep === 3) {
        if (phase3Manager) {
          const question = phase3Manager.getCurrentQuestion();
          console.log('[Phase 3 Conversational] getCurrentQuestion:', question?.id || 'null');
          if (question) {
            return question;
          }
          // null = Phase 3完了
          return null;
        }
        // マネージャー未初期化（初期化待ち）
        console.log('[Phase 3 Conversational] Manager not initialized yet, flagging for init');
        return { ai_generation: true, phase: 3 };
      }

      // Step 5の場合、Phase 5完了後にPhase 6（文章スタイル確認）に進む
      if (currentStep === 5) {
        // Phase 5の質問を確認
        const phase5Question = getNextPhaseQuestion(5, answers);

        if (phase5Question) {
          // Phase 5の質問がまだある場合
          console.log(`[Phase 5] Next question:`, phase5Question.id);
          return {
            ...phase5Question,
            text: typeof phase5Question.text === 'function' ? phase5Question.text(answers) : phase5Question.text,
            options: typeof phase5Question.options === 'function' ? phase5Question.options(answers) : phase5Question.options,
            helpText: typeof phase5Question.helpText === 'function' ? phase5Question.helpText(answers) : phase5Question.helpText
          };
        }

        // Phase 5完了、Phase 6の質問を確認
        if (isPhaseComplete(5, answers)) {
          const phase6Question = getNextPhaseQuestion(6, answers);

          if (phase6Question) {
            // Phase 6の質問がある場合
            console.log(`[Phase 6] Next question:`, phase6Question.id);
            return {
              ...phase6Question,
              text: typeof phase6Question.text === 'function' ? phase6Question.text(answers) : phase6Question.text,
              options: typeof phase6Question.options === 'function' ? phase6Question.options(answers) : phase6Question.options,
              helpText: typeof phase6Question.helpText === 'function' ? phase6Question.helpText(answers) : phase6Question.helpText
            };
          }

          // Phase 6も完了している場合
          if (isPhaseComplete(6, answers)) {
            console.log(`[Phase 6] Complete! Ready to generate application.`);
            return null;
          }
        }
      }

      // Step 3-4の通常フロー
      const nextQuestion = getNextPhaseQuestion(phase, answers);
      console.log(`[Phase ${phase}] Next question:`, nextQuestion?.id || 'complete');

      // Phase完了チェック
      if (!nextQuestion && isPhaseComplete(phase, answers)) {
        console.log(`[Phase ${phase}] Complete!`);
        return null; // Phase完了
      }

      // 質問が見つかった場合、そのまま返す
      if (nextQuestion) {
        return {
          ...nextQuestion,
          // textやoptionsが関数形式の場合は解決（Phase 2-5では現状静的だが念のため）
          text: typeof nextQuestion.text === 'function' ? nextQuestion.text(answers) : nextQuestion.text,
          options: typeof nextQuestion.options === 'function' ? nextQuestion.options(answers) : nextQuestion.options,
          helpText: typeof nextQuestion.helpText === 'function' ? nextQuestion.helpText(answers) : nextQuestion.helpText
        };
      }

      return nextQuestion;
    }

    // Step 6以降は旧Step 2対話型フローを使用（後方互換性のため残す）
    if (currentStep === 6) {
      // 最初の質問がまだ回答されていない場合
      if (!answers['Q2-1']) {
        const firstQuestion = getFirstStep2Question();
        console.log('[Conversational] Step 2 first question:', firstQuestion?.id);
        return {
          id: firstQuestion.id,
          text: typeof firstQuestion.question === 'function' ? firstQuestion.question(answers) : firstQuestion.question,
          type: firstQuestion.type,
          options: firstQuestion.options,
          validation: firstQuestion.validation,
          examples: firstQuestion.examples,
          inputHint: firstQuestion.inputHint,
          helpText: firstQuestion.helpText
        };
      }

      // 最後に回答した質問を探す
      const allAnsweredQ2 = Object.keys(answers)
        .filter(qId => qId.startsWith('Q2-'))
        .sort((a, b) => {
          // Q2-1, Q2-2, Q2-3-multi などを数値部分でソート
          const parseQId = (qId) => {
            const match = qId.match(/Q2-(\d+)(?:-(.+))?/);
            if (!match) return [0, ''];
            return [parseInt(match[1], 10), match[2] || ''];
          };
          
          const [aNum, aSuffix] = parseQId(a);
          const [bNum, bSuffix] = parseQId(b);
          
          if (aNum !== bNum) {
            return aNum - bNum;
          }
          
          // 同じ番号の場合はサフィックスで比較
          return aSuffix.localeCompare(bSuffix);
        });
      
      console.log('[Step 2] All answered Q2 questions (sorted):', allAnsweredQ2);
      
      if (allAnsweredQ2.length === 0) {
        const firstQuestion = getFirstStep2Question();
        return {
          id: firstQuestion.id,
          text: typeof firstQuestion.question === 'function' ? firstQuestion.question(answers) : firstQuestion.question,
          type: firstQuestion.type,
          options: firstQuestion.options,
          validation: firstQuestion.validation,
          examples: firstQuestion.examples,
          inputHint: firstQuestion.inputHint,
          helpText: firstQuestion.helpText
        };
      }

      // 最後に回答した質問IDを取得
      const lastAnsweredQId = allAnsweredQ2[allAnsweredQ2.length - 1];
      const lastAnswer = answers[lastAnsweredQId];
      
      console.log('[Step 2] Last answered question:', lastAnsweredQId, 'Answer:', lastAnswer);

      // 次の質問を取得
      const nextQuestion = getNextStep2Question(lastAnsweredQId, lastAnswer, answers);
      console.log('[Conversational] Step 2 next question:', nextQuestion?.id || 'complete');

      // Step 2完了チェック
      if (!nextQuestion && isStep2Complete(answers)) {
        console.log('[Conversational] Step 2 complete!');
        return null; // Step 2完了
      }

      if (nextQuestion) {
        // 質問テキストが関数の場合は実行
        const questionText = typeof nextQuestion.question === 'function'
          ? nextQuestion.question(answers)
          : nextQuestion.question;

        return {
          id: nextQuestion.id,
          text: questionText,
          type: nextQuestion.type,
          options: nextQuestion.options,
          validation: nextQuestion.validation,
          examples: nextQuestion.examples,
          inputHint: nextQuestion.inputHint,
          helpText: nextQuestion.helpText
        };
      }

      return null;
    }

    // Step 3以降は従来のフロー
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
    // currentQuestionのdefaultValueをチェック
    if (currentQuestion && currentQuestion.defaultValue) {
      // defaultValueが関数の場合は実行
      if (typeof currentQuestion.defaultValue === 'function') {
        return currentQuestion.defaultValue(answers);
      }
      // defaultValueが値の場合はそのまま返す
      return currentQuestion.defaultValue;
    }

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
    if (currentStep === 1 || currentStep === 2) {
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

  // デバッグ用: answersを整形してコンソールに出力
  const debugShowAnswers = () => {
    console.clear();
    console.log('='.repeat(80));
    console.log('📊 補助金申請データ確認');
    console.log('='.repeat(80));
    console.log('\n【基本情報】');
    console.log('現在のステップ:', currentStep);
    console.log('アプリケーションID:', currentApplication?.id || 'なし');
    console.log('作成日時:', currentApplication?.createdAt?.toDate?.()?.toLocaleString('ja-JP') || 'なし');
    console.log('ユーザーID:', user?.uid || 'なし');

    // Phase 1の回答
    console.log('\n' + '='.repeat(80));
    console.log('【Phase 1: 基本情報】');
    console.log('='.repeat(80));
    const phase1Keys = Object.keys(answers).filter(k => k.startsWith('Q1-')).sort();
    phase1Keys.forEach(key => {
      const answer = answers[key];
      console.log(`\n${key}:`);
      if (key === 'Q1-0' && typeof answer === 'object') {
        console.log('  店舗名:', answer.name);
        console.log('  業種:', answer.types?.join(', '));
        console.log('  評価:', answer.rating);
      } else if (typeof answer === 'object') {
        console.log(JSON.stringify(answer, null, 2));
      } else {
        console.log(' ', answer);
      }
    });

    // Phase 2会話形式の回答
    console.log('\n' + '='.repeat(80));
    console.log('【Phase 2: 会話形式の回答（conv-）】');
    console.log('='.repeat(80));
    const convKeys = Object.keys(answers).filter(k => k.startsWith('conv-')).sort();
    if (convKeys.length > 0) {
      convKeys.forEach(key => {
        const answer = answers[key];
        console.log(`\n${key}:`);
        if (Array.isArray(answer)) {
          console.log('  ✅ 複数選択:', answer.join(', '));
        } else if (typeof answer === 'object') {
          console.log(JSON.stringify(answer, null, 2));
        } else {
          console.log(' ', answer);
        }
      });
    } else {
      console.log('会話形式の回答はまだありません');
    }

    // Phase 2の統合済み回答
    console.log('\n' + '='.repeat(80));
    console.log('【Phase 2: 統合済みデータ】');
    console.log('='.repeat(80));
    const phase2Keys = Object.keys(answers).filter(k =>
      k.startsWith('P2-') ||
      k.includes('target_customers') ||
      k.includes('customer_composition') ||
      k.includes('customer_needs') ||
      k.includes('market_trends')
    ).sort();
    if (phase2Keys.length > 0) {
      phase2Keys.forEach(key => {
        const answer = answers[key];
        console.log(`\n${key}:`);
        if (typeof answer === 'object') {
          console.log(JSON.stringify(answer, null, 2));
        } else {
          console.log(' ', answer);
        }
      });
    } else {
      console.log('統合済みデータはまだありません');
    }

    // その他のPhaseの回答
    console.log('\n' + '='.repeat(80));
    console.log('【その他の回答】');
    console.log('='.repeat(80));
    const otherKeys = Object.keys(answers).filter(k =>
      !k.startsWith('Q1-') &&
      !k.startsWith('conv-') &&
      !k.startsWith('P2-') &&
      !k.includes('target_customers') &&
      !k.includes('customer_composition') &&
      !k.includes('customer_needs') &&
      !k.includes('market_trends')
    ).sort();
    if (otherKeys.length > 0) {
      otherKeys.forEach(key => {
        const answer = answers[key];
        console.log(`\n${key}:`);
        if (Array.isArray(answer)) {
          console.log('  複数選択:', answer.join(', '));
        } else if (typeof answer === 'object') {
          console.log(JSON.stringify(answer, null, 2));
        } else {
          console.log(' ', answer);
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ データ確認完了（開発者ツールのコンソールをご確認ください）');
    console.log('='.repeat(80));

    alert('データをコンソールに出力しました。F12キーを押して開発者ツールのConsoleタブをご確認ください。');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>補助金申請サポート</h2>
        <div className="point-balance">
          ポイント残高: {pointBalance.toLocaleString()}pt
        </div>
        <button
          onClick={debugShowAnswers}
          style={{
            marginLeft: '10px',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
          title="回答データをコンソールに出力"
        >
          📊 データ確認
        </button>
      </div>

      {/* 完成度インジケーター */}
      {completenessScore > 0 && (
        <CompletenessIndicator
          completenessData={calculateOverallCompleteness(answers)}
          onClick={() => setShowCompletenessDetails(!showCompletenessDetails)}
        />
      )}

      <div className="chat-messages">
        {messages.map((message) => {
          // デバッグ: メッセージの構造を確認
          if (message.question && message.question.options) {
            console.log('[MessageBubble Debug] Message with options:', {
              id: message.id,
              text: message.text,
              questionId: message.question.id,
              optionsCount: message.question.options.length,
              options: message.question.options
            });
          }
          return (
            <MessageBubble
              key={message.id}
              message={message}
              onAnswer={handleAnswer}
              isLoading={isLoading}
            />
          );
        })}
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



      {currentQuestion && !showAiOptions && currentQuestion.type === 'store_profile' && (
        <StoreProfileEditor
          googleMapsData={answers['Q1-0']}
          websiteUrl={answers['Q1-0-website'] || answers['Q1-0']?.website}
          onSave={(profile) => handleAnswer('Q1-0-profile', profile)}
          onCancel={handleGoBack}
        />
      )}

      {currentQuestion && !showAiOptions && currentQuestion.type !== 'store_profile' && (
        <>
          {/* 新しい質問タイプのハンドリング */}
          {currentQuestion.type === 'file_upload' ? (
            <FileUpload
              questionId={currentQuestion.id}
              onUploadComplete={(uploadData) => {
                handleAnswer(currentQuestion.id, uploadData);
              }}
              onSkip={() => {
                // Q1-14-methodに戻る
                handleGoBack();
              }}
            />
          ) : currentQuestion.type === 'expense_manual_input' ? (
            <ManualExpenseInput
              onSubmit={(expenseData) => {
                handleAnswer(currentQuestion.id, expenseData);
              }}
              onCancel={handleGoBack}
            />
          ) : currentQuestion.type === 'ai_expense_estimation' ? (
            <AIExpenseEstimation
              answers={answers}
              onComplete={(estimationData) => {
                handleAnswer(currentQuestion.id, estimationData);
              }}
            />
          ) : currentQuestion.type === 'supplier_table_input' ? (
            <SupplierTableInput
              onSubmit={(supplierData) => {
                handleAnswer(currentQuestion.id, supplierData);
              }}
              onCancel={handleGoBack}
            />
          ) : (
            // すべての質問タイプ（welcome、place_autocomplete、text等）をQuestionInputで処理
            <QuestionInput
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={handleAnswer}
              isLoading={isLoading}
              previousAnswer={getPreviousAnswer(currentQuestion.id)}
              suggestedAnswer={getSuggestedAnswer(currentQuestion.id)}
              aiDraft={aiDraft}
              onGoBack={handleGoBack}
              canGoBack={Object.keys(answers).length > 0 && currentQuestion.type !== 'welcome'}
              allAnswers={answers}
            />
          )}
        </>
      )}

      {!currentQuestion && currentStep === 5 && isApplicationComplete() && (
        <div className="completion-actions">
          <button onClick={() => setShowQualityReport(true)} className="quality-report-btn">
            📊 品質チェック・改善提案
          </button>
          <button onClick={() => setShowDocument(true)} className="generate-application-btn">
            📄 申請書を生成する
          </button>
        </div>
      )}

      {/* 品質レポートモーダル */}
      {showQualityReport && (
        <QualityReport
          answers={answers}
          onClose={() => setShowQualityReport(false)}
          onApplySuggestion={(suggestion) => {
            // 改善提案を適用する処理
            console.log('Applying suggestion:', suggestion);
            // TODO: 提案に基づいて該当する回答を更新
            setShowQualityReport(false);
          }}
        />
      )}
    </div>
  );
};

/**
 * Google Maps typesから商品・サービスを推測
 */
const inferServicesFromPlaceTypes = (types, name) => {
  // 店名からより具体的なヒントを得る（優先順位高）
  if (name) {
    const nameLower = name.toLowerCase();
    
    // ハンバーガー関連
    if (nameLower.includes('burger') || nameLower.includes('ハンバーガ') || nameLower.includes('バーガー')) {
      return 'ハンバーガー・ファストフード';
    }
    
    // イタリア料理関連
    if (nameLower.includes('italian') || nameLower.includes('イタリア') || 
        nameLower.includes('pasta') || nameLower.includes('pizza') ||
        nameLower.includes('wine') || nameLower.includes('bacchus') || nameLower.includes('ワイン')) {
      return 'イタリア料理・ワイン販売';
    }
    
    // カフェ関連
    if (nameLower.includes('cafe') || nameLower.includes('coffee') || 
        nameLower.includes('カフェ') || nameLower.includes('珈琲')) {
      return 'カフェ・コーヒー';
    }
    
    // 美容関連
    if (nameLower.includes('salon') || nameLower.includes('サロン') || 
        nameLower.includes('beauty') || nameLower.includes('美容')) {
      return '美容・ヘアカット';
    }
    
    // ラーメン関連
    if (nameLower.includes('ramen') || nameLower.includes('ラーメン')) {
      return 'ラーメン・麺類';
    }
    
    // 寿司関連
    if (nameLower.includes('sushi') || nameLower.includes('寿司') || nameLower.includes('すし')) {
      return '寿司・和食';
    }
  }

  // Google Maps types mapping（より具体的なtypeを優先）
  const specificTypeMapping = {
    'bakery': 'パン・焼き菓子販売',
    'cafe': 'カフェ・軽食',
    'bar': 'バー・飲料販売',
    'meal_takeaway': 'テイクアウト料理',
    'meal_delivery': 'デリバリー・配達',
    'clothing_store': '衣類販売',
    'shoe_store': '靴販売',
    'jewelry_store': 'ジュエリー販売',
    'beauty_salon': '美容・ヘアカット',
    'hair_care': 'ヘアケア・美容',
    'spa': 'エステ・スパ',
    'gym': 'フィットネス・トレーニング',
    'hardware_store': '工具・建築資材販売',
    'florist': '花・フラワーアレンジメント',
    'book_store': '書籍・雑誌販売',
    'pet_store': 'ペット用品販売',
    'liquor_store': '酒類販売'
  };

  // 具体的なtypeから先にチェック
  for (const type of types) {
    if (specificTypeMapping[type]) {
      return specificTypeMapping[type];
    }
  }

  // 一般的なrestaurantの場合は汎用的な表現を使用
  if (types.includes('restaurant') || types.includes('food')) {
    return '飲食・料理提供';
  }

  // storeの場合
  if (types.includes('store')) {
    return '商品販売';
  }

  return null;
};

export default ChatContainer;
