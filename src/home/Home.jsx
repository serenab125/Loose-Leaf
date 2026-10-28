import React, { useState } from 'react';
import styles from './Home.module.css';
import { Search } from '../search/Search';

const MOCK_CATEGORIES = [
  {
    title: 'Recommended for You',
    books: [
      { id: 1, title: 'The Great Gatsby', cover: 'https://covers.openlibrary.org/b/id/8311267-L.jpg' },
      { id: 2, title: 'The Hunger Games', cover: 'https://covers.openlibrary.org/b/id/13254928-L.jpg' },
      { id: 3, title: 'The Hobbit', cover: 'https://covers.openlibrary.org/b/id/8406786-L.jpg' }
    ]
  },
  {
    title: 'Popular Right Now',
    books: [
      { id: 4, title: 'Yesteryear', cover: 'https://covers.openlibrary.org/b/id/14556424-L.jpg' },
      { id: 5, title: 'Dungeon Crawler Carl', cover: 'https://covers.openlibrary.org/b/id/14589201-L.jpg' },
      { id: 6, title: 'The Wedding People', cover: 'https://covers.openlibrary.org/b/id/14601211-L.jpg' }
    ]
  },
  {
    title: 'Short & Easy Reads',
    books: [
      { id: 7, title: 'Wonder', cover: 'https://covers.openlibrary.org/b/id/8231856-L.jpg' },
      { id: 8, title: 'milk and honey', cover: 'https://covers.openlibrary.org/b/id/8235111-L.jpg' },
      { id: 9, title: 'Percy Jackson', cover: 'https://covers.openlibrary.org/b/id/7984916-L.jpg' }
    ]
  }
];

export function Home({ user, currentBook, onRetakeQuiz, onSelectBook }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className={styles.appViewport}>
      <div className={styles.scrollableContent}>
        {activeTab === 'home' ? (
          <>
            <header className={styles.brandHeader}>
              <div className={styles.logoWrapper}>
                <span className={styles.leafIcon}>🍃</span>
                <h1 className={styles.brandTitle}>LooseLeaf</h1>
                <span className={styles.leafIcon}>🍃</span>
              </div>
              <div className={styles.headerDivider} />
            </header>

            <section className={styles.bannerSection}>
              {activeSlide === 0 && (
                <div className={`${styles.card} ${styles.currentReadCard}`}>
                  <p className={styles.eyebrow}>CURRENT READ</p>
                  {currentBook ? (
                    <div className={styles.currentBookInfo}>
                      <img src={currentBook.cover} alt={currentBook.title} className={styles.miniCover} />
                      <div>
                        <h3 className={styles.cardHeader}>{currentBook.title}</h3>
                        <p className={styles.cardSubtext}>{currentBook.author}</p>
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
                  <button className={styles.primaryBtn}>
                    {currentBook ? 'Continue reading' : 'Pick my first book'}
                  </button>
                </div>
              )}

              {activeSlide === 1 && (
                <div className={`${styles.card} ${styles.topPickCard}`}>
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
                  <button className={styles.primaryBtn}>Start reading</button>
                </div>
              )}

              {activeSlide === 2 && (
                <div className={`${styles.card} ${styles.retakeCard}`}>
                  <p className={styles.eyebrow}>MOOD CHANGED?</p>
                  <h3 className={styles.cardHeader}>Retake your quiz</h3>
                  <p className={styles.cardSubtext}>Answer again and we'll refresh everything on your shelf.</p>
                  <button className={styles.primaryBtn} onClick={onRetakeQuiz}>
                    Retake Quiz
                  </button>
                </div>
              )}

              <div className={styles.dotsContainer}>
                {[0, 1, 2].map((idx) => (
                  <span
                    key={idx}
                    className={`${styles.dot} ${activeSlide === idx ? styles.activeDot : ''}`}
                    onClick={() => setActiveSlide(idx)}
                  />
                ))}
              </div>
            </section>

            <section className={styles.recommendationsSection}>
              {MOCK_CATEGORIES.map((category) => (
                <div key={category.title} className={styles.categoryRow}>
                  <h2 className={styles.categoryTitle}>{category.title}</h2>
                  <div className={styles.bookScrollRow}>
                    {category.books.map((book) => (
                      <div 
                        key={book.id} 
                        className={styles.bookCard}
                        onClick={() => onSelectBook?.(book)}
                      >
                        <img src={book.cover} alt={book.title} className={styles.bookCover} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : activeTab === 'search' ? (
          <Search onSelectBook={onSelectBook} />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#5b3113', fontFamily: 'Georgia, serif' }}>
            <h2>{activeTab.toUpperCase()}</h2>
            <p>This tab is under construction.</p>
          </div>
        )}
      </div>

      <nav className={styles.bottomNav}>
        <button
          type="button"
          className={`${styles.navItem} ${activeTab === 'home' ? styles.activeNavItem : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`${styles.navItem} ${activeTab === 'timer' ? styles.activeNavItem : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 16 14" />
          </svg>
          <span>Timer</span>
        </button>

        <button
          type="button"
          className={`${styles.navItem} ${activeTab === 'search' ? styles.activeNavItem : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search</span>
        </button>

        <button
          type="button"
          className={`${styles.navItem} ${activeTab === 'profile' ? styles.activeNavItem : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}