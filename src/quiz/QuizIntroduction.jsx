// src/quiz/QuizIntroduction.jsx
// Quiz introduction screen (Screen 1 of the Figma design)

import styles from './QuizIntroduction.module.css';

export function QuizIntroduction({ onGetStarted }) {
  return (
    <div className={styles.container}>
      <div className={styles.iconCircle}>
        <svg viewBox="0 0 48 48" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="6" width="36" height="36" rx="4" />
          <path d="M14 14 h20 v8 h8 v16 h-8 v-16 h-16 v8 z" fill="currentColor" stroke="none" />
        </svg>
      </div>

      <h1 className={styles.headline}>
        Let&apos;s find you something you&apos;ll actually want to read
      </h1>

      <p className={styles.bodyText}>
        Just answer a few general questions and we&apos;ll curate a shelf
        tailored to your taste.
      </p>

      <button className={styles.primaryButton} onClick={onGetStarted}>
        Get Started
      </button>

      <p className={styles.secondaryText}>
        You can skip any question.
      </p>
    </div>
  );
}
