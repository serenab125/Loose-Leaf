
import styles from './QuizIntroduction.module.css';

export function QuizIntroduction({ onGetStarted, onSkipQuiz }) {
  return (
    <div className={styles.container}>
      <div className={styles.iconCircle}>
        <svg
          viewBox="0 0 48 48"
          className={styles.icon}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 7 H37 V41 H12 C8.5 41 7 38.5 7 35 V13 C7 9.5 8.5 7 12 7 Z" />
          <path d="M12 34 H37" />
          <path d="M12 34 C8.5 34 7 36 7 38" />
        </svg>
      </div>

      <h1 className={styles.headline}>
        Let&apos;s find you something you&apos;ll actually want to read
      </h1>

      <p className={styles.bodyText}>
        Just answer a few general questions. No book knowledge required.
        <br />
        Should take about a minute.
      </p>

      <button className={styles.primaryButton} onClick={onGetStarted}>
        Get Started
      </button>

      <button
        type="button"
        className={styles.skipButton}
        onClick={onSkipQuiz}
      >
        Skip Quiz
      </button>

    </div>
  );
}
