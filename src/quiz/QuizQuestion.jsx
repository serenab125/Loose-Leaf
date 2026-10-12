// src/quiz/QuizQuestion.jsx
// Quiz question screen with radio/checkbox input, Back/Next navigation (Screen 2)

import { useState, useEffect } from 'react';
import styles from './QuizQuestion.module.css';

// Answer-type contract (defined in quizData.js):
//   - single-select sections: localSelection is a string (option id) or null
//   - multi-select sections:  localSelection is an array of option ids
export function QuizQuestion({
  section,
  answer,
  onAnswer,
  onBack,
  onNext,
  currentStep,
  totalSteps,
}) {
  const isMulti = section.type === 'multi-select';
  const current = currentStep + 1; // 1-based step number

  // Draft selection local to this screen (not persisted until the user moves).
  const [localSelection, setLocalSelection] = useState(() => {
    if (!section) return null;
    const persisted = answer?.[section.id];
    if (isMulti) return Array.isArray(persisted) ? [...persisted] : [];
    return persisted ?? null;
  });

  // Restore a previously saved answer when moving between sections
  // (e.g. Back / Next / Retake). Constrained to section.id so it never
  // loops: the parent's answer updates on every click are *not* reflected
  // here, avoiding the stale-setState-in-render and infinite-loop bugs
  // present in the original code.
  useEffect(() => {
    if (!section) return;
    const persisted = answer?.[section.id];
    setLocalSelection((prev) => {
      const next = isMulti
        ? Array.isArray(persisted)
          ? [...persisted]
          : []
        : persisted ?? null;
      return Object.is(prev, next) ? prev : next;
    });
  }, [section?.id]);

  const handleChange = (e) => {
    const optionId = e.target.value;
    const isChecked = e.target.checked;
    const next =
      isMulti && isChecked
        ? [...localSelection, optionId]
        : isMulti
        ? localSelection.filter((id) => id !== optionId)
        : isChecked
        ? optionId
        : null;
    setLocalSelection(next);
  };

  const handleSubmit = () => {
    // Persist the draft, then advance. Radio inputs cannot be cleared, so a
    // user who wants "none of the above" must use Skip or the Escape key.
    onAnswer(section.id, localSelection);
    onNext();
  };

  const handleSkip = () => {
    onAnswer(section.id, isMulti ? [] : null);
    onNext();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onAnswer(section.id, isMulti ? [] : null);
    }
  };

  return (
    <div className={styles.container} onKeyDown={handleKeyDown} tabIndex={0}>
      <button className={styles.backButton} onClick={onBack}>
        <svg viewBox="0 0 24 24" className={styles.backIcon} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18 l-6 -6 l6 -6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <h2 className={styles.header}>Your Reading Quiz</h2>
      <p className={styles.subheader}>Progress: {section?.title}</p>

      <div className={styles.progressCircles}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNumber) => {
          const isActive = stepNumber === current;
          const isCompleted = stepNumber < current;
          return (
            <StepCircle
              key={stepNumber}
              active={isActive}
              completed={isCompleted}
              label={String(stepNumber)}
            />
          );
        })}
      </div>

      <h3 className={styles.questionText}>{section.question}</h3>

      <p className={styles.instructions}>{section.instructions}</p>

      <div className={styles.optionsGrid}>
        {section.options.map((option) => {
          const isSelected =
            isMulti && Array.isArray(localSelection)
              ? localSelection.includes(option.id)
              : localSelection === option.id;
          return (
            <label
              key={option.id}
              className={styles.optionRow}
              style={{ borderColor: isSelected ? '#a8c6a0' : undefined }}
            >
              <input
                type={isMulti ? 'checkbox' : 'radio'}
                name={`quiz-${section.id}`}
                value={option.id}
                checked={isSelected}
                onChange={handleChange}
                className={styles.radioInput}
              />
              <span className={styles.optionCheck} />
              <span className={styles.optionTitle}>{option.label}</span>
              <span className={styles.optionSubtitle}>{option.subtitle}</span>
            </label>
          );
        })}
      </div>

      <div className={styles.footer}>
        <button className={styles.skipButton} onClick={handleSkip}>
          Skip
        </button>
        <button
          className={styles.nextButton}
          onClick={handleSubmit}
          disabled={isMulti ? localSelection.length === 0 : localSelection === null}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function StepCircle({ active, completed, label }) {
  return (
    <div className={styles.stepCircle}>
      <span className={styles.stepNumber}>{label}</span>
      <div
        className={`${styles.stepIndicator} ${
          completed ? styles.stepCompleted : ''
        } ${active ? styles.stepActive : ''}`}
      />
    </div>
  );
}
