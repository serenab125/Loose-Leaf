// HS-03: Top Recommendation Card
// Displays one recommended book or a fallback message.

function TopRecommendationCard({ book, onStartReading }) {
  return (
    <section className="top-recommendation-card">
      <p className="top-recommendation-label">
        OUR TOP PICK FOR YOU
      </p>

      {book ? (
        <>
          <div className="top-recommendation-content">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={`Cover of ${book.title}`}
                className="top-recommendation-cover"
              />
            ) : (
              <div className="top-recommendation-placeholder">
                📖
              </div>
            )}

            <div className="top-recommendation-info">
              <h2>{book.title}</h2>
              <p>{book.author || 'Unknown author'}</p>
              <span>Based on your reading preferences</span>
            </div>
          </div>

          <button
            type="button"
            className="top-recommendation-button"
            onClick={() => onStartReading?.(book)}
          >
            Start Reading
          </button>
        </>
      ) : (
        <>
          <div className="top-recommendation-empty">
            <h2>Your next favorite book is waiting!</h2>
            <p>
              We're still finding the perfect recommendation
              for you.
            </p>
          </div>
        </>
      )}
    </section>
  )
}

export default TopRecommendationCard