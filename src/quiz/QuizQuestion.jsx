// src/quiz/QuizQuestion.jsx
// Quiz question screen with radio input, Back/Next navigation (Screen 2)

import { useState } from 'react';
import styles from './QuizQuestion.module.css';

export function QuizQuestion({ section, answer, onAnswer, onBack }) {
  const [localSelection, setLocalSelection] = useState(null);

  // Sync local selection with props when it changes from outside
  if (answer[section.id] !== undefined) {
    setLocalSelection(answer[section.id]);
  }

  const handleSelect = (optionId) => {
    setLocalSelection((prev) => (prev === optionId ? null : optionId));
    onAnswer(section.id, optionId);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setLocalSelection(null);
      onAnswer(section.id, null);
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
        {section ? (
          <>
            <StepCircle active={localSelection !== null} completed={!!answer[section.id]} label="1" />
            <StepCircle active={false} completed={false} label="2" />
          </>
        ) : (
          <>
            <StepCircle active={false} completed={false} label="1" />
            <StepCircle active={false} completed={false} label="2" />
          </>
        )}
      </div>

      <h3 className={styles.questionText}>{section.question}</h3>

      <p className={styles.instructions}>{section.instructions}</p>

      <div className={styles.optionsGrid}>
        {section.options.map((option) => (
          <label
            key={option.id}
            className={styles.optionRow}
            style={{ borderColor: localSelection === option.id ? '#a8c6a0' : undefined }}
          >
            <input
              type="radio"
              name={`quiz-${section.id}`}
              value={option.id}
              checked={localSelection === option.id}
              onChange={() => handleSelect(option.id)}
              className={styles.radioInput}
            />
            <span className={styles.optionCheck} />
            <span className={styles.optionTitle}>{option.label}</span>
            <span className={styles.optionSubtitle}>{option.subtitle}</span>
          </label>
        ))}
      </div>

      <div className={styles.footer}>
        <button className={styles.skipButton} onClick={() => onAnswer(section.id, undefined)}>
          Skip
        </button>
        <button
          className={styles.nextButton}
          onClick={() => {
            if (localSelection === null && section.type === 'single-select') {
              return;
            }
            onAnswer(section.id, localSelection);
            onBack();
          }}
          disabled={!localSelection && section.type === 'single-select'}
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
