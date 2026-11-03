// HS-03: Top Recommendation Card
// Displays one recommended book or a fallback message.

import React, { useState } from 'react';
import styles from './Home.module.css';

export default function HomeCarousel({ currentBook, onRetakeQuiz, onNavigateToSearch }) {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    <div key="slide-0" className={`${styles.card} ${styles.currentReadCard}`}>
      <p className={styles.eyebrow}>CURRENT READ</p>
      {currentBook ? (
        <div className={styles.currentBookInfo}>
          <img
            src={currentBook.coverUrl || currentBook.cover}
            alt={currentBook.title}
            className={styles.miniCover}
          />
          <div>
            <h3 className={styles.cardHeader}>{currentBook.title}</h3>
            <p className={styles.cardSubtext}>{currentBook.author || 'Unknown Author'}</p>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.placeholderBox}>+</div>
          <div>
            <h3 className={styles.cardHeader}>You haven't picked a book yet</h3>
            <p className={styles.cardSubtext}>
              Choose your first read and we'll keep it right here.
            </p>
          </div>
        </div>
      )}
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={onNavigateToSearch}
      >
        {currentBook ? 'Continue reading' : 'Pick my first book'}
      </button>
    </div>,

    <div key="slide-1" className={`${styles.card} ${styles.topPickCard}`}>
      <p className={styles.eyebrow}>OUR TOP PICK FOR YOU</p>
      <div className={styles.topPickContent}>
        <img
          src="https://covers.openlibrary.org/b/id/8225261-L.jpg"
          alt="World War Z"
          className={styles.topPickCover}
        />
        <div>
          <h3 className={styles.cardHeader}>World War Z</h3>
          <p className={styles.cardSubtext}>Based on your quiz answers.</p>
        </div>
      </div>
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={onNavigateToSearch}
      >
        Start reading
      </button>
    </div>,

    <div key="slide-2" className={`${styles.card} ${styles.retakeCard}`}>
      <p className={styles.eyebrow}>MOOD CHANGED?</p>
      <h3 className={styles.cardHeader}>Retake your quiz</h3>
      <p className={styles.cardSubtext}>Answer again and we'll refresh everything on your shelf.</p>
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={onRetakeQuiz}
      >
        Retake Quiz
      </button>
    </div>
  ];

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.slideWrapper}>
        {slides[activeSlide]}
      </div>

      <div className={styles.dotsContainer}>
        {slides.map((_, idx) => (
          <span
            key={idx}
            className={`${styles.dot} ${activeSlide === idx ? styles.activeDot : ''}`}
            onClick={() => setActiveSlide(idx)}
          />
        ))}
      </div>
    </div>
  );
}