import React, { useState, useEffect } from 'react';
import styles from './Home.module.css';
import Search from '../pages/Search/Search';
import { Profile } from '../pages/Profile/Profile';
import {
  fetchMultiPersonalizedRecommendations,
  POPULAR_BOOKTOK_BOOKS,
  RECOMMENDED_FOR_YOU,
  SHORT_EASY_READS,
} from '../services/bookService';
import HomeCarousel from './HomeCarousel';

export function Home({ user, currentBook, onRetakeQuiz, onSelectBook, logout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [userShelves, setUserShelves] = useState([]);

  useEffect(() => {
    async function loadRecs() {
      if (user?.id) {
        const shelves = await fetchMultiPersonalizedRecommendations(user.id);
        setUserShelves(shelves);
      }
    }
    loadRecs();
  }, [user]);

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
            </header>

            <section className={styles.bannerSection}>
              <HomeCarousel
                currentBook={currentBook}
                onRetakeQuiz={onRetakeQuiz}
              />
            </section>

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

              {/* 2. Multiple Quiz Shelves (Because You Like..., Match Your Mood..., Explore Genre...) */}
              {userShelves.map((shelf, idx) => (
                <div key={idx} className={styles.categoryRow}>
                  <h2 className={styles.categoryTitle}>{shelf.title}</h2>
                  <div className={styles.bookScrollRow}>
                    {shelf.books.map((book, bIdx) => (
                      <div
                        key={book.bookId || bIdx}
                        className={styles.bookCard}
                        onClick={() => onSelectBook?.(book)}
                      >
                        <img
                          src={book.coverUrl || book.cover}
                          alt={book.title}
                          className={styles.bookCover}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* 3. Popular Right Now (Trending & BookTok Hits) */}
              <div className={styles.categoryRow}>
                <h2 className={styles.categoryTitle}>Popular Right Now 🔥</h2>
                <div className={styles.bookScrollRow}>
                  {POPULAR_BOOKTOK_BOOKS.map((book) => (
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