import styles from './Home.module.css';
import HomeCarousel from './HomeCarousel';

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
            onRetakeQuiz={onRetakeQuiz}
          />
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
      </div>

      <nav className={styles.bottomNav}>
        <button className={`${styles.navItem} ${styles.activeNavItem}`}>
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>

        <button className={styles.navItem}>
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Timer</span>
        </button>

        <button className={styles.navItem}>
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search</span>
        </button>

        <button className={styles.navItem}>
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}