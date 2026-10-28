import {
  TASTE_SECTIONS,
  GOAL_SECTIONS,
  MIN_TASTE_ANSWERS,
} from './quizData';
import { useQuiz } from './useQuiz';
import { QuizIntroduction } from './QuizIntroduction';
import { QuizQuestion } from './QuizQuestion';
import { QuizLoading } from './QuizLoading';
import './quiz.css';
import { useState } from 'react';
import { supabase } from '../supabaseClient';

export function Quiz({ onSkip, onComplete, user }) {
  // Setting the pop-up for skipping the quiz
  const [showSkipPopup, setShowSkipPopup] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const {
    answers,
    answerQuestion,
    isIntro,
    isTaste,
    isGoals,
    isComplete,
    goToNext,
    goToIntro,
    goToGoals,
    goBackToTaste,
    completeQuiz,
    canContinue,
    tasteAnsweredCount,
  } = useQuiz();

  const handleComplete = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveError('');

    try {
      console.log('Quiz complete! Answers:', answers);

      // 1. Trigger parent onComplete callback if provided (e.g., from App.jsx)
      if (onComplete) {
        await onComplete(answers);
      } 
      // 2. Fallback direct upsert if user prop is passed directly to Quiz
      else if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              full_name: user.user_metadata?.full_name || '',
              email: user.email,
              reading_preferences: answers,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (error) throw error;
        console.log('Quiz answers saved successfully!', answers);
      }
    } catch (error) {
      console.error('Error saving quiz answers:', error);
      setSaveError(error.message || 'Unable to save quiz answers.');
    } finally {
      setIsSaving(false);
    }
  };

  const remainingAnswers = Math.max(
    0,
    MIN_TASTE_ANSWERS - tasteAnsweredCount
  );

  return (
    <div className="quiz-container">
      {saveError && (
        <p role="alert" style={{ color: '#b91c1c', padding: '12px', textAlign: 'center' }}>
          {saveError}
        </p>
      )}
      {isIntro ? (
        // Introduction page to take quiz or skip quiz
        <QuizIntroduction
          onGetStarted={goToNext}
          onSkipQuiz={() => setShowSkipPopup(true)} 
        />
      ) : isComplete ? (
        <QuizLoading
          onComplete={handleComplete}
          onRetake={goToIntro}
        />
      ) : (
        <main className="quiz-scroll-page">
          <div className="quiz-content">
            <button
              type="button"
              className="quiz-back"
              onClick={isGoals ? goBackToTaste : goToIntro}
            >
              ← Back
            </button>

            <div
              className="quiz-progress-track"
              role="progressbar"
              aria-label="Quiz completion"
              aria-valuenow={isTaste ? 50 : 100}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="quiz-progress-fill"
                style={{ width: isTaste ? '50%' : '100%' }}
              />
            </div>

            {isTaste && (
              <>
                <header className="quiz-page-header">
                  <p className="quiz-eyebrow">
                    YOUR READING QUIZ · STEP 1 OF 2
                  </p>

                  <h1>Tell us a little about you</h1>

                  <p className="quiz-description">
                    Scroll through and tap whatever feels right.
                    Answer at least 3 questions to continue.
                  </p>
                </header>

                {TASTE_SECTIONS.map((section, index) => (
                  <QuizQuestion
                    key={section.id}
                    section={section}
                    number={index + 1}
                    answer={answers}
                    onAnswer={answerQuestion}
                  />
                ))}

                <div className="quiz-finish">
                  <p className="quiz-answer-count" aria-live="polite">
                    {canContinue
                      ? `${tasteAnsweredCount} questions answered — you're ready!`
                      : `Answer ${remainingAnswers} more ${remainingAnswers === 1
                        ? 'question'
                        : 'questions'
                      } to continue.`}
                  </p>

                  <button
                    type="button"
                    className="quiz-finish-button"
                    onClick={goToGoals}
                    disabled={!canContinue}
                  >
                    Continue →
                  </button>
                </div>
              </>
            )}

            {isGoals && (
              <>
                <header className="quiz-page-header">
                  <p className="quiz-eyebrow">
                    YOUR READING GOALS · STEP 2 OF 2
                  </p>

                  <h1>Let's make reading fit your life</h1>

                  <p className="quiz-description">
                    LooseLeaf's reading timer helps you build a reading
                    habit at your own pace. Answer two quick questions
                    to personalize your goal, or skip for now.
                  </p>
                </header>

                {GOAL_SECTIONS.map((section, index) => (
                  <QuizQuestion
                    key={section.id}
                    section={section}
                    number={TASTE_SECTIONS.length + index + 1}
                    answer={answers}
                    onAnswer={answerQuestion}
                  />
                ))}

                <div className="quiz-finish">
                  <button
                    type="button"
                    className="quiz-finish-button"
                    onClick={completeQuiz}
                  >
                    Find My Books
                  </button>

                  <button
                    type="button"
                    className="quiz-skip-button"
                    onClick={completeQuiz}
                  >
                    Skip goal setting for now
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* Pop-up for skipping the quiz */}
      {showSkipPopup && (
        <div className="skip-popup-overlay">
          <div
            className="skip-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skip-popup-title"
          >
            <h2 id="skip-popup-title">Skip the Quiz?</h2>

            <p>
              Skipping the quiz means your book recommendations
              will be more general instead of personalized to
              your interests.
            </p>

            <p>Would you like to continue?</p>

            <div className="skip-popup-buttons">
              <button
                type="button"
                className="skip-confirm-button"
                onClick={() => {
                  setShowSkipPopup(false);
                  onSkip?.({ status: 'skipped' });
                }}
              >
                Yes, Skip Quiz
              </button>

              <button
                type="button"
                className="skip-cancel-button"
                onClick={() => setShowSkipPopup(false)}
              >
                No, Continue Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}