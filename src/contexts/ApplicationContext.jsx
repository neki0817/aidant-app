import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  createApplication,
  getApplication,
  updateApplicationAnswer,
  updateApplicationStep,
  updateApplicationPlaceInfo,
  updateApplicationMarketData,
  updateApplicationGeneratedDocument
} from '../services/firestore/collections';
import { generateSubsidyApplication } from '../services/openai/openai';
import { useAuth } from './AuthContext';

const ApplicationContext = createContext();

export const ApplicationProvider = ({ children }) => {
  const { currentUser: user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);  // Phase 0（補助対象判定）から開始
  const [answers, setAnswers] = useState({});
  const [placeInfo, setPlaceInfo] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [generatedDocument, setGeneratedDocument] = useState(null);
  const [currentApplication, setCurrentApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 新規申請書の作成
  const createNewApplication = async (industry = '飲食') => {
    console.log('🔴 createNewApplication called - this will reset answers!');
    if (!user || !user.uid) {
      console.log('User not authenticated, skipping application creation');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const application = await createApplication(user.uid, industry);
      setCurrentApplication(application);
      setCurrentStep(0);  // Phase 0（補助対象判定）から開始
      console.log('🔴 Resetting answers to empty object');
      setAnswers({});
      setPlaceInfo(null);
      setMarketData(null);
      setGeneratedDocument(null);

      return application;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 既存申請書の読み込み
  const loadApplication = async (applicationId) => {
    try {
      setLoading(true);
      setError(null);

      const application = await getApplication(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      setCurrentApplication(application);
      setCurrentStep(application.currentStep);
      setAnswers(application.answers || {});
      setPlaceInfo(application.placeInfo || null);
      setMarketData(application.marketData || null);
      setGeneratedDocument(application.generatedDocument || null);

      return application;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 回答の更新
  const updateAnswer = async (questionId, answer) => {
    if (!currentApplication) {
      throw new Error('No active application');
    }

    try {
      setLoading(true);
      setError(null);

      // ローカル状態を即座に更新
      setAnswers(prev => {
        console.log('ApplicationContext setAnswers - prev:', prev, 'questionId:', questionId, 'answer:', answer);
        const newAnswers = {
          ...prev,
          [questionId]: answer
        };
        console.log('ApplicationContext setAnswers - new:', newAnswers);
        return newAnswers;
      });

      // Firestoreに保存
      await updateApplicationAnswer(currentApplication.id, questionId, answer);

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ステップの更新
  const nextStep = async () => {
    // Phase 0~5の6つのフェーズがあるため、currentStep < 6に変更
    if (currentStep < 6) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);

      if (currentApplication) {
        await updateApplicationStep(currentApplication.id, newStep);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {  // Phase 0が最初のステップ
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = async (step) => {
    // Phase 0~5の範囲でステップ移動可能
    if (step >= 0 && step <= 5) {
      setCurrentStep(step);

      if (currentApplication) {
        await updateApplicationStep(currentApplication.id, step);
      }
    }
  };

  // 店舗情報の更新
  const updatePlaceInfo = async (placeData) => {
    if (!currentApplication) {
      throw new Error('No active application');
    }

    try {
      setLoading(true);
      setError(null);

      setPlaceInfo(placeData);
      await updateApplicationPlaceInfo(currentApplication.id, placeData);

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 市場データの更新
  const updateMarketData = async (marketData) => {
    if (!currentApplication) {
      throw new Error('No active application');
    }

    try {
      setLoading(true);
      setError(null);

      setMarketData(marketData);
      await updateApplicationMarketData(currentApplication.id, marketData);

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 生成文書の更新
  const updateGeneratedDocument = async (document) => {
    if (!currentApplication) {
      throw new Error('No active application');
    }

    try {
      setLoading(true);
      setError(null);

      setGeneratedDocument(document);
      await updateApplicationGeneratedDocument(currentApplication.id, document);

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // OpenAI APIで申請書を生成
  const generateApplication = async () => {
    if (!currentApplication) {
      throw new Error('No active application');
    }

    // Step5まで完了しているかチェック
    if (currentStep < 5 || !isApplicationComplete()) {
      throw new Error('全ての質問に回答してください');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Generating application with OpenAI API...');

      // OpenAI APIで申請書を生成
      const generatedText = await generateSubsidyApplication(answers);

      const document = {
        content: generatedText,
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o'
      };

      // 生成した文書を保存
      await updateGeneratedDocument(document);

      console.log('Application generated successfully');

      return document;
    } catch (err) {
      console.error('Error generating application:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 申請書のリセット
  const resetApplication = () => {
    setCurrentStep(1);
    setAnswers({});
    setPlaceInfo(null);
    setMarketData(null);
    setGeneratedDocument(null);
    setCurrentApplication(null);
    setError(null);
  };

  // 申請書の完了チェック
  const isApplicationComplete = () => {
    const requiredQuestions = {
      1: ['Q1-1', 'Q1-2', 'Q1-3'],
      2: ['Q2-0', 'Q2-1', 'Q2-2', 'Q2-3', 'Q2-4', 'Q2-5', 'Q2-6', 'Q2-7-1', 'Q2-7-2', 'Q2-7-3', 'Q2-8', 'Q2-9'],
      3: ['Q3-1', 'Q3-2', 'Q3-3', 'Q3-4', 'Q3-5', 'Q3-6', 'Q3-7'],
      4: ['Q4-1', 'Q4-2', 'Q4-3', 'Q4-4', 'Q4-5', 'Q4-6', 'Q4-7', 'Q4-8', 'Q4-9', 'Q4-10', 'Q4-11'],
      5: ['Q5-1', 'Q5-2', 'Q5-3', 'Q5-4', 'Q5-5', 'Q5-6', 'Q5-7', 'Q5-8', 'Q5-9', 'Q5-10', 'Q5-11', 'Q5-12', 'Q5-13', 'Q5-14']
    };

    for (let step = 1; step <= currentStep; step++) {
      const questions = requiredQuestions[step] || [];
      const hasAllAnswers = questions.every(qId => 
        answers[qId] !== null && answers[qId] !== undefined && answers[qId] !== ''
      );
      
      if (!hasAllAnswers) {
        return false;
      }
    }

    return currentStep === 5;
  };

  // 進捗率の計算
  const getProgressPercentage = () => {
    const totalQuestions = 47; // 全質問数
    const answeredQuestions = Object.keys(answers).length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  // ステップ別進捗の計算
  const getStepProgress = (step) => {
    const stepQuestions = {
      1: ['Q1-1', 'Q1-2', 'Q1-3'],
      2: ['Q2-0', 'Q2-1', 'Q2-2', 'Q2-3', 'Q2-4', 'Q2-5', 'Q2-6', 'Q2-7-1', 'Q2-7-2', 'Q2-7-3', 'Q2-8', 'Q2-9'],
      3: ['Q3-1', 'Q3-2', 'Q3-3', 'Q3-4', 'Q3-5', 'Q3-6', 'Q3-7'],
      4: ['Q4-1', 'Q4-2', 'Q4-3', 'Q4-4', 'Q4-5', 'Q4-6', 'Q4-7', 'Q4-8', 'Q4-9', 'Q4-10', 'Q4-11'],
      5: ['Q5-1', 'Q5-2', 'Q5-3', 'Q5-4', 'Q5-5', 'Q5-6', 'Q5-7', 'Q5-8', 'Q5-9', 'Q5-10', 'Q5-11', 'Q5-12', 'Q5-13', 'Q5-14']
    };

    const questions = stepQuestions[step] || [];
    const answeredQuestions = questions.filter(qId => 
      answers[qId] !== null && answers[qId] !== undefined && answers[qId] !== ''
    );

    return {
      completed: answeredQuestions.length,
      total: questions.length,
      percentage: Math.round((answeredQuestions.length / questions.length) * 100)
    };
  };

  const value = {
    // 状態
    currentStep,
    answers,
    setAnswers,
    placeInfo,
    marketData,
    generatedDocument,
    currentApplication,
    loading,
    error,

    // アクション
    createNewApplication,
    loadApplication,
    updateAnswer,
    nextStep,
    prevStep,
    goToStep,
    updatePlaceInfo,
    updateMarketData,
    updateGeneratedDocument,
    generateApplication,
    resetApplication,

    // ユーティリティ
    isApplicationComplete,
    getProgressPercentage,
    getStepProgress
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
};

export const useApplication = () => {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplication must be used within ApplicationProvider');
  }
  return context;
};
