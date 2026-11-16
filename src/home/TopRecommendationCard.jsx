// HS-03: Top Recommendation Card
// Displays one recommended book or a fallback message.

import styles from './Home.module.css';

export default function TopRecommendationCard({ book, onStartReading }) {
  return (
    <div className={`${styles.card} ${styles.topPickCard}`}>
      <p className={styles.eyebrow}>OUR TOP PICK FOR YOU</p>
      <div className={styles.topPickContent}>
        <img
          src={book?.coverUrl || book?.cover || "https://covers.openlibrary.org/b/id/8225261-L.jpg"}
          alt={book?.title || "Recommended book"}
          className={styles.topPickCover}
        />
        <div>
          <h3 className={styles.cardHeader}>{book?.title || "World War Z"}</h3>
          <p className={styles.cardSubtext}>
            {book?.author ? `by ${book.author}` : "Based on your quiz answers."}
          </p>
        </div>
      </div>
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={() => onStartReading?.(book)}
      >
        Start reading
      </button>
    </div>
  );
}