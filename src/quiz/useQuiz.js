// src/quiz/useQuiz.js
// React hook for managing quiz state, navigation, and answers
//
// Answer-type contract (defined in quizData.js):
//   - single-select sections:   answer.value = string (option id) or null
//   - multi-select sections:    answer.value = array of option ids
//
// Navigation: steps are 0 = intro, 1..n = questions, MAX_STEPS = n + 1.
// goToNext is bounded so it can never push past the final step.

import { useState, useCallback } from 'react';
import { QUIZ_SECTIONS } from './quizData';

const MAX_STEPS = QUIZ_SECTIONS.length + 1; // +1 for intro

export function useQuiz() {
  const [currentStep, setCurrentStep] = useState(0); // 0 = intro, 1..n = questions
  const [answers, setAnswers] = useState({});

  const goToIntro = useCallback(() => {
    setCurrentStep(0);
    setAnswers({});
  }, []);

  const answerQuestion = useCallback((sectionId, selectedIds) => {
    // Single-select sections receive a string; multi-select receive an array of ids.
    setAnswers((prev) => ({
      ...prev,
      [sectionId]: selectedIds,
    }));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(MAX_STEPS, prev + 1));
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const isIntro = currentStep === 0;
  const isComplete = currentStep >= MAX_STEPS;
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
