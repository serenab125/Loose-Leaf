// src/quiz/useQuiz.js
// React hook for managing quiz state, navigation, and answers

import { useState, useCallback } from 'react';
import { QUIZ_SECTIONS } from './quizData';

export function useQuiz() {
  const [currentStep, setCurrentStep] = useState(0); // 0 = intro, 1..n = questions
  const [answers, setAnswers] = useState({});

  const goToIntro = useCallback(() => {
    setCurrentStep(0);
    setAnswers({});
  }, []);

  const answerQuestion = useCallback((sectionId, selectedIds) => {
    setAnswers((prev) => ({
      ...prev,
      [sectionId]: selectedIds,
    }));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const isIntro = currentStep === 0;
  const isComplete = currentStep >= MAX_PROGRESS_STEPS;
  const currentSection =
    !isIntro && !isComplete
      ? QUIZ_SECTIONS[currentStep - 1]
      : null;
  const progress = isIntro
    ? 0
    : isComplete
    ? 100
    : Math.round(((currentStep - 1) / QUIZ_SECTIONS.length) * 100);

  return {
    currentStep,
    setCurrentStep,
    answers,
    answerQuestion,
    goToIntro,
    goToNext,
    goToPrevious,
    isIntro,
    isComplete,
    currentSection,
    progress,
  };
}
