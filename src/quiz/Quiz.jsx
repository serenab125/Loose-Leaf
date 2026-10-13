// src/quiz/Quiz.jsx
// Main quiz orchestrator — ties together intro, questions, and loading

import { QUIZ_SECTIONS } from './quizData';
import { useQuiz } from './useQuiz';
import { QuizIntroduction } from './QuizIntroduction';
import { QuizQuestion } from './QuizQuestion';
import { QuizLoading } from './QuizLoading';

export function Quiz() {
  const {
    currentStep,
    isIntro,
    isComplete,
    answers,
    goToNext,
    goToPrevious,
    answerQuestion,
    goToIntro,
    currentSection,
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
        <QuizIntroduction onGetStarted={handleGetStarted} />
      ) : isComplete ? (
        <QuizLoading onComplete={handleComplete} onRetake={handleRetake} />
      ) : (
        <QuizQuestion
          section={currentSection}
          answer={answers[currentSection.id]}
          onAnswer={handleAnswer}
          onBack={handleBack}
          onNext={goToNext}
          currentStep={currentStep}
          totalSteps={QUIZ_SECTIONS.length}
        />
      )}
    </div>
  );
}
