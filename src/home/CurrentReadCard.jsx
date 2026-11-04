// HS-02: Current Read Card
// Displays the user's current book or an empty state.

function CurrentReadCard({ book, onPickBook, onContinueReading }) {
  return (
    <section className="current-read-card">
      <p className="current-read-label">CURRENT READ</p>

      {book ? (
        // User has a currently reading book
        <>
          <div className="current-read-content">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={`Cover of ${book.title}`}
                className="current-read-cover"
              />
            ) : (
              <div className="current-read-placeholder">
                <span>📖</span>
              </div>
            )}

            <div className="current-read-info">
              <h2>{book.title}</h2>
              <p>{book.author || 'Unknown author'}</p>
              <p>Currently Reading</p>
            </div>
          </div>

          <button
            type="button"
            className="current-read-button"
            onClick={onContinueReading}
          >
            Continue Reading
          </button>
        </>
      ) : (
        // User hasn't selected a book yet
        <>
          <div className="current-read-content">
            <div className="current-read-placeholder">
              <span>+</span>
            </div>

            <div className="current-read-info">
              <h2>You haven't picked a book yet</h2>
              <p>
                Choose your first read and we'll keep it right here.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="current-read-button"
            onClick={onPickBook}
          >
            Pick my first book
          </button>
        </>
      )}
    </section>
  )
}

export default CurrentReadCard