import React, { useState, useEffect } from 'react';
import styles from './Home.module.css';
import Search from '../pages/Search/Search';
import { Profile } from '../pages/Profile/Profile';
import { fetchPersonalizedRecommendations } from '../services/bookService';
import HomeCarousel from './HomeCarousel';

const RECOMMENDED_FOR_YOU = [
  { id: 'r1', title: 'The Hunger Games', cover: 'https://covers.openlibrary.org/b/id/13254928-L.jpg' },
  { id: 'r2', title: 'The Hobbit', cover: 'https://covers.openlibrary.org/b/id/8406786-L.jpg' },
  { id: 'r3', title: 'One of Us Is Lying', cover: 'https://covers.openlibrary.org/b/id/8381286-L.jpg' },
  { id: 'r4', title: 'Hollow Kingdom', cover: 'https://covers.openlibrary.org/b/id/10521270-L.jpg' },
  { id: 'r5', title: 'Percy Jackson', cover: 'https://covers.openlibrary.org/b/id/7984916-L.jpg' },
];

const POPULAR_RIGHT_NOW = [
  { id: 'p1', title: 'Yesteryear', cover: 'https://covers.openlibrary.org/b/id/14556424-L.jpg' },
  { id: 'p2', title: 'Dungeon Crawler Carl', cover: 'https://covers.openlibrary.org/b/id/14589201-L.jpg' },
  { id: 'p3', title: 'The Wedding People', cover: 'https://covers.openlibrary.org/b/id/14601211-L.jpg' },
];

const SHORT_EASY_READS = [
  { id: 's1', title: 'Wonder', cover: 'https://covers.openlibrary.org/b/id/8231856-L.jpg' },
  { id: 's2', title: 'milk and honey', cover: 'https://covers.openlibrary.org/b/id/8235111-L.jpg' },
  { id: 's3', title: 'Percy Jackson', cover: 'https://covers.openlibrary.org/b/id/7984916-L.jpg' },
];

export function Home({ user, currentBook, onRetakeQuiz, onSelectBook, logout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [personalizedRecs, setPersonalizedRecs] = useState(null);

  useEffect(() => {
    async function loadRecs() {
      if (user?.id) {
        const recData = await fetchPersonalizedRecommendations(user.id);
        setPersonalizedRecs(recData);
      }
    }
    loadRecs();
  }, [user]);

  return (
    <div className={styles.appViewport}>
      <div className={styles.scrollableContent}>
        {activeTab === 'home' ? (
          <>
            {/* LooseLeaf Header */}
            <header className={styles.brandHeader}>
              <div className={styles.logoWrapper}>
                <span className={styles.leafIcon}>🍃</span>
                <h1 className={styles.brandTitle}>LooseLeaf</h1>
                <span className={styles.leafIcon}>🍃</span>
              </div>
            </header>

            {/* Serena's Sprint 2 Homepage Carousel */}
            <section className={styles.bannerSection}>
              <HomeCarousel
                currentBook={currentBook}
                onRetakeQuiz={onRetakeQuiz}
              />
            </section>

            {/* Recommendations Shelves */}
            <section className={styles.recommendationsSection}>
              {/* 1. Recommended for You */}
              <div className={styles.categoryRow}>
                <h2 className={styles.categoryTitle}>Recommended for You</h2>
                <div className={styles.bookScrollRow}>
                  {RECOMMENDED_FOR_YOU.map((book) => (
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

              {/* 2. Personalized Quiz Recommendation (Because You Like: ...) */}
              {personalizedRecs && (
                <div className={styles.categoryRow}>
                  <h2 className={styles.categoryTitle}>{personalizedRecs.category}</h2>
                  <div className={styles.bookScrollRow}>
                    {personalizedRecs.books.map((book, idx) => (
                      <div
                        key={book.bookId || idx}
                        className={styles.bookCard}
                        onClick={() => onSelectBook?.(book)}
                      >
                        <img
                          src={book.coverUrl || book.cover || 'https://covers.openlibrary.org/b/id/8311267-L.jpg'}
                          alt={book.title}
                          className={styles.bookCover}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Popular Right Now */}
              <div className={styles.categoryRow}>
                <h2 className={styles.categoryTitle}>Popular Right Now</h2>
                <div className={styles.bookScrollRow}>
                  {POPULAR_RIGHT_NOW.map((book) => (
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

              {/* 4. Short & Easy Reads */}
              <div className={styles.categoryRow}>
                <h2 className={styles.categoryTitle}>Short & Easy Reads</h2>
                <div className={styles.bookScrollRow}>
                  {SHORT_EASY_READS.map((book) => (
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
            </section>
          </>
        ) : activeTab === 'search' ? (
          <Search onSelectBook={onSelectBook} />
        ) : activeTab === 'profile' ? (
          <Profile user={user} logout={logout} />
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5b3113', fontFamily: 'Georgia, serif' }}>
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