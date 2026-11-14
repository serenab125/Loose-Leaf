import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
  addBookPageReaction,
  fetchBookPageReactions,
} from '../../services/pageReactionService';
import './BookDetail.css';
import BookReviews from '../../components/Reviews/BookReviews';
import EditReview from '../../components/Reviews/EditReview';
import { saveBookReview, deleteBookReview } from '../../services/reviewService';
import ReviewModal from '../../components/Reviews/ReviewModal';



export default function BookDetail({ book, user, onBack, onUpdateStatus }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('Currently Reading');
  const [activeTab, setActiveTab] = useState('reviews');
  const [analysisMode, setAnalysisMode] = useState('analytical');
  const [sortOrder, setSortOrder] = useState('highest');

  // Chapter Reaction Modal state (RR-06)
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [reactionChapter, setReactionChapter] = useState('1');
  const [reactionText, setReactionText] = useState('');
  const [reactionError, setReactionError] = useState('');
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);

  // Reactions & Reading Position state (RR-07 & RR-08)
  const [allBookReactions, setAllBookReactions] = useState([]);
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [reactionsLoadError, setReactionsLoadError] = useState('');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState('all');

  // Reviews state (populated strictly from Supabase)
  const [reviewsList, setReviewsList] = useState([]);
  const [editingReview, setEditingReview] = useState(null);
  const [deletingReview, setDeletingReview] = useState(null);
  const [creatingReview, setCreatingReview] = useState(false);

  const coverUrl = book?.coverUrl || book?.cover || book?.cover_url;
  const resolvedBookId = String(
    book?.bookId || book?.id || book?.open_library_id || book?.title || ''
  ).trim();
  const resolvedBookTitle = String(book?.title || 'Untitled Book').trim();

  // RR-08: Determine the highest chapter the current user has reached/reacted on
  const userReactionsForBook = allBookReactions.filter(
    (row) => row.userId === user?.id
  );
  const maxUnlockedChapter = userReactionsForBook.reduce(
    (max, row) => Math.max(max, Number(row.chapterNumber) || 0),
    0
  );

  // RR-08: Only reactions at or before user's reading progress are visible
  const unlockedReactions =
    !reactionsLoadError && maxUnlockedChapter > 0
      ? allBookReactions.filter(
          (row) => Number(row.chapterNumber) <= maxUnlockedChapter
        )
      : [];

  // Count of reactions beyond user's current reading progress (hidden spoilers)
  const hiddenSpoilerCount =
    !reactionsLoadError && maxUnlockedChapter > 0
      ? allBookReactions.filter(
          (row) => Number(row.chapterNumber) > maxUnlockedChapter
        ).length
      : 0;

  // RR-07: Available chapters up to user's progress
  const availableChapters = Array.from(
    new Set(unlockedReactions.map((r) => Number(r.chapterNumber)))
  ).sort((a, b) => a - b);

  // RR-07: Filter unlocked reactions by selected chapter
  const displayedReactions =
    selectedChapterFilter === 'all'
      ? unlockedReactions
      : unlockedReactions.filter(
          (r) => Number(r.chapterNumber) === Number(selectedChapterFilter)
        );

  // Load saved reactions and reviews for this book from Supabase
  useEffect(() => {
    if (!resolvedBookId) return;
    let cancelled = false;

    async function loadCommunityData() {
      setReactionsLoading(true);
      setReactionsLoadError('');

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
            chapterNumber: Number(row.page_number),
            text: row.reaction,
          }));
          setAllBookReactions(formatted);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Could not load chapter reactions:', err);
          setAllBookReactions([]);
          setReactionsLoadError(
            'Unable to retrieve reading progress and reactions right now. Potential spoilers remain hidden.'
          );
        }
      } finally {
        if (!cancelled) {
          setReactionsLoading(false);
        }
      }

      try {
        const { data: dbReviews, error } = await supabase
          .from('book_reviews')
          .select('*')
          .eq('book_id', resolvedBookId)
          .order('created_at', { ascending: false });

        if (!cancelled && !error) {
          const reviewerIds = [...new Set(
            (dbReviews || []).map((row) => row.user_id)
          )];
          
          const { data: reviewerProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', reviewerIds);
          
          if (profilesError) {
            console.warn('Could not load reviewer names:', profilesError);
          }
          
          const namesById = new Map(
            (reviewerProfiles || []).map((profile) => [
              profile.id,
              profile.full_name,
            ])
          );
          
          const formattedReviews = (dbReviews || []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            authorName:
  row.user_id === user?.id
    ? 'You'
    : namesById.get(row.user_id) || 'Reader',
            rating: row.rating_out_of_10 / 2,
            ratingOutOf10: row.rating_out_of_10,
            text: row.review_text,
            classification: row.review_type ?? row.classification ?? 'Analytical',
            includesSpoilers: row.includes_spoilers ?? false,
          }));

          setReviewsList(formattedReviews);
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

  // RR-06: Validate and submit chapter reaction
  const handleAddReaction = async (e) => {
    e.preventDefault();
    if (isSubmittingReaction) return;

    const trimmedText = reactionText.trim();
    const parsedChapter = Number(reactionChapter);

    // AC 2: Explicit validation message for empty/whitespace-only reactions
    if (!trimmedText) {
      setReactionError('Please enter a reaction before posting.');
      return;
    }

    if (trimmedText.length > 300) {
      setReactionError('Reaction must be 300 characters or fewer.');
      return;
    }

    if (!Number.isInteger(parsedChapter) || parsedChapter < 1) {
      setReactionError('Please enter a valid chapter number (1 or higher).');
      return;
    }

    setReactionError('');
    setIsSubmittingReaction(true);

    try {
      const savedRow = await addBookPageReaction({
        bookId: resolvedBookId,
        bookTitle: resolvedBookTitle,
        chapterNumber: parsedChapter,
        reaction: trimmedText,
      });

      const newReaction = {
        id: savedRow?.id || Date.now(),
        userId: user?.id,
        reviewer: 'You',
        chapterNumber: Number(savedRow?.page_number ?? parsedChapter),
        text: savedRow?.reaction ?? trimmedText,
      };

      setAllBookReactions((prev) => [newReaction, ...prev]);
      setSelectedChapterFilter('all');
      setReactionText('');
      setShowReactionModal(false);
      setActiveTab('reactions');
    } catch (err) {
      // AC 3: Preserve entered reaction text when saving fails
      console.error('Failed to save chapter reaction:', err);
      setReactionError(
        err.message || 'Could not save reaction. Your text has been preserved.'
      );
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  return (
    <main
  className={`book-detail-page ${
    editingReview || creatingReview ? 'book-detail-editing' : ''
  }`}
>
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
            <div className="book-detail-no-cover">{resolvedBookTitle}</div>
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
                onClick={() =>
                  handleSelectStatusOption('Remove Book From Shelf')
                }
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
  editingReview || creatingReview ? (
    <EditReview
    key={editingReview?.id ?? 'new-review'}
    review={editingReview}
    onBack={() => {
      setEditingReview(null);
      setCreatingReview(false);
    }}
      onSave={async (updatedReview) => {
        try {
          await saveBookReview({
            bookId: resolvedBookId,
            bookTitle: book?.title,
            reviewText: updatedReview.text,
            ratingOutOf10: updatedReview.ratingOutOf10,
            classification: updatedReview.classification,
            includesSpoilers: updatedReview.includesSpoilers,
          });

          setReviewsList((previous) => {
            if (editingReview) {
              return previous.map((review) =>
                review.id === updatedReview.id ? updatedReview : review
              );
            }
          
            return [
              {
                ...updatedReview,
                id: crypto.randomUUID(),
                userId: user?.id,
                authorName: 'You',
              },
              ...previous,
            ];
          });

          setEditingReview(null);
setCreatingReview(false);
        } catch (error) {
          console.error('Could not save review:', error);
          alert('Could not save your review. Please try again.');
        }
      }}
    />
  ) : (

    <>



      <BookReviews
        reviews={reviewsList}
        currentUserId={user?.id}
        onEdit={(review) => setEditingReview(review)}
        onDelete={(review) => setDeletingReview(review)}
      />

      {deletingReview && (
        <ReviewModal
          review={deletingReview}
          mode="delete"
          onClose={() => setDeletingReview(null)}
          onDelete={async (review) => {
            try {
              await deleteBookReview(resolvedBookId);

              setReviewsList((previous) =>
                previous.filter((item) => item.id !== review.id)
              );

              setDeletingReview(null);
            } catch (error) {
              console.error('Could not delete review:', error);
              alert('Could not delete your review. Please try again.');
            }
          }}
        />
      )}
    </>
  )

        ) : reactionsLoading ? (
          <p style={{ textAlign: 'center', color: '#8c7365', fontSize: '14px' }}>
            Loading reactions...
          </p>
        ) : reactionsLoadError ? (
          /* RR-07 AC 3 & RR-08 AC 3: Error state keeping spoilers hidden */
          <div className="reactions-locked-card" role="alert">
            <div className="reactions-lock-icon" aria-hidden="true">
              ⚠️
            </div>
            <h3 className="reactions-locked-title">Reactions unavailable</h3>
            <p className="reactions-locked-text">{reactionsLoadError}</p>
          </div>
        ) : maxUnlockedChapter === 0 ? (
          /* RR-08 AC 2: Locked state until user establishes a reading position */
          <div className="reactions-locked-card">
            <div className="reactions-lock-icon" aria-hidden="true">
              🔒
            </div>
            <h3 className="reactions-locked-title">Reactions are locked</h3>
            <p className="reactions-locked-text">
              Log a chapter reaction to set your reading position and unlock spoiler-free reactions up to that chapter.
            </p>
            <button
              type="button"
              className="reactions-unlock-btn"
              onClick={() => {
                setReactionError('');
                setShowReactionModal(true);
              }}
            >
              Add a Chapter Reaction
            </button>
          </div>
        ) : (
          /* RR-07 & RR-08 AC 1: Unlocked reactions organized by chapter */
          <div>
            {/* Chapter Filter Pills */}
            <div
              className="sort-pills-row"
              style={{ flexWrap: 'wrap', marginBottom: '14px' }}
            >
              <button
                type="button"
                className={`sort-pill-btn ${selectedChapterFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedChapterFilter('all')}
              >
                All Unlocked (Up to Chapter {maxUnlockedChapter})
              </button>
              {availableChapters.map((chapterNum) => (
                <button
                  key={chapterNum}
                  type="button"
                  className={`sort-pill-btn ${Number(selectedChapterFilter) === chapterNum ? 'active' : ''}`}
                  onClick={() => setSelectedChapterFilter(chapterNum)}
                >
                  Chapter {chapterNum}
                </button>
              ))}
            </div>

            {/* RR-07 AC 2: Empty-state message if selected chapter has no reactions */}
            {displayedReactions.length === 0 ? (
              <div className="reactions-locked-card">
                <p className="reactions-locked-text" style={{ margin: 0 }}>
                  No reactions posted at Chapter {selectedChapterFilter} yet.
                </p>
              </div>
            ) : (
              <div className="cards-list">
                {displayedReactions.map((react) => (
                  <article key={react.id} className="review-card">
                    <span className="reaction-chapter-badge">
                      Chapter {react.chapterNumber}
                    </span>
                    <div className="review-card-header">
                      <div className="reviewer-profile">
                        <div className="reviewer-avatar">
                          {react.reviewer.charAt(0)}
                        </div>
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

            {/* RR-08: Spoiler-hidden notice for restricted reactions beyond user progress */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                borderRadius: '14px',
                backgroundColor: '#f7f1e5',
                textAlign: 'center',
                fontSize: '12px',
                color: '#8c7365',
              }}
            >
              {hiddenSpoilerCount > 0
                ? `🔒 ${hiddenSpoilerCount} reaction${hiddenSpoilerCount === 1 ? '' : 's'} beyond Chapter ${maxUnlockedChapter} hidden to prevent spoilers.`
                : `🔒 Reactions beyond Chapter ${maxUnlockedChapter} are hidden until you update your progress.`}
            </div>
          </div>
        )}
      </section>

      {/* Chapter Reaction Modal (RR-06) */}
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
            <h3 className="modal-title">What chapter are you reacting to?</h3>
            <form onSubmit={handleAddReaction} noValidate>
              <div className="chapter-selector">
                <input
                  type="number"
                  className="chapter-input"
                  value={reactionChapter}
                  onChange={(e) => setReactionChapter(e.target.value)}
                  min="1"
                  aria-label="Chapter number"
                />
              </div>
              <textarea
                className="reaction-textarea"
                placeholder="Write a reaction (max 300 characters)..."
                value={reactionText}
                onChange={(e) => {
                  setReactionText(e.target.value);
                  if (reactionError) setReactionError('');
                }}
                maxLength={300}
              />
              <p className="reaction-char-count">{reactionText.length}/300</p>
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
                {isSubmittingReaction ? 'Saving...' : 'Post'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}