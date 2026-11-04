
import { useState, useEffect, useRef } from 'react';
import { TASTE_SECTIONS, GOAL_SECTIONS, MIN_TASTE_ANSWERS } from './quizData';
import { useQuiz } from './useQuiz';
import { QuizIntroduction } from './QuizIntroduction';
import { QuizQuestion } from './QuizQuestion';
import { QuizLoading } from './QuizLoading';
import './quiz.css';
import { supabase } from '../supabaseClient';
import { saveQuizProgress } from '../services/quizService';

// Helper: convert step number to number (0=intro, 1=taste, 2=goals, 3=complete)
const stepToNumber = (currentStep) => {
  if (currentStep === 0) return 0;  // introduction
  if (currentStep === 1) return 1;  // taste
  if (currentStep === 2) return 2;  // goals
  return 3;  // complete
};

export function Quiz({ onSkip, onComplete, user, userId, supabaseClient = supabase }) {

  //setting the pop up for skip quiz as false
  const [showSkipPopup, setShowSkipPopup] = useState(false);

  const { currentStep, isRestoring, ...quizProps } = useQuiz();

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
    restoreProgress,
  } = quizProps;

  const [saveError, setSaveError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
  const [isSaving, setIsSaving] = useState(false);

  // Refs to skip saves triggered by restore and to prevent duplicate saves
  const mountedRef = useRef(true);
  const firstSaveRef = useRef(true);
  const debounceRef = useRef(null);

  // Restore saved progress when the component mounts
  useEffect(() => {
    if (userId) {
      restoreProgress(userId);
    }
  }, [userId, restoreProgress]);

  // Save progress with debounce and skip restore-triggered save
  useEffect(() => {
    // Skip save on first render after restore
    if (userId && firstSaveRef.current && !isRestoring) {
      firstSaveRef.current = false;
      return;
    }
    if (mountedRef.current && !isRestoring) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        saveQuizProgress(userId, answers, stepToNumber(isGoals ? 2 : isTaste ? 1 : 3), {
          client: supabaseClient,
          completed: false,
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      }, 600);
    }
  }, [answers, userId, isRestoring, isTaste, isGoals, supabaseClient, mountedRef, firstSaveRef]);

  // Update mounted ref on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Save progress when quiz is marked complete
  const handleComplete = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveError('');
    setSaveStatus('saving');

    try {
      if (!user?.id) {
        throw new Error('You must be signed in to save your quiz.');
      }

      // Mark the quiz row as completed so restore skips it next time.
      await saveQuizProgress(
        user.id,
        answers,
        stepToNumber(currentStep),
        { client: supabaseClient, completed: true }
      );

      // Save the answers as the user's reading_preferences for recommendations.
      const { error } = await supabaseClient
        .from('profiles')
        .upsert(
          {
            id: user.id,
            full_name: user.user_metadata?.full_name || '',
            email: user.email,
            reading_preferences: answers,
          },
          { onConflict: 'id' }
        );

      if (error) throw error;

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);

      console.log('Quiz answers saved successfully!', answers);
      // Notify parent that quiz is complete
      onComplete?.();
    } catch (error) {
      console.error('Error saving quiz answers:', error);
      setSaveError(error.message || 'Unable to save quiz answers.');
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  };

  // Clear progress and go to intro (for "Retake" from complete screen)
  const handleRetake = async () => {
    if (userId) {
      try {
        await saveQuizProgress(userId, {}, 1, { client: supabaseClient, completed: false });
      } catch (err) {
        console.warn('Retake: failed to reset progress', err);
      }
    }
    goToIntro();
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

      {/* Optional tiny "Saved" indicator — safe to remove */}
      {saveStatus === 'saving' && (
        <p style={{ fontSize: 11, color: '#ad9384', textAlign: 'right', padding: '4px 20px 0' }}>
          Saving…
        </p>
      )}
      {saveStatus === 'saved' && (
        <p style={{ fontSize: 11, color: '#ad9384', textAlign: 'right', padding: '4px 20px 0' }}>
          Saved ✓
        </p>
      )}
      {isIntro ? (
        //introduction page to take quiz or skip quiz
        <QuizIntroduction
          onGetStarted={goToNext}
          onSkipQuiz={() => setShowSkipPopup(true)} />
      ) : isComplete ? (
        <QuizLoading
          onComplete={handleComplete}
          onRetake={handleRetake}
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
                    className="quiz-skip-button"
                    onClick={() => setShowSkipPopup(true)}
                  >
                    Skip Quiz
                  </button>

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
