import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Profile.module.css';
import AppDialog from '../../components/Dialog/AppDialog';
import { supabase } from '../../supabaseClient';
import {
  fetchUserShelvesWithBooks,
  createShelf,
  updateShelf,
  deleteShelf,
  addBookToShelf,
  removeBookFromShelf,
  ensureDefaultShelves,
  sortShelves,
} from '../../services/shelfService';
import { searchBooksByTitle } from '../../services/bookService';
const PROFILE_PHOTO_BUCKET = 'profile_images';

/**
 * Build the public URL for a stored profile photo.
 */
const photoUrlFor = (path) =>
  path
    ? supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl || ''
    : '';
import { fetchMyBookReviews } from '../../services/reviewService';


const SHELF_NAME_SUGGESTIONS = [
  'Comfort Reads',
  'Owned',
  'Read Soon',
  'Buddy Reads',
  'Book Club',
];

export function Profile({ user, logout, onSelectBook, darkMode, setDarkMode }) {
  const [view, setView] = useState('main');
  const [appDialog, setAppDialog] = useState(null);
  // Shelf whose full page is open (view === 'shelfDetail').
  const [activeShelfId, setActiveShelfId] = useState(null);
  const shelfTopRef = useRef(null);

  useEffect(() => {
    if (shelfTopRef.current) {
      shelfTopRef.current.scrollIntoView({
        behavior: 'instant',
        block: 'start'
      });
    }
  }, [activeShelfId, view]);

  const [detailEditing, setDetailEditing] = useState(false);
  const [showRenameShelf, setShowRenameShelf] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);


  // Where "back" from the shelf page should return to.
  const [shelfDetailFrom, setShelfDetailFrom] = useState('main');
  // Initialize from the auth user; the effect below only patches in the
  // profile row when it arrives from Supabase (setState in an async callback).
  const [fullName, setFullName] = useState(
    () => user?.user_metadata?.full_name || 'Jane Reader'
  );
  const [bio, setBio] = useState(
    'Book lover, tea enthusiast, and collector of dog-eared paperbacks. Always chasing a new good read.'
  );
  const BIO_MAX_LENGTH = 280;
  const PHOTO_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const [photoObject, setPhotoObject] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUploadError, setPhotoUploadError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [phone, setPhone] = useState('(555) 123-4567');
  const [isSaving, setIsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [readingReminders, setReadingReminders] = useState(true);
  const [newRecommendations, setNewRecommendations] = useState(true);

  // Shelf state
  const [shelves, setShelves] = useState([]);
  const [editingShelfId, setEditingShelfId] = useState(null);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfDescription, setNewShelfDescription] = useState('');
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [addBookShelfId, setAddBookShelfId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(''); // FIX Bug 4
  const [addedBookKeys, setAddedBookKeys] = useState(() => new Set());
  const [savedMessage, setSavedMessage] = useState('');
  // Book whose remove request is in flight, so its button can be disabled.
  const [removingBookKey, setRemovingBookKey] = useState(null);

  // Chapter reactions shown on the profile (from BookDetail progress updates)
  const [userReactions] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setUserReviews([]);
    setReviewsError('');
    setReviewsLoading(true);

    if (!user?.id) {
      setReviewsLoading(false);
      return;
    }

    fetchMyBookReviews()
      .then(data => {
        if (!cancelled) {
          setUserReviews(data.filter(item => item.user_id === user.id));
        }
      })
      .catch(() => {
        if (!cancelled) setReviewsError('Could not load your reviews.');
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id]);


  // New shelf creation state
  const [showNewShelfModal, setShowNewShelfModal] = useState(false);
  const [newShelfNameValidation, setNewShelfNameValidation] = useState('');

  // Stable loader: returns shelves plus any load error, so callers decide
  // when to apply them (and can render feedback from a promise callback).
  const loadShelves = useCallback(async () => {
    if (!user) return { shelves: [], error: '' };
    try {
      return {
        shelves: await fetchUserShelvesWithBooks(user.id),
        error: '',
      };
    } catch (err) {
      console.error('Failed to load shelves:', err);
      return { shelves: [], error: 'Error loading shelves.' };
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;



    async function loadProfileData() {
      const { data, error } = await supabase

        .from('profiles')

        .select('full_name, bio, phone, photo_object, reading_reminders, new_recommendations')

        .eq('id', user.id)

        .single();

      if (!error && data) {

        if (data.full_name) setFullName(data.full_name);

        if (data.bio) setBio(data.bio);

        if (data.phone) setPhone(data.phone);

        if (data.photo_object) setPhotoObject(data.photo_object);

        if (data.reading_reminders !== undefined) setReadingReminders(Boolean(data.reading_reminders));

        if (data.new_recommendations !== undefined) setNewRecommendations(Boolean(data.new_recommendations));

      }

    }



    loadProfileData();
    // Every account owns the three default shelves. Seed any that are missing
    // before reading the list, so they appear on the user's very first load.
    ensureDefaultShelves(user.id)
      .catch((err) => console.warn('Could not seed default shelves:', err))
      .finally(() => {
        loadShelves().then((result) => {
          if (cancelled) return;
          if (result.error) {
            setSavedMessage(result.error);
          } else {
            setShelves(result.shelves);
          }
        });
      });

    return () => {
      cancelled = true;
    };
  }, [user, loadShelves]);


  const isProtectedShelf = (shelf) =>
    Boolean(shelf && (
      shelf.is_default ||
      /^(current reads|finished|did not finish|top\s*4\s*favorites)$/i
        .test((shelf.name || '').trim())
    ));

  const canRenameShelf = (shelf) =>
    Boolean(shelf && !isProtectedShelf(shelf));

  const handleRenameShelf = async () => {
    if (!user || !canRenameShelf(activeShelf) || renameSaving) return;

    const name = renameValue.trim();

    if (!name) {
      setRenameError('Shelf name is required.');
      return;
    }

    if (/^top\s*4\s*favorites$/i.test(name) ||
        shelves.some(shelf =>
          shelf.id !== activeShelf.id &&
          (shelf.name || '').trim().toLowerCase() === name.toLowerCase()
        )) {
      setRenameError('This shelf name is already reserved or in use.');
      return;
    }

    setRenameSaving(true);
    setRenameError('');

    try {
      const updated = await updateShelf(
        user.id,
        activeShelf.id,
        name,
        activeShelf.description || ''
      );

      if (!updated) throw new Error('Could not rename shelf.');

      setShelves(prev => prev.map(shelf =>
        shelf.id === activeShelf.id
          ? { ...shelf, ...updated, name, books: shelf.books }
          : shelf
      ));

      setShowRenameShelf(false);
      setSavedMessage('Shelf renamed.');
      setTimeout(() => setSavedMessage(''), 2000);
    } catch (err) {
      setRenameError(err.message || 'Could not rename shelf.');
    } finally {
      setRenameSaving(false);
    }
  };

  const handleSaveShelf = async (shelfId) => {
    if (!user || !shelfId) return;
    try {
      // Default shelves are matched by name throughout the app (status sync,
      // the pinned order), so their name is never rewritten even if a caller
      // sends one.
      const shelf = shelves.find((s) => s.id === shelfId);
      const nextName = isProtectedShelf(shelf) ? shelf.name : newShelfName.trim();

      const updated = await updateShelf(
        user.id,
        shelfId,
        nextName,
        newShelfDescription.trim()
      );
      if (updated) {
        setShelves((prev) => prev.map((s) => (s.id === shelfId ? { ...s, ...updated } : s)));
        setEditingShelfId(null);
        setNewShelfName('');
        setNewShelfDescription('');
        setSavedMessage('Shelf saved.');
        setTimeout(() => setSavedMessage(''), 2000);
      }
    } catch (err) {
      console.error('Save shelf error:', err);
      setSavedMessage('Error saving shelf.');
    }
  };

  const handleCreateShelf = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!newShelfName.trim()) {
      setNewShelfNameValidation('Shelf name is required.');
      return;
    }
    try {
      const created = await createShelf(user.id, newShelfName.trim(), newShelfDescription.trim());
      if (created) {
        setShelves((prev) => sortShelves([...prev, { ...created, books: [] }]));
        setShowNewShelfModal(false);
        setNewShelfName('');
        setNewShelfDescription('');
        setNewShelfNameValidation('');
        setSavedMessage('Shelf created.');
        setTimeout(() => setSavedMessage(''), 2000);
      }
    } catch (err) {
      console.error('Create shelf error:', err);
      setSavedMessage('Error creating shelf.');
    }
  };

  const handleDeleteShelf = async (shelfId, confirmed = false) => {
    if (!user) return;

    const shelf = shelves.find((s) => s.id === shelfId);

    // Guard here as well as in the UI and the RPC: the default shelves are
    // part of the product, not user data.
    if (isProtectedShelf(shelf)) {
      setSavedMessage('Default shelves cannot be deleted.');
      setTimeout(() => setSavedMessage(''), 2500);
      return;
    }

    if (!confirmed) {
      setAppDialog({
        title: 'Delete Shelf?',
        message: 'Are you sure you want to delete this shelf? Your books will remain in the database.',
        confirmLabel: 'Delete Shelf',
        action: () => handleDeleteShelf(shelfId, true)
      });
      return;
    }
    try {
      // deleteShelf resolves false when the RPC refused the delete.
      const deleted = await deleteShelf(user.id, shelfId);

      if (!deleted) {
        setSavedMessage('Default shelves cannot be deleted.');
        setTimeout(() => setSavedMessage(''), 2500);
        return;
      }

      setShelves((prev) => prev.filter((s) => s.id !== shelfId));
      setDetailEditing(false);
      setActiveShelfId(null);
      setView('main');

      setSavedMessage('Shelf deleted.');
      setTimeout(() => setSavedMessage(''), 2000);
    } catch (err) {
      console.error('Delete shelf error:', err);
      setSavedMessage('Error deleting shelf.');
    }
  };

  // Tapping a search result drops that book straight onto the shelf.
  const addingShelfBookRef = useRef(false);

  const handleTapBookToAdd = async (book) => {
    if (!user || !addBookShelfId) return;

    const bookKey = book.bookId || book.id;
    if (addedBookKeys.has(bookKey)) return;

    if (addingShelfBookRef.current) return;

    const targetShelf = shelves.find(s => s.id === addBookShelfId);
    const isTopFour = /^top\s*4\s*favorites$/i.test(
      (targetShelf?.name || '').trim()
    );

    if (isTopFour && (targetShelf.books || []).length >= 4) {
      setSearchError(
        'You can only have 4 favorites. Remove a book before adding another.'
      );
      return;
    }

    addingShelfBookRef.current = true;
    setSearchError('');


    try {
      await addBookToShelf(
        user.id,
        addBookShelfId,
        bookKey,
        book.title,
        book.author,
        book.coverUrl || book.cover
      );

      setShelves(prev => prev.map(shelf =>
        shelf.id === addBookShelfId
          ? {
              ...shelf,
              books: [...(shelf.books || []), {
                book_id: bookKey,
                title: book.title,
                author: book.author,
                cover_url: book.coverUrl || book.cover
              }]
            }
          : shelf
      ));

      setAddedBookKeys((prev) => new Set(prev).add(bookKey));

      const shelfName = shelves.find((s) => s.id === addBookShelfId)?.name;
      setSavedMessage(`Added to "${shelfName || 'shelf'}".`);
      setTimeout(() => setSavedMessage(''), 2000);

      const refreshed = await loadShelves();
      if (refreshed.error) {
        setSavedMessage(refreshed.error);
      } else if (refreshed.shelves.length > 0) {
        setShelves(refreshed.shelves);
      }
    } catch (err) {
      console.error('Add book error:', err);
      setSavedMessage('Error adding book to shelf.');
      setTimeout(() => setSavedMessage(''), 2500);
    } finally {
      addingShelfBookRef.current = false;
    }
  };

  // Remove a single book from a shelf. Kept inline on the shelf card so the
  // user can prune a shelf without opening the book detail page.
  const handleRemoveBookFromShelf = async (shelfId, book, confirmed = false) => {
    if (!user || !shelfId || !book) return;

    const bookKey = book.book_id || book.id;
    if (!bookKey) return;

    if (!confirmed) {
      setAppDialog({
        title: 'Remove Book?',
        message: `Are you sure you want to remove "${book.title}" from this shelf?`,
        confirmLabel: 'Remove Book',
        action: () => handleRemoveBookFromShelf(shelfId, book, true)
      });
      return;
    }

    setRemovingBookKey(bookKey);
    try {
      await removeBookFromShelf(user.id, shelfId, bookKey);

      setShelves((prev) =>
        prev.map((shelf) =>
          shelf.id === shelfId
            ? {
                ...shelf,
                books: (shelf.books || []).filter(
                  (entry) => (entry.book_id || entry.id) !== bookKey
                ),
                bookCount: Math.max(0, (shelf.bookCount ?? 0) - 1),
              }
            : shelf
        )
      );

      setSavedMessage(`Removed "${book.title}".`);
      setTimeout(() => setSavedMessage(''), 2000);
    } catch (err) {
      console.error('Remove book error:', err);
      setSavedMessage('Error removing book from shelf.');
      setTimeout(() => setSavedMessage(''), 2500);
    } finally {
      setRemovingBookKey(null);
    }
  };

  const handleSearchBooks = async (query) => {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    try {
      const results = await searchBooksByTitle(query);
      setSearchResults(results);
      if (!results || results.length === 0) setSearchError('No results found.');
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('No results found.');
    } finally {
      setSearchLoading(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return null;
    if (file.size > PHOTO_MAX_FILE_SIZE) {
      setPhotoUploadError('The photo must be 5 MB or smaller.');
      return null;
    }
    setPhotoUploadError('');
    setPhotoUploading(true);
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg';
      const mime = file.type || `image/${ext || 'jpg'}`;
      const path = `profile_${user.id}_${Date.now()}.${ext || 'jpg'}`;
      const { data, error: uploadError } = await supabase.storage
        .from(PROFILE_PHOTO_BUCKET)
        .upload(path, file, { cacheControl: '3600', contentType: mime });
      if (uploadError) throw uploadError;
      if (!data || !data.path) throw new Error('Upload did not return a path.');
      const url = supabase.storage
        .from(PROFILE_PHOTO_BUCKET)
        .getPublicUrl(data.path)
        .data.publicUrl;
      if (!url) throw new Error('Upload did not return a URL.');
      return data.path;
    } catch (err) {
      console.error('Photo upload error:', err);
      setPhotoUploadError(err?.message || 'Could not upload the photo.');
      return null;
    } finally {
      setPhotoUploading(false);
    }
  };

  const saveSetting = async (key, value, revert) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', user.id);
      if (error) throw error;
      setSettingsMessage('');
    } catch (err) {
      console.error('Could not save setting:', err);
      setSettingsMessage('Could not save that setting. Your change was not applied.');
      if (revert) revert();
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (bio.length > BIO_MAX_LENGTH) {
      setSaveMessage(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`);
      return;
    }
    setIsSaving(true);
    setSaveMessage('');
    try {
      const currentPhotoObject = photoObject;
      let newPhotoObject = currentPhotoObject;
      if (photoFile) {
        newPhotoObject = await uploadPhoto(photoFile);
        if (!newPhotoObject) {
          setSaveMessage('Could not upload the photo. Please use an image 5 MB or smaller.');
          return;
        }
      }
      if (newPhotoObject && newPhotoObject !== currentPhotoObject) {
        if (currentPhotoObject) {
          await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([currentPhotoObject]);
        }
      }
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          full_name: fullName,
          bio: bio,
          phone: phone,
          photo_object: newPhotoObject,
          reading_reminders: readingReminders,
          new_recommendations: newRecommendations,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      setPhotoFile(null);
      setPhotoUploadError('');
      setSaveMessage('Profile saved successfully!');
      setTimeout(() => {
        setSaveMessage('');
        setView('main');
      }, 1000);
    } catch (err) {
      console.error('Save profile error:', err);
      const isInternal = /internal|timeout|ECONNREFUSED/i.test(err?.message || '');
      setSaveMessage(
        isInternal
          ? 'Your changes did not apply due to an internal issue.'
          : 'Error saving profile changes.'
      );
    } finally {
      setIsSaving(false);
    }
  };
  const openShelfDetail = (shelfId) => {
    setActiveShelfId(shelfId);
    setShelfDetailFrom(view);
    setView('shelfDetail');
  };

  // Shelf rows carry the shelf_books row id as `id`; BookDetail needs the
  // book's own id, so map it explicitly rather than letting it fall back to
  // the join row.
  const handleSelectBook = (book) => {
    if (!book) return;
    onSelectBook?.({
      ...book,
      bookId: book.book_id || book.id,
      id: book.book_id || book.id,
      coverUrl: book.cover_url || book.cover,
    });
  };

  const handleSelectHistoryBook = async (item) => {
    const bookId = item.book_id;
    const normalizeId = id => String(id || '').replace(/^\/works\//, '');

    const matchesId = book =>
      normalizeId(book.book_id || book.bookId || book.id) === normalizeId(bookId);

    let matched = shelves
      .flatMap(shelf => shelf.books || [])
      .find(book => matchesId(book) && book.author &&
        (book.cover_url || book.coverUrl || book.cover));

    if (!matched) {
      try {
        const results = await searchBooksByTitle(item.book_title);
        matched = results.find(matchesId);
      } catch (error) {
        console.warn('Could not retrieve book details:', error);
      }
    }

    handleSelectBook({
      ...matched,
      book_id: bookId,
      title: matched?.title || item.book_title,
      author: matched?.author,
      cover_url: matched?.cover_url || matched?.coverUrl || matched?.cover,
    });
  };

  const beginEditShelf = (shelf) => {
    setEditingShelfId(shelf.id);
    setNewShelfName(shelf.name || '');
    setNewShelfDescription(shelf.description || '');
  };

  const cancelEditShelf = () => {
    setEditingShelfId(null);
    setNewShelfName('');
    setNewShelfDescription('');
  };

  const openNewShelfModal = () => {
    // FIX Bug 9: reset shared inputs when opening the modal
    setNewShelfName('');
    setNewShelfDescription('');
    setNewShelfNameValidation('');
    setShowNewShelfModal(true);
  };

  const openAddBookModal = (shelfId) => {
    const shelf = shelves.find((s) => s.id === shelfId);

    setAddBookShelfId(shelfId);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setLastAddedBook(null);
    // shelf_books has no unique constraint on (shelf_id, book_id), so without
    // this seed a second tap would insert a duplicate row for a book that is
    // already on the shelf.
    setAddedBookKeys(
      new Set(
        (shelf?.books || [])
          .map((book) => book.book_id || book.id)
          .filter(Boolean)
      )
    );
    setNewShelfName('');
    setNewShelfNameValidation('');
    setShowAddBookModal(true);
  };

  // Create a brand-new shelf and drop the book the user just tapped onto it.

  const renderShelfPreview = (shelf) => {
    const books = shelf.books || [];
    const isFavorite = /favorite/i.test(shelf.name || '');

    return (
      <section key={shelf.id} className={styles.shelfPreview}>
        <button
          type="button"
          className={styles.previewHeader}
          onClick={() => openShelfDetail(shelf.id)}
        >
          <span className={styles.previewName}>
            {shelf.name || 'Untitled Shelf'}
          </span>
          <span className={styles.previewFlower}>❀</span>
          <span className={styles.previewCount}>
            {books.length} {books.length === 1 ? 'book' : 'books'} ›
          </span>
        </button>

        <div className={`${styles.previewBooks} ${
          isFavorite ? styles.favoritesBg : styles.currentReadsBg
        }`}>
          {books.length ? books.map(book => (
            <button
              type="button"
              key={book.book_id || book.id}
              className={styles.previewBook}
              onClick={() => handleSelectBook(book)}
              aria-label={`Open ${book.title}`}
            >
              <span>{book.title}</span>
              {(book.cover_url || book.cover) && (
                <img
                  src={book.cover_url || book.cover}
                  alt={book.title}
                  loading="lazy"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </button>
          )) : (
            <button
              type="button"
              className={styles.previewEmpty}
              onClick={() => openAddBookModal(shelf.id)}
            >
              + Add your first book
            </button>
          )}
        </div>
      </section>
    );
  };

  const renderShelfCard = (shelf) => {
    const isEditing = editingShelfId === shelf.id;
    return (
      <div key={shelf.id} className={styles.shelfCard}>
        <div className={styles.shelfHeader}>
          {isEditing ? (
            isProtectedShelf(shelf) ? (
              <div className={styles.shelfNameLocked}>
                <span className={styles.shelfNameLockedText}>{shelf.name}</span>
                <span className={styles.shelfNameLockedHint}>
                  Default shelves keep their name.
                </span>
              </div>
            ) : (
              <input
                type="text"
                className={styles.shelfNameInput}
                value={newShelfName}
                onChange={(e) => setNewShelfName(e.target.value)}
                placeholder="Shelf name"
                autoFocus
              />
            )
          ) : (
            <button
              type="button"
              className={styles.shelfNameBtn}
              onClick={() => openShelfDetail(shelf.id)}
              aria-label={`Open ${shelf.name || 'Untitled Shelf'}`}
            >
              {shelf.name || 'Untitled Shelf'}
            </button>
          )}
          <div className={styles.shelfActions}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  className={styles.shelfActionBtn}
                  onClick={cancelEditShelf}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.shelfActionBtn}
                  onClick={() => handleSaveShelf(shelf.id)} // FIX Bug 2
                  disabled={!isProtectedShelf(shelf) && !newShelfName.trim()}
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.shelfActionBtn}
                  onClick={() => beginEditShelf(shelf)}
                  aria-label={`Edit ${shelf.name}`}
                >
                  ✎
                </button>
                {!isProtectedShelf(shelf) && (
                  <button
                    type="button"
                    className={styles.shelfActionBtn}
                    onClick={() => handleDeleteShelf(shelf.id)}
                    aria-label={`Delete ${shelf.name}`}
                  >
                    🗑
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {isProtectedShelf(shelf) && (
          <span className={styles.defaultTag}>Default</span>
        )}

        {isEditing && (
          <textarea
            className={`${styles.fieldInput} ${styles.textArea}`}
            value={newShelfDescription}
            onChange={(e) => setNewShelfDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{ marginTop: 8 }}
          />
        )}

        {!isEditing && shelf.description && (
          <p className={styles.shelfDescription}>{shelf.description}</p>
        )}

        <div className={styles.bookRow}>
          {shelf.books &&
            shelf.books.map((book) => {
              const bookKey = book.book_id || book.id;
              return (
                <div key={bookKey} className={styles.shelfBookItem}>
                  <button
                    type="button"
                    className={styles.shelfBookCoverBtn}
                    onClick={() => {
                      // While editing, the cover is not a navigation target —
                      // the remove button overlays it.
                      if (isEditing) return;
                      handleSelectBook(book);
                    }}
                    aria-label={`Open ${book.title}`}
                    tabIndex={isEditing ? -1 : 0}
                  >
                    <img
                      src={
                        book.cover_url ||
                        book.cover ||
                        'https://covers.openlibrary.org/b/id/8311267-L.jpg'
                      }
                      alt={book.title}
                      className={styles.bookCover}
                    />
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      className={styles.removeBookBtn}
                      onClick={() => handleRemoveBookFromShelf(shelf.id, book)}
                      disabled={removingBookKey === bookKey}
                      aria-label={`Remove ${book.title} from this shelf`}
                      title={`Remove ${book.title}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          {shelf.books && shelf.books.length === 0 && (
            <span className={styles.emptyBook}>No books yet</span>
          )}
        </div>

        <button
          type="button"
          className={styles.addBookBtn}
          onClick={() => openAddBookModal(shelf.id)}
        >
          + Add Books
        </button>
      </div>
    );
  };

  const activeShelf =
    view === 'shelfDetail'
      ? shelves.find((shelf) => shelf.id === activeShelfId) || null
      : null;

  return (
    <div className={styles.profileContainer}>
      {view === 'main' && (
        <div className={styles.mainView}>
          <header className={styles.topHeader}>
            <h1 className={styles.profileTitle}>Profile</h1>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setView('settings')}
              aria-label="Settings"
            >
              ⚙
            </button>
          </header>

          <div className={styles.userInfoCard}>
            <div className={styles.avatarWrapper}>
              {photoObject ? (
                <div className={styles.avatarImageWrap}>
                  <img
                    src={photoUrlFor(photoObject)}
                    alt="Profile"
                    className={styles.avatarImage}
                  />
                </div>
              ) : (
                <div className={styles.avatarCircle}>👤</div>
              )}
              <button
                type="button"
                className={styles.editBadge}
                onClick={() => setView('edit')}
              >
                ✎
              </button>
            </div>
            <h2 className={styles.userName}>{fullName || 'Jane Reader'}</h2>
            <p className={styles.userBio}>{bio}</p>
          </div>

          <section className={styles.shelfSection}>
            {shelves.length === 0 ? (
              <div className={styles.emptyShelves}>
                <p className={styles.emptyText}>You don't have any shelves yet.</p>
                <button
                  type="button"
                  className={styles.newShelfBtn}
                  onClick={openNewShelfModal}
                >
                  + Create a Shelf
                </button>
              </div>
            ) : (
              <div className={styles.shelvesList}>{shelves.map(renderShelfPreview)}</div>
            )}
          </section>

          <div className={styles.addShelfBar}>
            <button
              type="button"
              className={styles.addShelfBtn}
              onClick={openNewShelfModal}
            >
              + New Shelf
            </button>
          </div>


          <section className={styles.shelfSection}>
            <div className={styles.pillTag}>
              <span>My Reviews</span>
            </div>

            <div className={`${styles.shelfCard} ${styles.currentReadsBg}`}>
              {reviewsLoading ? (
                <p className={styles.shelfDescription}>Loading reviews...</p>
              ) : reviewsError ? (
                <p role="alert">{reviewsError}</p>
              ) : userReviews.length === 0 ? (
                <p className={styles.shelfDescription}>
                  No reviews yet. Finish a book and share your thoughts!
                </p>
              ) : (
                <div className={styles.myReviewsList}>
                  {userReviews.slice(0, 2).map(item => (
                    <article key={item.id} className={styles.myReviewCard}>
                      <button
                        type="button"
                        className={styles.myReviewTitle}
                        onClick={() => handleSelectHistoryBook(item)}
                      >
                        {item.book_title} ›
                      </button>

                      <div className={styles.myReviewRating}>
                        ★ {item.rating_out_of_10 / 2}/5
                      </div>

                      <div className={styles.myReviewMeta}>
                        {item.review_type}
                        {item.includes_spoilers ? ' · Contains spoilers' : ''}
                      </div>

                      {item.review_text && <p>{item.review_text}</p>}
                    </article>
                  ))}
                </div>
              )}

              {userReviews.length > 2 && (
                <button
                  type="button"
                  className={styles.historySeeMore}
                  onClick={() => setView('allReviews')}
                >
                  See More ›
                </button>
              )}
            </div>
          </section>

          <section className={styles.shelfSection}>
            <div className={styles.pillTag}>
              <span>Chapter Reactions</span>
            </div>
            <div className={`${styles.shelfCard} ${styles.currentReadsBg}`}>
              {userReactions.length === 0 ? (
                <p className={styles.shelfDescription}>
                  No chapter reactions yet. Open a book and select Progress Update!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {userReactions.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className={styles.myReviewCard}
                    >
                      <button
                        type="button"
                        className={styles.myReviewTitle}
                        onClick={() => handleSelectHistoryBook(item)}
                      >
                        {item.book_title} · Chapter {item.page_number} ›
                      </button>
                      <p>
                        &ldquo;{item.reaction}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {userReactions.length > 2 && (
                <button
                  type="button"
                  className={styles.historySeeMore}
                  onClick={() => setView('allReactions')}
                >
                  See More ›
                </button>
              )}
            </div>
          </section>

          {savedMessage && <p className={styles.saveFeedback}>{savedMessage}</p>}
        </div>
      )}


      {view === 'allReviews' && (
        <div className={styles.subView}>
          <div ref={shelfTopRef} className={styles.shelfDetailNavBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setView('main')}
            >
              ← My Reviews
            </button>
          </div>
          <section className={styles.shelfSection}>
            <div className={styles.pillTag}>
              <span>My Reviews</span>
            </div>

            <div className={`${styles.shelfCard} ${styles.currentReadsBg}`}>
              {reviewsLoading ? (
                <p className={styles.shelfDescription}>Loading reviews...</p>
              ) : reviewsError ? (
                <p role="alert">{reviewsError}</p>
              ) : userReviews.length === 0 ? (
                <p className={styles.shelfDescription}>
                  No reviews yet. Finish a book and share your thoughts!
                </p>
              ) : (
                <div className={styles.myReviewsList}>
                  {userReviews.map(item => (
                    <article key={item.id} className={styles.myReviewCard}>
                      <button
                        type="button"
                        className={styles.myReviewTitle}
                        onClick={() => handleSelectHistoryBook(item)}
                      >
                        {item.book_title} ›
                      </button>

                      <div className={styles.myReviewRating}>
                        ★ {item.rating_out_of_10 / 2}/5
                      </div>

                      <div className={styles.myReviewMeta}>
                        {item.review_type}
                        {item.includes_spoilers ? ' · Contains spoilers' : ''}
                      </div>

                      {item.review_text && <p>{item.review_text}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}


      {view === 'allReactions' && (
        <div className={styles.subView}>
          <div ref={shelfTopRef} className={styles.shelfDetailNavBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setView('main')}
            >
              ← Chapter Reactions
            </button>
          </div>
          <section className={styles.shelfSection}>
            <div className={styles.pillTag}>
              <span>Chapter Reactions</span>
            </div>
            <div className={`${styles.shelfCard} ${styles.currentReadsBg}`}>
              {userReactions.length === 0 ? (
                <p className={styles.shelfDescription}>
                  No chapter reactions yet. Open a book and select Progress Update!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {userReactions.map((item) => (
                    <div
                      key={item.id}
                      className={styles.myReviewCard}
                    >
                      <button
                        type="button"
                        className={styles.myReviewTitle}
                        onClick={() => handleSelectHistoryBook(item)}
                      >
                        {item.book_title} · Chapter {item.page_number} ›
                      </button>
                      <p>
                        &ldquo;{item.reaction}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {view === 'edit' && (
        <div className={styles.subView}>
          <button type="button" className={styles.backBtn} onClick={() => setView('main')}>
            ← Edit Profile
          </button>
          <div className={styles.avatarWrapperCenter}>
            {photoObject ? (
              <div className={styles.avatarImageWrap}>
                <img
                  src={photoUrlFor(photoObject)}
                  alt="Profile"
                  className={styles.avatarImage}
                />
              </div>
            ) : (
              <div className={styles.avatarCircle}>👤</div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="user"
              style={{ display: 'none' }}
              id="photo-input"
              onChange={(e) => {
                setPhotoFile(e.target.files?.[0] || null);
                setPhotoUploadError('');
              }}
            />
            <button
              type="button"
              className={styles.editBadgeCenter}
              onClick={() => document.getElementById('photo-input').click()}
              disabled={photoUploading}
              title={photoUploading ? 'Uploading…' : 'Change photo'}
            >
              {photoUploading ? '⏳' : '✎'}
            </button>
            {photoUploadError && (
              <p className={styles.saveFeedback} style={{ textAlign: 'center' }}>{photoUploadError}</p>
            )}
          </div>
          <form onSubmit={handleSaveProfile} className={styles.editForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>NAME</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>BIO</label>
              <textarea
                className={`${styles.fieldInput} ${styles.textArea}`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>EMAIL</label>
              <input type="email" className={styles.fieldInput} value={user?.email || ''} disabled />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>PHONE NUMBER</label>
              <div className={styles.phoneRow}>
                <select className={styles.countrySelect}>
                  <option>+1 (US)</option>
                </select>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            {saveMessage && <p className={styles.saveFeedback}>{saveMessage}</p>}
            <button type="submit" className={styles.saveBtn} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {view === 'settings' && (
        <div className={styles.subView}>
          <button type="button" className={styles.backBtn} onClick={() => setView('main')}>
            ← Settings
          </button>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>PERSONAL INFO</p>
            <button type="button" className={styles.settingItem} onClick={() => setView('edit')}>
              <span>Name &amp; Bio</span> <span>›</span>
            </button>
            <button type="button" className={styles.settingItem} onClick={() => setView('edit')}>
              <span>Email Address</span> <span>›</span>
            </button>
            <button type="button" className={styles.settingItem} onClick={() => setView('edit')}>
              <span>Phone Number</span> <span>›</span>
            </button>
          </div>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>SHELVES</p>
            <button type="button" className={styles.settingItem} onClick={() => setView('shelves')}>
              <span>Manage Shelves</span> <span>›</span>
            </button>
          </div>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>GOODREADS DATA</p>
            <button type="button" className={styles.settingItem}>
              <span>Import Goodreads Library</span> <span>›</span>
            </button>
          </div>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>APPEARANCE</p>
            <div className={styles.settingToggleItem}>
              <span>Dark Mode</span>
              <input
                type="checkbox"
                className={styles.toggleSwitch}
                aria-label="Dark Mode"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
            </div>
          </div>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>NOTIFICATIONS</p>
            <div className={styles.settingToggleItem}>
              <span>Reading Reminders</span>
              <input
                type="checkbox"
                className={styles.toggleSwitch}
                checked={readingReminders}
                onChange={(e) => {
                  const v = e.target.checked;
                  setReadingReminders(v);
                  saveSetting('reading_reminders', v, () => setReadingReminders(!v));
                }}
              />
            </div>
            <div className={styles.settingToggleItem}>
              <span>New Recommendations</span>
              <input
                type="checkbox"
                className={styles.toggleSwitch}
                checked={newRecommendations}
                onChange={(e) => {
                  const v = e.target.checked;
                  setNewRecommendations(v);
                  saveSetting('new_recommendations', v, () => setNewRecommendations(!v));
                }}
              />
            </div>
          </div>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>SUPPORT</p>
            <button type="button" className={styles.settingItem}>
              <span>Help Center &amp; Contact</span> <span>›</span>
            </button>
          </div>

            {settingsMessage && <p className={styles.saveFeedback}>{settingsMessage}</p>}

          <button type="button" className={styles.signOutBtn} onClick={logout}>
            Sign Out
          </button>
        </div>
      )}

      {view === 'shelves' && (
        <div className={styles.shelvesView}>
          <button type="button" className={styles.backBtn} onClick={() => setView('main')}>
            ← Back to Profile
          </button>
          <h2 className={styles.shelvesPageTitle}>Your Shelves</h2>

          {shelves.length === 0 ? (
            <div className={styles.emptyShelves}>
              <p className={styles.emptyText}>You don't have any shelves yet.</p>
              <button type="button" className={styles.newShelfBtn} onClick={openNewShelfModal}>
                + Create a Shelf
              </button>
            </div>
          ) : (
            <div className={styles.shelvesList}>{shelves.map(renderShelfCard)}</div>
          )}

          <div className={styles.addShelfBar}>
            <button type="button" className={styles.addShelfBtn} onClick={openNewShelfModal}>
              + New Shelf
            </button>
          </div>

          {savedMessage && <p className={styles.saveFeedback}>{savedMessage}</p>}
        </div>
      )}

      {/* Full shelf page */}
      {view === 'shelfDetail' && (
        <div className={styles.shelfDetailView}>


          {activeShelf ? (
            <>
              <div ref={shelfTopRef} className={styles.shelfDetailNavBar}>
                <button
                  type="button"
                  className={styles.shelfDetailBackBtn}
                  onClick={() => {
                    setDetailEditing(false);
                    setView(shelfDetailFrom === 'shelves' ? 'shelves' : 'main');
                  }}
                  aria-label="Back"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.detailEditBtn}
                  onClick={() => setDetailEditing(value => !value)}
                >
                  {detailEditing ? 'Done' : 'Edit'}
                </button>


              </div>

              <div className={styles.shelfSummaryCard}>
                <span className={styles.shelfSummaryTitle}>
                  {activeShelf.name || 'Untitled Shelf'}
                </span>
                <span className={styles.shelfSummaryLabel}>
                  {(activeShelf.books || []).length}{' '}
                  {(activeShelf.books || []).length === 1 ? 'book' : 'books'}
                </span>
              </div>





              {detailEditing && !isProtectedShelf(activeShelf) && (
                <div className={styles.detailShelfActions}>
              {detailEditing && canRenameShelf(activeShelf) && (
                <button
                  type="button"
                  className={styles.detailRenameShelfBtn}
                  onClick={() => {
                    setRenameValue(activeShelf.name || '');
                    setRenameError('');
                    setShowRenameShelf(true);
                  }}
                >
                  Rename Shelf
                </button>
              )}

              {showRenameShelf && (
                <div className={styles.renameOverlay}>
                  <div
                    className={`${styles.modalContent} ${styles.compactModal}`}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Rename Shelf"
                  >
                    <span className={styles.modalFlower}>❀</span>
                    <h2 className={styles.modalTitle}>Rename Shelf</h2>

                    <input
                      className={styles.fieldInput}
                      value={renameValue}
                      onChange={e => {
                        setRenameValue(e.target.value);
                        setRenameError('');
                      }}
                      aria-label="Shelf name"
                      autoFocus
                    />

                    {renameError && (
                      <p role="alert" style={{color: '#c97882'}}>
                        {renameError}
                      </p>
                    )}

                    <div className={styles.modalActions}>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        disabled={renameSaving}
                        onClick={() => setShowRenameShelf(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={styles.saveBtn}
                        disabled={!renameValue.trim() || renameSaving}
                        onClick={handleRenameShelf}
                      >
                        {renameSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {detailEditing && !isProtectedShelf(activeShelf) && (
                <button
                  type="button"
                  className={styles.detailDeleteShelfBtn}
                  onClick={() => handleDeleteShelf(activeShelf.id)}
                >
                  Delete Shelf
                </button>
              )}


                </div>
              )}

              {(activeShelf.books || []).length > 0 ? (
                <div className={styles.shelfBookList}>
                  {(activeShelf.books || []).map((book) => {
                    const bookKey = book.book_id || book.id;
                    return (
                      <button
                        type="button"
                        key={bookKey}
                        className={styles.shelfBookRow}
                        onClick={() => detailEditing
                          ? handleRemoveBookFromShelf(activeShelf.id, book)
                          : handleSelectBook(book)}
                        aria-label={detailEditing
                          ? `Remove ${book.title}`
                          : `Open ${book.title}`}
                      >
                        <span className={styles.shelfBookCoverWrap}>
                          <span
                            className={styles.shelfBookCoverFallback}
                            aria-hidden="true"
                          >
                            {book.title}
                          </span>
                          {(book.cover_url || book.cover) && (
                            <img
                              src={book.cover_url || book.cover}
                              alt=""
                              loading="lazy"
                              className={styles.shelfBookCover}
                              onError={(e) => e.currentTarget.remove()}
                            />
                          )}
                        </span>

                        <span className={styles.shelfBookInfo}>
                          <span className={styles.shelfBookTitle}>
                            {book.title || 'Untitled'}
                          </span>
                          <span className={styles.shelfBookAuthor}>
                            {book.author || 'Unknown author'}
                          </span>
                        </span>

                        <span
                          className={detailEditing
                            ? styles.detailRemoveBtn
                            : styles.shelfBookChevron}
                          aria-hidden="true"
                        >
                          {detailEditing ? '−' : '›'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.shelfDetailEmpty}>
                  No books on this shelf yet.
                </p>
              )}

              {!detailEditing && (
                !/^top\s*4\s*favorites$/i.test((activeShelf.name || '').trim()) ||
                (activeShelf.books || []).length < 4
              ) && (
                <button
                  type="button"
                  className={styles.addBookBtn}
                  onClick={() => openAddBookModal(activeShelf.id)}
                >
                  + Add Books
                </button>
              )}


            </>
          ) : (
            <p className={styles.shelfDetailEmpty}>
              This shelf isn&rsquo;t available anymore.
            </p>
          )}
        </div>
      )}

      {showNewShelfModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewShelfModal(false)}>
          <div
            className={`${styles.modalContent} ${styles.compactModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-create-shelf-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={styles.modalFlower} aria-hidden="true">❀</span>
            <h2 className={styles.modalTitle} id="profile-create-shelf-title">
              New Shelf
            </h2>

            <form onSubmit={handleCreateShelf}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="profile-shelf-name">
                  Shelf name
                </label>
                <input
                  id="profile-shelf-name"
                  type="text"
                  className={styles.fieldInput}
                  value={newShelfName}
                  onChange={(e) => {
                    setNewShelfName(e.target.value);
                    if (newShelfNameValidation) setNewShelfNameValidation('');
                  }}
                  placeholder="e.g. Cozy Autumn Reads"
                  autoFocus
                />
                {newShelfNameValidation && (
                  <p className={styles.errorText}>{newShelfNameValidation}</p>
                )}
              </div>

              <div className={styles.chipRow}>
                {SHELF_NAME_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.chip}
                    onClick={() => setNewShelfName(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>



              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowNewShelfModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn} disabled={!newShelfName.trim()}>
                  Create Shelf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddBookModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddBookModal(false)}>
          <div
            className={`${styles.modalContent} ${styles.compactModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-add-books-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={styles.modalFlower} aria-hidden="true">❀</span>
            <h2 className={styles.modalTitle} id="profile-add-books-title">
              Add Books
            </h2>
            <p className={styles.modalSubtitle}>
              Search and add books to{' '}
              {shelves.find((s) => s.id === addBookShelfId)?.name || 'this shelf'}.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="profile-add-search">
                Search by title
              </label>
              <input
                id="profile-add-search"
                type="text"
                className={styles.fieldInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchBooks(searchQuery);
                  }
                }}
                placeholder="e.g. The Hobbit"
              />
            </div>
            <button
              type="button"
              className={styles.saveBtn}
              style={{ marginTop: 8 }}
              onClick={() => handleSearchBooks(searchQuery)}
              disabled={searchLoading || !searchQuery.trim()}
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>

            {searchError && <p className={styles.errorText}>{searchError}</p>}

            <div className={styles.addBookResults}>
              {searchResults.map((book) => {
                const bookKey = book.id || book.bookId;
                const isAdded = addedBookKeys.has(bookKey);

                return (
                  <div
                    key={bookKey}
                    className={`${styles.addBookResultRow} ${
                      isAdded ? styles.addBookResultSelected : ''
                    }`}
                    onClick={() => handleTapBookToAdd(book)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Add ${book.title} to shelf`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTapBookToAdd(book);
                      }
                    }}
                  >
                  <span className={styles.addBookResultInfo}>
                    <span className={styles.addBookResultCoverWrap}>
                      <span
                        className={styles.addBookResultCoverFallback}
                        aria-hidden="true"
                      >
                        {book.title}
                      </span>
                      {(book.coverUrl || book.cover) && (
                        <img
                          src={book.coverUrl || book.cover}
                          alt=""
                          loading="lazy"
                          className={styles.addBookResultCover}
                          onError={(e) => e.currentTarget.remove()}
                        />
                      )}
                    </span>
                    <span className={styles.addBookResultTitle}>
                      {book.title}
                    </span>
                  </span>
                  <span className={styles.addBookIndicator}>
                    {isAdded ? '✓ Added' : '+'}
                  </span>
                  </div>
                );
              })}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                style={{ width: '100%', flex: 1 }}
                onClick={() => setShowAddBookModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {appDialog && (
        <AppDialog
          title={appDialog.title}
          message={appDialog.message}
          confirmLabel={appDialog.confirmLabel}
          destructive
          onCancel={() => setAppDialog(null)}
          onConfirm={() => {
            const action = appDialog.action;
            setAppDialog(null);
            action();
          }}
        />
      )}
    </div>
  );
}
