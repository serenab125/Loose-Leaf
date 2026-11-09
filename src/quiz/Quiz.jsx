
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
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function Quiz({ onSkip, onComplete, onBackToHome, user }) {

  //setting the pop up for skip quiz as false
  const [showSkipPopup, setShowSkipPopup] = useState(false);
  const [showStartOverPopup, setShowStartOverPopup] = useState(false);

  const {
    currentStep,
    answers,
    answerQuestion,
    startOver,
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

  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [quizSaved, setQuizSaved] = useState(false);

  useEffect(() => {
    if (!quizSaved) return;
  
    const timeout = setTimeout(() => {
      setQuizSaved(false);
    }, 3000);
  
    return () => clearTimeout(timeout);
  }, [quizSaved]);


  const handleSaveQuiz = async () => {
    if (isSaving) return;
  
    setQuizSaved(false);
    setSaveError('');
    setIsSaving(true);
  
    try {
      if (!user?.id) {
        throw new Error('You must be signed in to save your quiz.');
      }
  
      const { error } = await supabase
        .from('quiz_progress')
        .upsert(
          {
            user_id: user.id,
            answers,
            current_step: currentStep,
            completed_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
  
      if (error) throw error;
  
      setQuizSaved(true);
    } catch (error) {
      console.error('Error saving quiz progress:', error);
      setSaveError(error.message || 'Unable to save quiz.');
    } finally {
      setIsSaving(false);
    }
  };
  

  const handleComplete = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveError('');

    try {
      if (!user?.id) {
        throw new Error('You must be signed in to save your quiz.');
      }

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

localStorage.removeItem('looseleaf_quiz_answers');
localStorage.removeItem('looseleaf_quiz_step');

onComplete?.(answers);
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
        <p role="alert" style={{ color: '#b91c1c', padding: '12px' }}>
          {saveError}
        </p>
      )}
      {isIntro ? (
  <>
    <button
      type="button"
      className="quiz-back"
      onClick={onBackToHome}
    >
      ← Back to Home
    </button>

    <QuizIntroduction
      onGetStarted={goToNext}
      onSkipQuiz={() => setShowSkipPopup(true)}
    />
  </>
) : isComplete ? (
        <QuizLoading
          onComplete={handleComplete}
          onRetake={goToIntro}
        />
      ) : (
        <main className="quiz-scroll-page">
          <div className="quiz-content">
          <div className="quiz-top-actions">
  <button
    type="button"
    className="quiz-back"
    onClick={isGoals ? goBackToTaste : goToIntro}
  >
    ← Back
  </button>



  <div className="quiz-action-buttons">
    <button
      type="button"
      className="quiz-save-button"
      onClick={() => {
        localStorage.setItem(
          'looseleaf_quiz_answers',
          JSON.stringify(answers)
        );
        localStorage.setItem(
          'looseleaf_quiz_step',
          String(currentStep)
        );
        setQuizSaved(true);
      }}
    >
      Save Quiz
    </button>

    <button
      type="button"
      className="quiz-start-over-button"
      onClick={() => setShowStartOverPopup(true)}
    >
      Start Over
    </button>
  </div>
</div>

{quizSaved && (
  <p className="quiz-saved-message" role="status">
    ✓ Quiz saved! You can come back anytime.
  </p>
)}

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

{/* Pop-up for starting the quiz over */}
{showStartOverPopup && (
  <div className="skip-popup-overlay">
    <div
      className="skip-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-over-title"
    >
      <h2 id="start-over-title">Start Fresh?</h2>

      <p>
        This will clear your current quiz answers
        and let you start again from the beginning.
      </p>

      <p>Are you sure you want to start over?</p>

      <div className="skip-popup-buttons">
        <button
          type="button"
          className="skip-cancel-button"
          onClick={() => setShowStartOverPopup(false)}
        >
          Keep My Answers
        </button>

        <button
          type="button"
          className="skip-confirm-button"
          onClick={() => {
            startOver();
            setShowStartOverPopup(false);
          }}
        >
          Yes, Start Over
        </button>
      </div>
    </div>
  </div>
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
