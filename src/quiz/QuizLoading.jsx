// src/quiz/QuizLoading.jsx
// Loading / transition screen (Screen 3)

import { useState, useEffect } from 'react';
import styles from './QuizLoading.module.css';

export function QuizLoading({ onComplete, onRetake }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 60);

    return () => clearInterval(interval);
  }, []);

  const isFinished = progress >= 100;

  return (
    <div className={styles.container}>
      <div className={styles.iconCircle}>
        <svg viewBox="0 0 48 48" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12 a8 8 0 0 1 16 0 v8 a8 8 0 0 1 -16 0 z" />
          <path d="M4 20 a12 12 0 0 1 16 0 v0 a12 12 0 0 1 -16 0 z" />
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

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className={styles.progressText}>{progress}% complete</p>

      <div className={styles.actions}>
        {isFinished ? (
          <button className={styles.primaryButton} onClick={onComplete}>
            Take me to my shelf
          </button>
        ) : null}
        <button className={styles.secondaryButton} onClick={onRetake}>
          Retake the quiz
        </button>
      </div>
    </div>
  );
}
