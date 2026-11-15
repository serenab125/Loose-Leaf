
// src/quiz/QuizLoading.jsx
// Loading / transition screen (Screen 3)

import { useState, useEffect } from 'react';
import styles from './QuizLoading.module.css';

export function QuizLoading({ onComplete, onRetake }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Drive the bar by elapsed wall-clock time rather than by counting ticks.
    // A tick counter stalls when the tab is backgrounded and the browser
    // throttles setInterval, which would leave the loader stuck part-way.
    const DURATION_MS = 6000
    const startedAt = Date.now()

    const interval = setInterval(() => {
      const next = Math.min(
        100,
        Math.round(((Date.now() - startedAt) / DURATION_MS) * 100)
      )

      setProgress(next)

      if (next >= 100) {
        clearInterval(interval)
      }
    }, 60)

    return () => clearInterval(interval)
  }, []);

  const isFinished = progress >= 100;

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
          <path d="M39 9C21 9 10 17 10 30c0 6 4 9 9 9 13 0 20-12 20-30Z" />
          <path d="M9 39c7-10 15-16 25-22" />
        </svg>
      </div>

      <h2 className={styles.headline}>
        Your shelf is taking shape...
      </h2>

      <p className={styles.bodyText}>
        We&apos;ve gathered a few books that you might enjoy.
      </p>

      <div className={styles.loadingDots}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={styles.dot}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>

      {!isFinished && (
        <>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className={styles.progressText}>
            {progress}% complete
          </p>
        </>
      )}

      <div className={styles.actions}>
        {isFinished && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onComplete}
          >
            Take me to my shelf
          </button>
        )}

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onRetake}
        >
          Retake the quiz
        </button>
      </div>
    </div>
  );
}
