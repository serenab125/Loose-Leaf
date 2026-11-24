import { useEffect, useState } from 'react';
import { fetchMultiPersonalizedRecommendations } from '../services/bookService';
import { fetchDefaultRecommendationShelves } from '../services/defaultRecommendations';
import HomeCarousel from './HomeCarousel';
import styles from './Home.module.css';

export function Home({
  user,
  onRetakeQuiz,
  onSelectBook,
  onNavigateToSearch,
  onNavigateToTimer,
  skippedQuiz = false,
}) {
  const [userShelves, setUserShelves] = useState([]);
  const [failedCovers, setFailedCovers] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      if (!user?.id) {
        setUserShelves([]);
        return;
      }

      const shelves = skippedQuiz
        ? await fetchDefaultRecommendationShelves()
        : await fetchMultiPersonalizedRecommendations(user.id);

      if (!cancelled) {
        // If a user hasn't skipped explicitly but has no personalized shelves yet,
        // fall back to modern default shelves so the homepage is never empty.
        if (!skippedQuiz && (!shelves || shelves.length === 0)) {
          const fallbackShelves = await fetchDefaultRecommendationShelves();
          if (!cancelled) setUserShelves(fallbackShelves);
        } else {
          setUserShelves(shelves);
        }
      }
    }

    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [user?.id, skippedQuiz]);

  const markCoverFailed = (key) => {
    setFailedCovers((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

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
            onNavigateToTimer={onNavigateToTimer}
            onSelectBook={onSelectBook}
          />
        </section>

        <section className={styles.recommendationsSection}>
          {userShelves.map((shelf, index) => (
            <div key={`${shelf.title}-${index}`} className={styles.categoryRow}>
              <h2 className={styles.categoryTitle}>{shelf.title}</h2>
              <div className={styles.bookScrollRow}>
                {shelf.books.map((book, bookIndex) => {
                  const bookKey =
                    book.bookId || book.id || `${shelf.title}-${bookIndex}`;
                  const coverSrc = book.coverUrl || book.cover;
                  const showFallback = !coverSrc || failedCovers.has(bookKey);

                  return (
                    <div
                      key={bookKey}
                      className={styles.bookCard}
                      onClick={() => onSelectBook?.(book)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${book.title}${book.author ? ` by ${book.author}` : ''}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectBook?.(book);
                        }
                      }}
                    >
                      {showFallback ? (
                        <div
                          className={styles.bookCover}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: '10px 8px',
                            background:
                              'linear-gradient(145deg, #efe4d6 0%, #dfd0be 100%)',
                            color: '#5b3113',
                            borderRadius: '10px',
                            boxShadow: '0 4px 10px rgba(91, 49, 19, 0.12)',
                            boxSizing: 'border-box',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'Georgia, serif',
                              fontSize: '11px',
                              fontWeight: 700,
                              lineHeight: 1.25,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 4,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {book.title}
                          </span>
                          {book.author && (
                            <span
                              style={{
                                fontSize: '9px',
                                color: '#7c6252',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {book.author}
                            </span>
                          )}
                        </div>
                      ) : (
                        <img
                          src={coverSrc}
                          alt={book.title}
                          loading="lazy"
                          onError={() => markCoverFailed(bookKey)}
                          className={styles.bookCover}
                          style={{
                            objectFit: 'cover',
                            borderRadius: '10px',
                            boxShadow: '0 4px 12px rgba(91, 49, 19, 0.14)',
                            backgroundColor: '#efe4d6',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}