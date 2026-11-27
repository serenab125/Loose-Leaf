import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
  addBookPageReaction,
  fetchBookPageReactions,
  updateBookPageReaction,
  deleteBookPageReaction,
} from '../../services/pageReactionService';
import {
  cleanBookOverview,
  fetchBookOverview,
} from '../../services/bookService';
import {
  saveBookReview,
  deleteBookReview,
} from '../../services/reviewService';
import {
  fetchUserShelvesWithBooks,
  createShelf,
  addBookToShelf,
  removeBookFromShelf,
  syncBookToStatusShelf,
  STATUS_SHELF_MAP,
} from '../../services/shelfService';
import {
  saveBookStatus,
  removeSavedBook,
  fetchSavedBook,
  clearOtherCurrentReads,
  STATUS_LABELS,
} from '../../services/savedBookService';
import BookReviews from '../../components/Reviews/BookReviews';
import EditReview from '../../components/Reviews/EditReview';
import ReviewModal from '../../components/Reviews/ReviewModal';
import ReviewForm from '../../reviews/ReviewForm';

import './BookDetail.css';

const SHELF_NAME_SUGGESTIONS = [
  'Comfort Reads',
  'Owned',
  'Read Soon',
  'Buddy Reads',
  'Book Club',
];

/** Rough rendered height of the status menu, used to decide if it fits below. */
const STATUS_MENU_HEIGHT = 440;

export default function BookDetail({ book, user, onBack, onUpdateStatus }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuAbove, setMenuAbove] = useState(false);
  const statusMenuRef = useRef(null);
  const [currentStatus, setCurrentStatus] = useState('Set Status');
  const [activeTab, setActiveTab] = useState('reviews');

  // Chapter Reaction Modal state (RR-06 + Edit/Delete)
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [editingReaction, setEditingReaction] = useState(null);
  const [deletingReaction, setDeletingReaction] = useState(null);
  const [isDeletingReaction, setIsDeletingReaction] = useState(false);
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
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  // Book Synopsis / Overview state
  const [bookOverview, setBookOverview] = useState(() =>
    cleanBookOverview(book?.description)
  );
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Saved reading status + shelf actions
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [userShelves, setUserShelves] = useState([]);
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [shelfName, setShelfName] = useState('');
  const [shelfError, setShelfError] = useState('');
  const [shelfSaving, setShelfSaving] = useState(false);
  const [addBookToNewShelf, setAddBookToNewShelf] = useState(true);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showAddToShelfModal, setShowAddToShelfModal] = useState(false);
  const [selectedShelves, setSelectedShelves] = useState(() => new Set());

  const coverUrl = book?.coverUrl || book?.cover || book?.cover_url;
  const resolvedBookId = String(
    book?.bookId || book?.id || book?.open_library_id || book?.title || ''
  ).trim();
  const resolvedBookTitle = String(book?.title || 'Untitled Book').trim();

  // Fetch missing book overview/description automatically
  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      const existingDescription = cleanBookOverview(book?.description);
      setBookOverview(existingDescription);
      setOverviewLoading(!existingDescription);

      try {
        const overview = await fetchBookOverview(book);
        if (!cancelled) setBookOverview(overview);
      } catch (error) {
        console.warn('Could not load the book overview:', error);
        if (!cancelled) setBookOverview('');
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [book]);

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
          const reviewerIds = [
            ...new Set((dbReviews || []).map((row) => row.user_id)),
          ];

          const { data: reviewerProfiles, error: profilesError } =
            await supabase
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
            classification:
              row.review_type ?? row.classification ?? 'Analytical',
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

  // Load the saved reading status and the user's shelves for this book.
  useEffect(() => {
    if (!user?.id || !resolvedBookId) return;
    let cancelled = false;

    async function loadSavedState() {
      try {
        const row = await fetchSavedBook(user.id, resolvedBookId);
        if (!cancelled && row?.reading_status) {
          setCurrentStatus(STATUS_LABELS[row.reading_status] || 'Set Status');
        }
      } catch (err) {
        console.warn('Could not load saved reading status:', err);
      }

      try {
        const shelves = await fetchUserShelvesWithBooks(user.id);
        if (!cancelled) setUserShelves(shelves);
      } catch (err) {
        console.warn('Could not load shelves:', err);
      }
    }

    loadSavedState();
    return () => {
      cancelled = true;
    };
  }, [user?.id, resolvedBookId]);

  // Open the status menu, flipping it above the trigger when it would
  // otherwise run off the bottom of the screen.
  const toggleStatusDropdown = () => {
    if (!showDropdown && statusMenuRef.current) {
      const trigger = statusMenuRef.current.querySelector(
        '.status-dropdown-btn'
      );
      const rect = trigger?.getBoundingClientRect();
      if (rect) {
        setMenuAbove(window.innerHeight - rect.bottom < STATUS_MENU_HEIGHT);
      }
    }
    setShowDropdown((prev) => !prev);
  };

  // Close the menu when the user clicks anywhere outside it.
  useEffect(() => {
    if (!showDropdown) return;

    const handlePointerDown = (event) => {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showDropdown]);

  const openCreateReactionModal = () => {
    setEditingReaction(null);
    setReactionChapter(
      maxUnlockedChapter > 0 ? String(maxUnlockedChapter) : '1'
    );
    setReactionText('');
    setReactionError('');
    setShowReactionModal(true);
  };

  const openEditReactionModal = (reaction) => {
    setEditingReaction(reaction);
    setReactionChapter(String(reaction.chapterNumber));
    setReactionText(reaction.text);
    setReactionError('');
    setShowReactionModal(true);
  };

  const closeReactionModal = () => {
    if (isSubmittingReaction) return;
    setShowReactionModal(false);
    setEditingReaction(null);
    setReactionError('');
  };

  const handleSelectStatusOption = async (option) => {
    setShowDropdown(false);
    setStatusError('');
    setStatusMessage('');

    if (option === 'Progress Update') {
      openCreateReactionModal();
      return;
    }

    if (option === 'Add to a Shelf') {
      setSelectedShelves(new Set());
      setShowAddToShelfModal(true);
      return;
    }

    if (option === 'Create a New Shelf') {
      setShelfName('');
      setShelfError('');
      setAddBookToNewShelf(true);
      setShowShelfModal(true);
      return;
    }

    if (option === 'Remove Book From Shelf') {
      setSelectedShelves(new Set());
      setShowRemoveModal(true);
      return;
    }

    // Currently Reading / Finished / Did Not Finish
    setStatusSaving(true);
    try {
      let evicted = [];

      // Only one book can hold the "current read" slot. Hand it over first:
      // the previous holder loses its status and leaves the Current Reads
      // shelf, otherwise saving this book as currently reading violates the
      // one_current_read_per_user unique index and the whole save fails.
      let evicted = [];
      if (option === 'Currently Reading' && user?.id) {
        evicted = await clearOtherCurrentReads(user.id, resolvedBookId);

        if (evicted.length > 0) {
          const shelves = await fetchUserShelvesWithBooks(user.id);
          const currentReads = shelves.find(
            (shelf) => shelf.name === 'Current Reads'
          );

          if (currentReads) {
            await Promise.all(
              evicted.map((evictedBook) =>
                removeBookFromShelf(
                  user.id,
                  currentReads.id,
                  evictedBook.bookId
                )
              )
            );
          }
        }
      }

      await saveBookStatus({
        userId: user?.id,
        bookId: resolvedBookId,
        title: resolvedBookTitle,
        author: book?.author,
        coverUrl,
        status: option,
      });

      // A reading status also files the book on the matching default shelf
      // and removes it from the other status shelves. Best-effort: the
      // status itself is already saved if this fails.
      let shelfSuffix = '';
      try {
        const result = await syncBookToStatusShelf({
          userId: user?.id,
          bookId: resolvedBookId,
          title: resolvedBookTitle,
          author: book?.author,
          coverUrl,
          status: option,
        });

        if (result && user?.id) {
          setUserShelves(await fetchUserShelvesWithBooks(user.id));
        }

        const shelfName = STATUS_SHELF_MAP[option];
        shelfSuffix =
          result === 'moved'
            ? ` Moved to the ${shelfName} shelf.`
            : result === 'unchanged'
              ? ` Already on the ${shelfName} shelf.`
              : '';
      } catch (shelfErr) {
        console.error('Could not sync the status shelf:', shelfErr);
      }

      const evictedNote = evicted.length
        ? ` ${evicted.map((b) => b.title).join(', ')} ` +
          `${evicted.length === 1 ? 'is' : 'are'} no longer your current read.`
        : '';

      setCurrentStatus(option);
      onUpdateStatus?.(book, option);
      setStatusMessage(`Saved — ${option}.${shelfSuffix}${evictedNote}`);
      setTimeout(() => setStatusMessage(''), 3000);

      // Ask instead of forcing: marking a book Finished opens a prompt, and
      // the review form only opens when the user chooses to write one.
      if (option === 'Finished') {
        setShowReviewPrompt(true);
      }
    } catch (err) {
      console.error('Failed to save reading status:', err);
      setStatusError(
        err?.message?.includes('saved_books_reading_status_check')
          ? 'This reading status is not allowed by the database yet — apply the migration in src/supabase/migrations.'
          : err.message || 'Could not save your reading status.'
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const handleCreateShelfAndAdd = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    const name = shelfName.trim();
    if (!name) {
      setShelfError('Shelf name is required.');
      return;
    }

    const shouldAddBook = addBookToNewShelf;

    setShelfSaving(true);
    setShelfError('');
    try {
      const created = await createShelf(user.id, name);
      if (!created) throw new Error('Could not create the shelf.');

      let nextShelves = [
        ...userShelves,
        { ...created, books: [], bookCount: 0 },
      ];

      if (shouldAddBook) {
        await addBookToShelf(
          user.id,
          created.id,
          resolvedBookId,
          resolvedBookTitle,
          book?.author,
          coverUrl
        );
        nextShelves = nextShelves.map((shelf) =>
          shelf.id === created.id
            ? {
                ...shelf,
                books: [
                  {
                    book_id: resolvedBookId,
                    title: resolvedBookTitle,
                    author: book?.author,
                    cover_url: coverUrl,
                  },
                ],
                bookCount: 1,
              }
            : shelf
        );
      }

      setUserShelves(nextShelves);
      setShowShelfModal(false);
      setShelfName('');
      setAddBookToNewShelf(true);
      setStatusMessage(
        shouldAddBook
          ? `Added to "${created.name}".`
          : `Shelf "${created.name}" created.`
      );
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      console.error('Failed to create shelf:', err);
      setShelfError(err.message || 'Could not create the shelf.');
    } finally {
      setShelfSaving(false);
    }
  };

  const shelvesWithBook = userShelves.filter((shelf) =>
    (shelf.books || []).some((b) => (b.book_id || b.id) === resolvedBookId)
  );

  const shelvesWithoutBook = userShelves.filter(
    (shelf) =>
      !(shelf.books || []).some((b) => (b.book_id || b.id) === resolvedBookId)
  );

  const toggleShelfSelection = (shelfId) => {
    setSelectedShelves((prev) => {
      const next = new Set(prev);
      if (next.has(shelfId)) next.delete(shelfId);
      else next.add(shelfId);
      return next;
    });
  };

  const handleConfirmRemove = async () => {
    if (!user?.id || selectedShelves.size === 0) return;

    setStatusSaving(true);
    setStatusError('');
    try {
      await Promise.all(
        [...selectedShelves].map((shelfId) =>
          removeBookFromShelf(user.id, shelfId, resolvedBookId)
        )
      );

      const anyShelfKeepsBook = userShelves.some(
        (shelf) =>
          !selectedShelves.has(shelf.id) &&
          (shelf.books || []).some(
            (b) => (b.book_id || b.id) === resolvedBookId
          )
      );

      if (!anyShelfKeepsBook) {
        await removeSavedBook(user.id, resolvedBookId);
        setCurrentStatus('Not Saved');
        onUpdateStatus?.(book, 'Not Saved');
      }

      setUserShelves((prev) =>
        prev.map((shelf) => ({
          ...shelf,
          books: (shelf.books || []).filter(
            (b) => (b.book_id || b.id) !== resolvedBookId
          ),
          bookCount: (shelf.books || []).filter(
            (b) => (b.book_id || b.id) !== resolvedBookId
          ).length,
        }))
      );

      setSelectedShelves(new Set());
      setShowRemoveModal(false);
      setStatusMessage('Removed from your shelves.');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      console.error('Failed to remove book from shelves:', err);
      setStatusError(err.message || 'Could not remove the book.');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleConfirmAddToShelves = async () => {
    if (!user?.id || selectedShelves.size === 0) return;

    setStatusSaving(true);
    setStatusError('');
    try {
      await Promise.all(
        [...selectedShelves].map((shelfId) =>
          addBookToShelf(
            user.id,
            shelfId,
            resolvedBookId,
            resolvedBookTitle,
            book?.author,
            coverUrl
          )
        )
      );

      setUserShelves((prev) =>
        prev.map((shelf) =>
          selectedShelves.has(shelf.id)
            ? {
                ...shelf,
                books: [
                  ...(shelf.books || []),
                  {
                    id: resolvedBookId,
                    book_id: resolvedBookId,
                    title: resolvedBookTitle,
                    author: book?.author,
                    cover_url: coverUrl,
                  },
                ],
                bookCount: (shelf.books || []).length + 1,
              }
            : shelf
        )
      );

      const count = selectedShelves.size;
      setSelectedShelves(new Set());
      setShowAddToShelfModal(false);
      setStatusMessage(
        `Added to ${count} ${count === 1 ? 'shelf' : 'shelves'}.`
      );
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      console.error('Failed to add book to shelves:', err);
      setStatusError(err.message || 'Could not add the book to your shelves.');
    } finally {
      setStatusSaving(false);
    }
  };

  // RR-06: Validate and submit (or update) chapter reaction
  const handleSaveReaction = async (e) => {
    e.preventDefault();
    if (isSubmittingReaction) return;

    const trimmedText = reactionText.trim();
    const parsedChapter = Number(reactionChapter);

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
      if (editingReaction) {
        const updatedRow = await updateBookPageReaction({
          reactionId: editingReaction.id,
          chapterNumber: parsedChapter,
          reaction: trimmedText,
        });

        setAllBookReactions((prev) =>
          prev.map((item) =>
            item.id === editingReaction.id
              ? {
                  ...item,
                  chapterNumber: Number(
                    updatedRow?.page_number ?? parsedChapter
                  ),
                  text: updatedRow?.reaction ?? trimmedText,
                }
              : item
          )
        );
        setSelectedChapterFilter('all');
        setEditingReaction(null);
        setReactionText('');
        setShowReactionModal(false);
      } else {
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
      }
    } catch (err) {
      console.error('Failed to save chapter reaction:', err);
      setReactionError(
        err.message || 'Could not save reaction. Your text has been preserved.'
      );
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  const handleConfirmDeleteReaction = async () => {
    if (!deletingReaction || isDeletingReaction) return;

    setIsDeletingReaction(true);
    try {
      await deleteBookPageReaction(deletingReaction.id);

      setAllBookReactions((prev) =>
        prev.filter((item) => item.id !== deletingReaction.id)
      );
      setSelectedChapterFilter('all');
      setDeletingReaction(null);
    } catch (err) {
      console.error('Failed to delete chapter reaction:', err);
      alert(err.message || 'Could not delete your reaction. Please try again.');
    } finally {
      setIsDeletingReaction(false);
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
          {book?.author ? `by ${book.author}` : 'Author unknown'}
        </p>

        {/* Status Dropdown */}
        <div className="status-dropdown-container" ref={statusMenuRef}>
          <button
            type="button"
            className="status-dropdown-btn"
            onClick={toggleStatusDropdown}
            disabled={statusSaving}
          >
            {statusSaving ? 'Saving…' : `${currentStatus} ▾`}
          </button>

          {showDropdown && (
            <div className={`status-dropdown-menu ${menuAbove ? 'above' : ''}`}>
              <button
                type="button"
                className="status-dropdown-item status"
                onClick={() => handleSelectStatusOption('Currently Reading')}
              >
                Currently Reading
              </button>
              <button
                type="button"
                className="status-dropdown-item status"
                onClick={() => handleSelectStatusOption('Progress Update')}
              >
                Progress Update
              </button>
              <button
                type="button"
                className="status-dropdown-item status"
                onClick={() => handleSelectStatusOption('Finished')}
              >
                Finished
              </button>
              <button
                type="button"
                className="status-dropdown-item status"
                onClick={() => handleSelectStatusOption('Did Not Finish')}
              >
                Did Not Finish
              </button>
              <button
                type="button"
                className="status-dropdown-item shelf"
                onClick={() => handleSelectStatusOption('Add to a Shelf')}
              >
                Add to a Shelf
              </button>
              <button
                type="button"
                className="status-dropdown-item shelf"
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

        {(statusError || statusMessage) && (
          <p
            className={statusError ? 'status-error-msg' : 'status-ok-msg'}
            role={statusError ? 'alert' : 'status'}
          >
            {statusError || statusMessage}
          </p>
        )}
      </section>

      {/* Book Synopsis Overview */}
      <section className="book-overview-section">
        <h2 className="book-section-heading">Overview</h2>
        <p className="book-overview-text">
          {overviewLoading
            ? 'Loading overview…'
            : bookOverview ||
              'No overview is currently available from Open Library.'}
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
          creatingReview ? (
            <ReviewForm
              bookId={resolvedBookId}
              onBack={() => setCreatingReview(false)}
              onSubmit={async (review) => {
                const saved = await saveBookReview({
                  bookId: resolvedBookId,
                  bookTitle: resolvedBookTitle,
                  reviewText: review.reviewText,
                  ratingOutOf10: review.rating * 2,
                  classification: review.reviewType,
                  includesSpoilers: review.includesSpoilers,
                });

                const formattedReview = {
                  id: saved.id,
                  userId: user?.id,
                  authorName: 'You',
                  rating: saved.rating_out_of_10 / 2,
                  ratingOutOf10: saved.rating_out_of_10,
                  text: saved.review_text,
                  classification: saved.review_type ?? review.reviewType,
                  includesSpoilers:
                    saved.includes_spoilers ?? review.includesSpoilers,
                };

                setReviewsList((previous) => [
                  formattedReview,
                  ...previous.filter((item) => item.userId !== user?.id),
                ]);

                setCreatingReview(false);
              }}
            />
          ) : editingReview ? (
            <EditReview
              key={editingReview.id}
              review={editingReview}
              onBack={() => setEditingReview(null)}
              onSave={async (updatedReview) => {
                try {
                  await saveBookReview({
                    bookId: resolvedBookId,
                    bookTitle: resolvedBookTitle,
                    reviewText: updatedReview.text,
                    ratingOutOf10: updatedReview.ratingOutOf10,
                    classification:
                      String(updatedReview.classification).toLowerCase() ===
                      'casual'
                        ? 'Casual'
                        : 'Analytical',
                    includesSpoilers: updatedReview.includesSpoilers,
                  });

                  setReviewsList((previous) =>
                    previous.map((item) =>
                      item.id === updatedReview.id ? updatedReview : item
                    )
                  );

                  setEditingReview(null);
                } catch (error) {
                  console.error('Could not update review:', error);
                  alert('Could not update your review. Please try again.');
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
                      console.error('Could not delete your review:', error);
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
              Log a chapter reaction to set your reading position and unlock
              spoiler-free reactions up to that chapter.
            </p>
            <button
              type="button"
              className="reactions-unlock-btn"
              onClick={openCreateReactionModal}
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
                {displayedReactions.map((react) => {
                  const isOwnReaction =
                    user?.id && String(react.userId) === String(user.id);

                  return (
                    <article key={react.id} className="review-card">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span className="reaction-chapter-badge">
                          Chapter {react.chapterNumber}
                        </span>

                        {isOwnReaction && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              alignItems: 'center',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => openEditReactionModal(react)}
                              aria-label={`Edit reaction for Chapter ${react.chapterNumber}`}
                              style={{
                                border: '1px solid #d8c8b6',
                                background: '#fffdf9',
                                color: '#5b4636',
                                borderRadius: '999px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingReaction(react)}
                              aria-label={`Delete reaction for Chapter ${react.chapterNumber}`}
                              style={{
                                border: '1px solid #e6b8b2',
                                background: '#fff6f5',
                                color: '#a33a2b',
                                borderRadius: '999px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

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
                  );
                })}
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

      {/* Chapter Reaction Create / Edit Modal (RR-06) */}
      {showReactionModal && (
        <div className="reaction-modal-overlay" onClick={closeReactionModal}>
          <div
            className="reaction-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-back-btn"
              onClick={closeReactionModal}
              disabled={isSubmittingReaction}
            >
              ← Back to Book
            </button>
            <h3 className="modal-title">
              {editingReaction
                ? 'Edit your chapter reaction'
                : 'What chapter are you reacting to?'}
            </h3>
            <form onSubmit={handleSaveReaction} noValidate>
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
                {isSubmittingReaction
                  ? 'Saving...'
                  : editingReaction
                    ? 'Save Changes'
                    : 'Post'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Reaction Confirmation Sheet */}
      {deletingReaction && (
        <div
          className="sheet-overlay"
          onClick={() => !isDeletingReaction && setDeletingReaction(null)}
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-reaction-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="sheet-title" id="delete-reaction-title">
              Delete reaction?
            </h2>
            <p className="sheet-subtitle">
              Are you sure you want to delete your Chapter{' '}
              {deletingReaction.chapterNumber} reaction? This cannot be undone.
            </p>

            <div className="sheet-actions">
              <button
                type="button"
                className="btn-outline"
                disabled={isDeletingReaction}
                onClick={() => setDeletingReaction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={isDeletingReaction}
                onClick={handleConfirmDeleteReaction}
              >
                {isDeletingReaction ? 'Deleting…' : 'Delete Reaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finished → optional review prompt */}
      {showReviewPrompt && (
        <div className="reaction-modal-overlay">
          <div className="reaction-modal" role="dialog" aria-modal="true">
            <h3 className="modal-title">Write a review?</h3>
            <p className="sheet-subtitle">
              You marked {resolvedBookTitle} as Finished. Would you like to
              share a review?
            </p>
            <div className="sheet-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowReviewPrompt(false)}
              >
                Not now
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowReviewPrompt(false);
                  setActiveTab('reviews');
                  setEditingReview(null);
                  setCreatingReview(true);
                }}
              >
                Write a review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create a New Shelf — Figma bottom sheet */}
      {showShelfModal && (
        <div className="sheet-overlay" onClick={() => setShowShelfModal(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-shelf-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="sheet-title" id="create-shelf-title">
              Create a new shelf
            </h2>
            <p className="sheet-subtitle">
              Make your own shelf to organize this book however you like.
            </p>

            <form onSubmit={handleCreateShelfAndAdd} noValidate>
              <label className="sheet-label" htmlFor="shelf-name">
                Shelf name
              </label>
              <input
                id="shelf-name"
                type="text"
                className="sheet-input"
                value={shelfName}
                onChange={(e) => {
                  setShelfName(e.target.value);
                  if (shelfError) setShelfError('');
                }}
                placeholder="e.g. Cozy Autumn Reads"
                autoFocus
              />

              <div className="chip-row">
                {SHELF_NAME_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="chip"
                    onClick={() => setShelfName(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={addBookToNewShelf}
                  onChange={(e) => setAddBookToNewShelf(e.target.checked)}
                />
                <span>Add {resolvedBookTitle} to this shelf</span>
              </label>

              {shelfError && (
                <p className="sheet-error" role="alert">
                  {shelfError}
                </p>
              )}

              <div className="sheet-actions">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowShelfModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={shelfSaving || !shelfName.trim()}
                >
                  {shelfSaving ? 'Creating…' : 'Create Shelf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to an existing shelf — same sheet layout as remove */}
      {showAddToShelfModal && (
        <div
          className="sheet-overlay"
          onClick={() => setShowAddToShelfModal(false)}
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-to-shelf-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="sheet-title" id="add-to-shelf-title">
              Add to a shelf
            </h2>
            <p className="sheet-subtitle">
              Select the{' '}
              {shelvesWithoutBook.length === 1 ? 'shelf' : 'shelves'} you’d
              like to add {resolvedBookTitle} to.
            </p>

            <div className="shelf-picker-list">
              {shelvesWithoutBook.length === 0 ? (
                <p className="shelf-picker-empty">
                  {userShelves.length === 0
                    ? 'You don’t have any shelves yet. Create one first.'
                    : 'This book is already on all of your shelves.'}
                </p>
              ) : (
                shelvesWithoutBook.map((shelf) => (
                  <label key={shelf.id} className="shelf-picker-row">
                    <input
                      type="checkbox"
                      checked={selectedShelves.has(shelf.id)}
                      onChange={() => toggleShelfSelection(shelf.id)}
                    />
                    <span className="shelf-picker-name">
                      {shelf.name || 'Untitled Shelf'}
                    </span>
                    <span className="shelf-picker-count">
                      {shelf.bookCount ?? (shelf.books || []).length}
                      {(shelf.bookCount ?? (shelf.books || []).length) === 1
                        ? ' book'
                        : ' books'}
                    </span>
                  </label>
                ))
              )}
            </div>

            <p className="sheet-footnote">
              Adding a book to a shelf won’t change its reading status.
            </p>

            <div className="sheet-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowAddToShelfModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={selectedShelves.size === 0 || statusSaving}
                onClick={handleConfirmAddToShelves}
              >
                {statusSaving ? 'Adding…' : 'Add to Shelves'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove from shelf — Figma bottom sheet */}
      {showRemoveModal && (
        <div className="sheet-overlay" onClick={() => setShowRemoveModal(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-shelf-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="sheet-title" id="remove-shelf-title">
              Remove from shelf
            </h2>
            <p className="sheet-subtitle">
              {resolvedBookTitle} is on {shelvesWithBook.length}{' '}
              {shelvesWithBook.length === 1 ? 'shelf' : 'shelves'}. Select the
              ones you’d like to remove it from.
            </p>

            <div className="shelf-picker-list">
              {shelvesWithBook.length === 0 ? (
                <p className="shelf-picker-empty">
                  This book isn’t on any of your shelves yet.
                </p>
              ) : (
                shelvesWithBook.map((shelf) => (
                  <label key={shelf.id} className="shelf-picker-row">
                    <input
                      type="checkbox"
                      checked={selectedShelves.has(shelf.id)}
                      onChange={() => toggleShelfSelection(shelf.id)}
                    />
                    <span className="shelf-picker-name">
                      {shelf.name || 'Untitled Shelf'}
                    </span>
                    <span className="shelf-picker-count">
                      {shelf.bookCount ?? (shelf.books || []).length}
                      {(shelf.bookCount ?? (shelf.books || []).length) === 1
                        ? ' book'
                        : ' books'}
                    </span>
                  </label>
                ))
              )}
            </div>

            <p className="sheet-footnote">
              Removing a book from a shelf won’t delete your reviews or
              reactions.
            </p>

            <div className="sheet-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowRemoveModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={selectedShelves.size === 0 || statusSaving}
                onClick={handleConfirmRemove}
              >
                {statusSaving ? 'Removing…' : 'Remove from Shelf'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}