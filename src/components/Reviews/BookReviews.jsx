
import { useState } from 'react';
import './BookReviews.css';

export default function BookReviews({
  reviews = [],
  loading = false,
  error = null,
  currentUserId = null,
  onEdit,
  onDelete,
}) {
  const [category, setCategory] = useState('Analytical');
  const [sortOrder, setSortOrder] = useState('high');
  const [revealedSpoilers, setRevealedSpoilers] = useState([]);

  const ownReview = reviews.find(
    (review) =>
      currentUserId != null &&
      String(review.userId) === String(currentUserId)
  );
  
  const filteredReviews = reviews
    .filter(
      (review) =>
        review !== ownReview &&
        review.classification?.toLowerCase() ===
          category.toLowerCase()
    )
    .sort((a, b) =>
      sortOrder === 'high'
        ? (b.rating ?? 0) - (a.rating ?? 0)
        : (a.rating ?? 0) - (b.rating ?? 0)
    );
  
  const displayedReviews = [
    ...(ownReview ? [ownReview] : []),
    ...filteredReviews,
  ];

  return (
    <section className="book-reviews">
      <div className="review-tabs">
        <button className="selected" type="button">
          Reviews
        </button>
        <button type="button" disabled>
          Reactions
        </button>
      </div>

      <div className="review-toggle">
        <button
          type="button"
          className={category === 'Analytical' ? 'selected' : ''}
          onClick={() => setCategory('Analytical')}
          aria-pressed={category === 'Analytical'}
        >
          Analytical
        </button>

        <button
          type="button"
          className={`toggle-switch ${
            category === 'Casual' ? 'casual' : ''
          }`}
          onClick={() =>
            setCategory(
              category === 'Analytical' ? 'Casual' : 'Analytical'
            )
          }
          aria-label="Switch review category"
        >
          <span />
        </button>

        <button
          type="button"
          className={category === 'Casual' ? 'selected' : ''}
          onClick={() => setCategory('Casual')}
          aria-pressed={category === 'Casual'}
        >
          Casual
        </button>
      </div>

      <div className="review-sort">
        <button
          type="button"
          className={sortOrder === 'low' ? 'selected' : ''}
          onClick={() => setSortOrder('low')}
        >
          Lowest to Highest
        </button>
        <button
          type="button"
          className={sortOrder === 'high' ? 'selected' : ''}
          onClick={() => setSortOrder('high')}
        >
          Highest to Lowest
        </button>
      </div>

      {loading ? (
        <p className="review-message">Loading reviews...</p>
      ) : error ? (
        <p className="review-message" role="alert">
          Reviews could not be loaded. Please try again.
        </p>
      ) : reviews.length === 0 ? (
        <p className="review-message">
          No reviews available for this book yet.
        </p>
      ) : displayedReviews.length === 0 ? (
        <p className="review-message">
          No {category.toLowerCase()} reviews available.
        </p>
      ) : (
        <div className="review-list">
          {displayedReviews.map((review) => {
            const isOwner =
            currentUserId != null &&
            String(review.userId) === String(currentUserId);

            return (
              <article
                key={review.id}
                className={`review-card ${
                  isOwner ? 'own-review' : ''
                } ${category.toLowerCase()}`}
              >
                <div className="review-card-header">
                <div className="review-avatar" aria-hidden="true">
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20v-1.5a7 7 0 0 1 14 0V20" />
  </svg>
</div>

                  <div className="review-author">
                  <strong>
  {review.authorName || review.username || 'Anonymous Reader'}
</strong>

                    {isOwner && (
                      <span className="your-review-label">
                        YOUR REVIEW
                      </span>
                    )}

                    
                  </div>

                  {isOwner && (
                    <div className="review-actions">
                      <button
                        type="button"
                        aria-label="Edit review"
                        onClick={() => onEdit?.(review)}
                        disabled={!onEdit}
                      >
                        ✎
                      </button>
                      <button
  type="button"
  aria-label="Delete review"
  onClick={() => onDelete?.(review)}
  disabled={!onDelete}
>
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 10v7" />
    <path d="M14 10v7" />
  </svg>
</button>
                    </div>
                  )}
                </div>

                <div
                  className="review-stars"
                  aria-label={`${review.rating ?? 0} out of 5 stars`}
                >
                  {Array.from({ length: 5 }, (_, index) => {
  const fill = Math.max(
    0,
    Math.min(100, ((review.rating ?? 0) - index) * 100)
  );

  return (
    <span
      key={index}
      style={{
        position: 'relative',
        display: 'inline-block',
        lineHeight: 1,
      }}
    >
      <span aria-hidden="true">☆</span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${fill}%`,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        ★
      </span>
    </span>
  );
})}

                  {isOwner && (
                    <small>{review.classification}</small>
                  )}
                </div>

                {review.includesSpoilers &&
 !isOwner &&
 !revealedSpoilers.includes(review.id) ? (
  <div className="review-spoiler-warning">
    <p>This review contains spoilers.</p>
    <button
      type="button"
      onClick={() =>
        setRevealedSpoilers((previous) => [...previous, review.id])
      }
    >
      Reveal Spoiler
    </button>
  </div>
) : (
  <p className="review-text">{review.text}</p>
)}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
