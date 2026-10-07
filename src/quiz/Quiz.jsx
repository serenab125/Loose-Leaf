// src/quiz/Quiz.jsx
// Main quiz orchestrator — ties together intro, questions, and loading

import { useState } from 'react';
import { useQuiz } from './useQuiz';
import { QuizIntroduction } from './QuizIntroduction';
import { QuizQuestion } from './QuizQuestion';
import { QuizLoading } from './QuizLoading';

export function Quiz() {
  const {
    currentStep,
    answers,
    answerQuestion,
    goToNext,
    goToPrevious,
    isIntro,
    isComplete,
    currentSection,
    progress,
    goToIntro,
  } = useQuiz();

  const handleGetStarted = () => {
    goToNext();
  };

  const handleBack = () => {
    goToPrevious();
  };

  const handleAnswer = (sectionId, selectedIds) => {
    answerQuestion(sectionId, selectedIds);
  };

  const handleComplete = () => {
    // Navigate to results/shelf or pass answers up
    console.log('Quiz complete! Answers:', answers);
    // Replace with your routing or state management
  };

  const handleRetake = () => {
    goToIntro();
  };

  return (
    <div className="quiz-container">
      {isIntro ? (
        <QuizIntroduction
          onGetStarted={handleGetStarted}
        />
      ) : isComplete ? (
        <QuizLoading
          onComplete={handleComplete}
          onRetake={handleRetake}
        />
      ) : (
        <QuizQuestion
          section={currentSection}
          answer={answers[currentSection.id]}
          onAnswer={handleAnswer}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
