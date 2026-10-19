
import { useState, useCallback } from 'react';
import {
  TASTE_SECTIONS,
  GOAL_SECTIONS,
  MIN_TASTE_ANSWERS,
} from './quizData';

export function useQuiz() {
  // 0 = introduction
  // 1 = reading taste
  // 2 = reading goals
  // 3 = loading / complete
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const goToIntro = useCallback(() => {
    setCurrentStep(0);
    setAnswers({});
  }, []);

  const answerQuestion = useCallback((sectionId, selectedIds) => {
    setAnswers((previous) => ({
      ...previous,
      [sectionId]: selectedIds,
    }));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentStep(1);
  }, []);

  const hasAnswer = (section) => {
    const answer = answers[section.id];

    if (Array.isArray(answer)) {
      return answer.length > 0;
    }

    return answer !== undefined &&
      answer !== null &&
      answer !== '';
  };

  const tasteAnsweredCount = TASTE_SECTIONS.filter(hasAnswer).length;
  const goalAnsweredCount = GOAL_SECTIONS.filter(hasAnswer).length;

  const canContinue = tasteAnsweredCount >= MIN_TASTE_ANSWERS;

  const goToGoals = useCallback(() => {
    const count = TASTE_SECTIONS.filter((section) => {
      const answer = answers[section.id];

      return Array.isArray(answer)
        ? answer.length > 0
        : answer !== undefined &&
        answer !== null &&
        answer !== '';
    }).length;

    if (count >= MIN_TASTE_ANSWERS) {
      setCurrentStep(2);
      window.scrollTo(0, 0);
    }
  }, [answers]);

  const goBackToTaste = useCallback(() => {
    setCurrentStep(1);
    window.scrollTo(0, 0);
  }, []);

  const completeQuiz = useCallback(() => {
    const count = TASTE_SECTIONS.filter((section) => {
      const answer = answers[section.id];

      return Array.isArray(answer)
        ? answer.length > 0
        : answer !== undefined &&
        answer !== null &&
        answer !== '';
    }).length;

    if (count >= MIN_TASTE_ANSWERS) {
      setCurrentStep(3);
      window.scrollTo(0, 0);
    }
  }, [answers]);

  const isIntro = currentStep === 0;
  const isTaste = currentStep === 1;
  const isGoals = currentStep === 2;
  const isComplete = currentStep === 3;

  const totalQuestions = TASTE_SECTIONS.length + GOAL_SECTIONS.length;
  const progress = Math.round(
    ((tasteAnsweredCount + goalAnsweredCount) / totalQuestions) * 100
  );

  return {
    currentStep,
    answers,
    answerQuestion,
    goToIntro,
    goToNext,
    goToGoals,
    goBackToTaste,
    completeQuiz,
    isIntro,
    isTaste,
    isGoals,
    isComplete,
    canContinue,
    tasteAnsweredCount,
    goalAnsweredCount,
    progress,
  };
}
