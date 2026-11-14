import { useState, useEffect, useCallback } from 'react';
import styles from './Profile.module.css';
import { supabase } from '../../supabaseClient';
import {
  fetchUserShelvesWithBooks,
  createShelf,
  updateShelf,
  deleteShelf,
  addBookToShelf,
} from '../../services/shelfService';
import { searchBooksByTitle } from '../../services/bookService';
import { fetchMyBookPageReactions } from '../../services/pageReactionService';

const SHELF_NAME_SUGGESTIONS = [
  'Comfort Reads',
  'Owned',
  'Read Soon',
  'Buddy Reads',
  'Book Club',
];

export function Profile({ user, logout }) {
  const [view, setView] = useState('main');
  // Initialize from the auth user; the effect below only patches in the
  // profile row when it arrives from Supabase (setState in an async callback).
  const [fullName, setFullName] = useState(
    () => user?.user_metadata?.full_name || 'Jane Reader'
  );
  const [bio, setBio] = useState(
    'Book lover, tea enthusiast, and collector of dog-eared paperbacks. Always chasing a new good read.'
  );
  const [phone, setPhone] = useState('(555) 123-4567');
  const [isSaving, setIsSaving] = useState(false);
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
  const [lastAddedBook, setLastAddedBook] = useState(null);
  const [addedBookKeys, setAddedBookKeys] = useState(() => new Set());
  const [savedMessage, setSavedMessage] = useState('');

  // Chapter reactions shown on the profile (from BookDetail progress updates)
  const [userReactions, setUserReactions] = useState([]);

  // New shelf creation state
  const [showNewShelfModal, setShowNewShelfModal] = useState(false);
  const [newShelfNameValidation, setNewShelfNameValidation] = useState('');
  const [isCreatingShelf, setIsCreatingShelf] = useState(false);

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
        .select('full_name, bio, phone')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        if (data.full_name) setFullName(data.full_name);
        if (data.bio) setBio(data.bio);
        if (data.phone) setPhone(data.phone);
      }

      try {
        const reactionsData = await fetchMyBookPageReactions();
        if (reactionsData && !cancelled) {
          setUserReactions(reactionsData);
        }
      } catch (reactionsError) {
        console.warn('Could not load chapter reactions:', reactionsError);
      }
    }

    loadProfileData();

    loadShelves().then((result) => {
      if (cancelled) return;
      if (result.error) {
        setSaveMessage(result.error);
      } else if (result.shelves.length > 0) {
        setShelves(result.shelves);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, loadShelves]);

  const handleSaveShelf = async (shelfId) => {
    if (!user || !shelfId) return;
    try {
      const updated = await updateShelf(
        user.id,
        shelfId,
        newShelfName.trim(),
        newShelfDescription.trim()
      );
      if (updated) {
        setShelves((prev) => prev.map((s) => (s.id === shelfId ? { ...s, ...updated } : s)));
        setEditingShelfId(null);
        setNewShelfName('');
        setNewShelfDescription('');
        setSaveMessage('Shelf saved.');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    } catch (err) {
      console.error('Save shelf error:', err);
      setSaveMessage('Error saving shelf.');
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
        setShelves((prev) => [...prev, { ...created, books: [] }]);
        setShowNewShelfModal(false);
        setNewShelfName('');
        setNewShelfDescription('');
        setNewShelfNameValidation('');
        setSaveMessage('Shelf created.');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    } catch (err) {
      console.error('Create shelf error:', err);
      setSaveMessage('Error creating shelf.');
    }
  };

  const handleDeleteShelf = async (shelfId) => {
    if (!user) return;
    if (!confirm('Delete this shelf? Books will remain in the database.')) return;
    try {
      await deleteShelf(user.id, shelfId);
      setShelves((prev) => prev.filter((s) => s.id !== shelfId));
      setSaveMessage('Shelf deleted.');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (err) {
      console.error('Delete shelf error:', err);
      setSaveMessage('Error deleting shelf.');
    }
  };

  // Tapping a search result drops that book straight onto the shelf.
  const handleTapBookToAdd = async (book) => {
    if (!user || !addBookShelfId) return;

    const bookKey = book.bookId || book.id;
    if (addedBookKeys.has(bookKey)) return;

    try {
      await addBookToShelf(
        user.id,
        addBookShelfId,
        bookKey,
        book.title,
        book.author,
        book.coverUrl || book.cover
      );

      setAddedBookKeys((prev) => new Set(prev).add(bookKey));
      setLastAddedBook(book);

      const shelfName = shelves.find((s) => s.id === addBookShelfId)?.name;
      setSavedMessage(`Added to "${shelfName || 'shelf'}".`);
      setTimeout(() => setSavedMessage(''), 2000);

      const refreshed = await loadShelves();
      if (refreshed.error) {
        setSaveMessage(refreshed.error);
      } else if (refreshed.shelves.length > 0) {
        setShelves(refreshed.shelves);
      }
    } catch (err) {
      console.error('Add book error:', err);
      setSavedMessage('Error adding book to shelf.');
      setTimeout(() => setSavedMessage(''), 2500);
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    try {
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          full_name: fullName,
          bio: bio,
          phone: phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      setSaveMessage('Profile saved successfully!');
      setTimeout(() => {
        setSaveMessage('');
        setView('main');
      }, 1000);
    } catch (err) {
      console.error('Save profile error:', err);
      setSaveMessage('Error saving profile changes.');
    } finally {
      setIsSaving(false);
    }
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
    setAddBookShelfId(shelfId);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setLastAddedBook(null);
    setAddedBookKeys(new Set());
    setNewShelfName('');
    setNewShelfNameValidation('');
    setShowAddBookModal(true);
  };

  // Create a brand-new shelf and drop the book the user just tapped onto it.
  const handleCreateShelfFromAddBook = async () => {
    if (!user || !lastAddedBook) return;

    const name = newShelfName.trim();
    if (!name) {
      setNewShelfNameValidation('Shelf name is required.');
      return;
    }

    setIsCreatingShelf(true);
    setNewShelfNameValidation('');
    try {
      const created = await createShelf(user.id, name);
      if (!created) throw new Error('Could not create the shelf.');

      await addBookToShelf(
        user.id,
        created.id,
        lastAddedBook.bookId || lastAddedBook.id,
        lastAddedBook.title,
        lastAddedBook.author,
        lastAddedBook.coverUrl || lastAddedBook.cover
      );

      const refreshed = await loadShelves();
      if (refreshed.error) {
        setSaveMessage(refreshed.error);
      } else if (refreshed.shelves.length > 0) {
        setShelves(refreshed.shelves);
      }

      setShowAddBookModal(false);
      setLastAddedBook(null);
      setAddedBookKeys(new Set());
      setSearchQuery('');
      setSearchResults([]);
      setNewShelfName('');
      setSavedMessage(`Added to "${created.name}".`);
      setTimeout(() => setSavedMessage(''), 2000);
    } catch (err) {
      console.error('Create shelf from add-book error:', err);
      setNewShelfNameValidation(err.message || 'Could not create the shelf.');
    } finally {
      setIsCreatingShelf(false);
    }
  };

  const renderShelfCard = (shelf) => {
    const isEditing = editingShelfId === shelf.id;
    return (
      <div key={shelf.id} className={styles.shelfCard}>
        <div className={styles.shelfHeader}>
          {isEditing ? (
            <input
              type="text"
              className={styles.shelfNameInput}
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder="Shelf name"
              autoFocus
            />
          ) : (
            <h3 className={styles.shelfName}>{shelf.name || 'Untitled Shelf'}</h3>
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
                  disabled={!newShelfName.trim()}
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
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={styles.shelfActionBtn}
                  onClick={() => handleDeleteShelf(shelf.id)}
                >
                  🗑
                </button>
              </>
            )}
          </div>
        </div>

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
            shelf.books.map((book) => (
              <img
                key={book.book_id || book.id}
                src={
                  book.cover_url ||
                  book.cover ||
                  'https://covers.openlibrary.org/b/id/8311267-L.jpg'
                }
                alt={book.title}
                className={styles.bookCover}
              />
            ))}
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
              <div className={styles.avatarCircle}>👤</div>
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
              <div className={styles.shelvesList}>{shelves.map(renderShelfCard)}</div>
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
                      style={{
                        background: '#fdf8f3',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                      }}
                    >
                      <strong style={{ color: '#5b3113' }}>
                        {item.book_title} · Chapter {item.page_number}
                      </strong>
                      <p style={{ margin: '4px 0 0', color: '#6d5b4f' }}>
                        &ldquo;{item.reaction}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {savedMessage && <p className={styles.saveFeedback}>{savedMessage}</p>}
        </div>
      )}

      {view === 'edit' && (
        <div className={styles.subView}>
          <button type="button" className={styles.backBtn} onClick={() => setView('main')}>
            ← Edit Profile
          </button>
          <div className={styles.avatarWrapperCenter}>
            <div className={styles.avatarCircle}>👤</div>
            <div className={styles.editBadgeCenter}>✎</div>
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
            <p className={styles.sectionHeader}>NOTIFICATIONS</p>
            <div className={styles.settingToggleItem}>
              <span>Reading Reminders</span>
              <input
                type="checkbox"
                className={styles.toggleSwitch}
                checked={readingReminders}
                onChange={(e) => setReadingReminders(e.target.checked)}
              />
            </div>
            <div className={styles.settingToggleItem}>
              <span>New Recommendations</span>
              <input
                type="checkbox"
                className={styles.toggleSwitch}
                checked={newRecommendations}
                onChange={(e) => setNewRecommendations(e.target.checked)}
              />
            </div>
          </div>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>SUPPORT</p>
            <button type="button" className={styles.settingItem}>
              <span>Help Center &amp; Contact</span> <span>›</span>
            </button>
          </div>

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

      {showNewShelfModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewShelfModal(false)}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-create-shelf-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.modalTitle} id="profile-create-shelf-title">
              Create a new shelf
            </h2>
            <p className={styles.modalSubtitle}>
              Make your own shelf to organize your books however you like.
            </p>
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

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="profile-shelf-description">
                  Description (optional)
                </label>
                <textarea
                  id="profile-shelf-description"
                  className={`${styles.fieldInput} ${styles.textArea}`}
                  value={newShelfDescription}
                  onChange={(e) => setNewShelfDescription(e.target.value)}
                  placeholder="A short description of this shelf"
                  rows={3}
                />
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
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-add-books-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.modalTitle} id="profile-add-books-title">
              Add books
            </h2>
            <p className={styles.modalSubtitle}>
              Search for a book, then tap it to add it to{' '}
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
                    <span>{book.title}</span>
                    <span>{isAdded ? '✓ Added' : '›'}</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.modalDivider} />

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="profile-new-shelf-name">
                Or create a new shelf with the last book you added
              </label>
              <input
                id="profile-new-shelf-name"
                type="text"
                className={styles.fieldInput}
                value={newShelfName}
                onChange={(e) => {
                  setNewShelfName(e.target.value);
                  if (newShelfNameValidation) setNewShelfNameValidation('');
                }}
                placeholder="e.g. Cozy Autumn Reads"
              />
              {newShelfNameValidation && (
                <p className={styles.errorText}>{newShelfNameValidation}</p>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowAddBookModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                disabled={
                  !lastAddedBook || isCreatingShelf || !newShelfName.trim()
                }
                onClick={handleCreateShelfFromAddBook}
              >
                {isCreatingShelf
                  ? 'Creating…'
                  : 'Create New Shelf & Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}