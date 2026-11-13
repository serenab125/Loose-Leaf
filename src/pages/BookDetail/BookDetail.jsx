import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
  addBookPageReaction,
  fetchBookPageReactions,
} from '../../services/pageReactionService';
import './BookDetail.css';

const DEFAULT_REVIEWS = [
  {
    id: 1,
    reviewer: 'Maya R.',
    match: 92,
    rating: 5,
    text: 'Katniss is one of the most compelling YA narrators I have ever read. The pacing of the Games themselves is relentless—I finished this in two sittings!',
  },
  {
    id: 2,
    reviewer: 'Jordan T.',
    match: 87,
    rating: 4,
    text: 'A sharp critique of spectacle culture wrapped in a survival story. The arena scenes are brutal and brilliant.',
  },
];

export default function BookDetail({ book, user, onBack, onUpdateStatus }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('Currently Reading');
  const [activeTab, setActiveTab] = useState('reviews');
  const [analysisMode, setAnalysisMode] = useState('analytical');
  const [sortOrder, setSortOrder] = useState('highest');

  // Page Reaction Modal state
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [reactionPage, setReactionPage] = useState('1');
  const [reactionText, setReactionText] = useState('');
  const [reactionError, setReactionError] = useState('');
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);

  const [allBookReactions, setAllBookReactions] = useState([]);
  const [reviewsList, setReviewsList] = useState(DEFAULT_REVIEWS);

  const coverUrl = book?.coverUrl || book?.cover || book?.cover_url;
  const resolvedBookId = String(
    book?.bookId || book?.id || book?.open_library_id || book?.title || ''
  ).trim();
  const resolvedBookTitle = String(book?.title || 'Untitled Book').trim();

  // Determine the highest page the current user has reacted to for this book
  const userReactionsForBook = allBookReactions.filter(
    (row) => row.userId === user?.id
  );
  const maxUnlockedPage = userReactionsForBook.reduce(
    (max, row) => Math.max(max, Number(row.pageNumber) || 0),
    0
  );

  // Only show reactions up to the page the user has reached/reacted on
  const unlockedReactions =
    maxUnlockedPage > 0
      ? allBookReactions.filter(
          (row) => Number(row.pageNumber) <= maxUnlockedPage
        )
      : [];

  // Load saved reactions and reviews for this book from Supabase
  useEffect(() => {
    if (!resolvedBookId) return;
    let cancelled = false;

    async function loadCommunityData() {
      try {
        const dbReactions = await fetchBookPageReactions(resolvedBookId);
        if (!cancelled) {
          const formatted = dbReactions.map((row) => ({
            id: row.id,
            userId: row.user_id,
            reviewer:
              row.user_id === user?.id
                ? 'You'
                : row.reviewer_name || 'Reader',
            pageNumber: Number(row.page_number),
            text: row.reaction,
          }));
          setAllBookReactions(formatted);
        }
      } catch (err) {
        console.warn('Could not load page reactions:', err);
      }

      try {
        const { data: dbReviews, error } = await supabase
          .from('book_reviews')
          .select('*')
          .eq('book_id', resolvedBookId)
          .order('created_at', { ascending: false });

        if (!cancelled && !error && dbReviews?.length > 0) {
          const formattedReviews = dbReviews.map((row) => ({
            id: row.id,
            reviewer:
              row.user_id === user?.id
                ? 'You'
                : row.reviewer_name || 'Reader',
            match: row.user_id === user?.id ? 100 : 90,
            rating: Math.max(1, Math.min(5, Math.round((row.rating_out_of_10 || 8) / 2))),
            text: row.review_text,
          }));
          setReviewsList([...formattedReviews, ...DEFAULT_REVIEWS]);
        }
      } catch (err) {
        console.warn('Could not load book reviews:', err);
      }
    }

    loadCommunityData();
    return () => {
      cancelled = true;
    };
  }, [resolvedBookId, user?.id]);

  const handleSelectStatusOption = (option) => {
    setShowDropdown(false);
    if (option === 'Progress Update') {
      setReactionError('');
      setShowReactionModal(true);
    } else {
      setCurrentStatus(option);
      onUpdateStatus?.(book, option);
    }
  };

  const handleAddReaction = async (e) => {
    e.preventDefault();
    if (isSubmittingReaction) return;

    setReactionError('');
    setIsSubmittingReaction(true);

    try {
      const savedRow = await addBookPageReaction({
        bookId: resolvedBookId,
        bookTitle: resolvedBookTitle,
        pageNumber: Number(reactionPage),
        reaction: reactionText.trim(),
      });

      const newReaction = {
        id: savedRow?.id || Date.now(),
        userId: user?.id,
        reviewer: 'You',
        pageNumber: Number(savedRow?.page_number ?? reactionPage),
        text: savedRow?.reaction ?? reactionText.trim(),
      };

      setAllBookReactions((prev) => [newReaction, ...prev]);
      setReactionText('');
      setShowReactionModal(false);
      setActiveTab('reactions');
    } catch (err) {
      console.error('Failed to save page reaction:', err);
      setReactionError(err.message || 'Could not save reaction.');
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  return (
    <main className="book-detail-page">
      {/* Top Header Navigation */}
      <header className="book-detail-header">
        <button type="button" className="book-detail-back-btn" onClick={onBack}>
          ← Back
        </button>
      </header>

      {/* Hero / Book Information */}
      <section className="book-detail-hero">
        <div className="book-detail-cover-wrapper">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`Cover of ${resolvedBookTitle}`}
              className="book-detail-cover"
            />
          ) : (
            <div className="book-detail-no-cover">
              {resolvedBookTitle}
            </div>
          )}
        </div>

        <h1 className="book-detail-title">{resolvedBookTitle}</h1>
        <p className="book-detail-author">
          {book?.author ? `by ${book.author}` : 'Suzanne Collins'}
        </p>

        {/* Status Dropdown */}
        <div className="status-dropdown-container">
          <button
            type="button"
            className="status-dropdown-btn"
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            {currentStatus} ▾
          </button>

          {showDropdown && (
            <div className="status-dropdown-menu">
              <button
                type="button"
                className="status-dropdown-item"
                onClick={() => handleSelectStatusOption('Currently Reading')}
              >
                Currently Reading
              </button>
              <button
                type="button"
                className="status-dropdown-item"
                onClick={() => handleSelectStatusOption('Progress Update')}
              >
                Progress Update
              </button>
              <button
                type="button"
                className="status-dropdown-item"
                onClick={() => handleSelectStatusOption('Finished')}
              >
                Finished
              </button>
              <button
                type="button"
                className="status-dropdown-item"
                onClick={() => handleSelectStatusOption('Did Not Finish')}
              >
                Did Not Finish
              </button>
              <button
                type="button"
                className="status-dropdown-item"
                onClick={() => handleSelectStatusOption('Create a New Shelf')}
              >
                Create a New Shelf
              </button>
              <button
                type="button"
                className="status-dropdown-item danger"
                onClick={() => handleSelectStatusOption('Remove Book From Shelf')}
              >
                Remove Book From Shelf
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Book Synopsis Overview */}
      <section className="book-overview-section">
        <h2 className="book-section-heading">Overview</h2>
        <p className="book-overview-text">
          {book?.description ||
            `Set in a dystopian future where twelve districts are forced to send tributes to compete in a televised battle to the death. Katniss Everdeen steps up to take her younger sister's place, relying on her sharp survival instincts.`}
        </p>
      </section>

      {/* Community Reviews & Reactions Tabs */}
      <section className="book-community-section">
        <div className="book-community-tabs">
          <button
            type="button"
            className={`book-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews
          </button>
          <button
            type="button"
            className={`book-tab-btn ${activeTab === 'reactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('reactions')}
          >
            Reactions
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'reviews' ? (
          <>
            {/* Filter Controls (Reviews tab only) */}
            <div className="community-filter-row">
              <div className="mode-toggle-group">
                <span className="mode-toggle-label">Perspective</span>
                <div className="toggle-switch-pill">
                  <button
                    type="button"
                    className={`toggle-option ${analysisMode === 'analytical' ? 'active' : ''}`}
                    onClick={() => setAnalysisMode('analytical')}
                  >
                    Analytical
                  </button>
                  <button
                    type="button"
                    className={`toggle-option ${analysisMode === 'casual' ? 'active' : ''}`}
                    onClick={() => setAnalysisMode('casual')}
                  >
                    Casual
                  </button>
                </div>
              </div>

              <div className="sort-pills-row">
                <button
                  type="button"
                  className={`sort-pill-btn ${sortOrder === 'highest' ? 'active' : ''}`}
                  onClick={() => setSortOrder('highest')}
                >
                  Highest to Lowest
                </button>
                <button
                  type="button"
                  className={`sort-pill-btn ${sortOrder === 'lowest' ? 'active' : ''}`}
                  onClick={() => setSortOrder('lowest')}
                >
                  Lowest to Highest
                </button>
              </div>
            </div>

            <div className="cards-list">
              {reviewsList.map((rev) => (
                <article key={rev.id} className="review-card">
                  <div className="review-card-header">
                    <div className="reviewer-profile">
                      <div className="reviewer-avatar">{rev.reviewer.charAt(0)}</div>
                      <div>
                        <h4 className="reviewer-name">{rev.reviewer}</h4>
                        <span className="reviewer-match">{rev.match}% Match</span>
                      </div>
                    </div>
                    <div className="star-rating">{'★'.repeat(rev.rating)}</div>
                  </div>
                  <p className="review-text">{rev.text}</p>
                </article>
              ))}
            </div>
          </>
        ) : unlockedReactions.length === 0 ? (
          /* Locked State: No reactions shown until the user logs a page reaction */
          <div className="reactions-locked-card">
            <div className="reactions-lock-icon" aria-hidden="true">
              🔒
            </div>
            <h3 className="reactions-locked-title">Reactions are locked</h3>
            <p className="reactions-locked-text">
              Log a page reaction to unlock spoiler-free reactions up to the page you've reached.
            </p>
            <button
              type="button"
              className="reactions-unlock-btn"
              onClick={() => {
                setReactionError('');
                setShowReactionModal(true);
              }}
            >
              Add a Page Reaction
            </button>
          </div>
        ) : (
          <div className="cards-list">
            {unlockedReactions.map((react) => (
              <article key={react.id} className="review-card">
                <span className="reaction-chapter-badge">Page {react.pageNumber}</span>
                <div className="review-card-header">
                  <div className="reviewer-profile">
                    <div className="reviewer-avatar">{react.reviewer.charAt(0)}</div>
                    <div>
                      <h4 className="reviewer-name">{react.reviewer}</h4>
                    </div>
                  </div>
                </div>
                <p className="review-text">{react.text}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Page Reaction Modal */}
      {showReactionModal && (
        <div className="reaction-modal-overlay">
          <div className="reaction-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="modal-back-btn"
              onClick={() => setShowReactionModal(false)}
            >
              ← Back to Book
            </button>
            <h3 className="modal-title">What page are you reacting to?</h3>
            <form onSubmit={handleAddReaction}>
              <div className="chapter-selector">
                <input
                  type="number"
                  className="chapter-input"
                  value={reactionPage}
                  onChange={(e) => setReactionPage(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <textarea
                className="reaction-textarea"
                placeholder="Write a reaction (max 100 characters)..."
                value={reactionText}
                onChange={(e) => setReactionText(e.target.value)}
                maxLength={100}
                required
              />
              <p className="reaction-char-count">
                {reactionText.length}/100
              </p>
              {reactionError && (
                <p className="reaction-error-msg" role="alert">
                  {reactionError}
                </p>
              )}
              <button
                type="submit"
                className="modal-submit-btn"
                disabled={isSubmittingReaction}
              >
                {isSubmittingReaction ? 'Saving...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}