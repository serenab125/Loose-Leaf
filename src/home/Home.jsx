import { useEffect, useState } from 'react';
import { fetchMultiPersonalizedRecommendations, DEFAULT_BOOKS } from '../services/bookService';
import styles from './Home.module.css';
import HomeCarousel from './HomeCarousel';

export function Home({ user, currentBook, onRetakeQuiz, onSelectBook, onNavigateToSearch, skippedQuiz = false }) {
  const [userShelves, setUserShelves] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      if (!user?.id) {
        setUserShelves([]);
        return;
      }

      const shelves = await fetchMultiPersonalizedRecommendations(user.id);

      if (!cancelled) {
        setUserShelves(
          shelves.length > 0
            ? shelves
            : skippedQuiz
              ? [{ title: 'Discover Your Next Read', books: DEFAULT_BOOKS }]
              : []
        );
      }
    }

    loadRecommendations();
    return () => { cancelled = true; };
  }, [user?.id, skippedQuiz]);


  return (
    <div className={styles.appViewport}>
      <div className={styles.scrollableContent}>

        {/* Angela's LooseLeaf Homepage Header */}
        <header className={styles.brandHeader}>
          <div className={styles.logoWrapper}>
            <span className={styles.leafIcon}>🍃</span>
            <h1 className={styles.brandTitle}>LooseLeaf</h1>
            <span className={styles.leafIcon}>🍃</span>
          </div>
          <div className={styles.headerDivider} />
        </header>

        {/* Serena's Sprint 2 Homepage Carousel */}
        <section className={styles.bannerSection}>
          <HomeCarousel
            user={user}
            onRetakeQuiz={onRetakeQuiz}
            onNavigateToSearch={onNavigateToSearch}
          />
        </section>

        <section className={styles.recommendationsSection}>
          {userShelves.map((shelf, index) => (
            <div key={`${shelf.title}-${index}`} className={styles.categoryRow}>
              <h2 className={styles.categoryTitle}>{shelf.title}</h2>
              <div className={styles.bookScrollRow}>
                {shelf.books.map((book, bookIndex) => (
                  <div
                    key={book.bookId || book.id || bookIndex}
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


        </section>
      </div>


    </div>
  );
}