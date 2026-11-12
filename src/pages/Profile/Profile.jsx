import React, { useState, useEffect, useCallback } from 'react';
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

export function Profile({ user, logout }) {
  const [view, setView] = useState('main');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState(
    'Book lover, tea enthusiast, and collector of dog-eared paperbacks. Always chasing a new good read.'
  );
  const [email, setEmail] = useState('');
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
  const [selectedBook, setSelectedBook] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');

  // New shelf creation state
  const [showNewShelfModal, setShowNewShelfModal] = useState(false);
  const [newShelfNameValidation, setNewShelfNameValidation] = useState('');

  // FIX Bug 6: stable loadShelves
  const loadShelves = useCallback(async () => {
    if (!user) return;
    try {
      const userShelves = await fetchUserShelvesWithBooks(user.id);
      setShelves(userShelves);
    } catch (err) {
      console.error('Failed to load shelves:', err);
      setSaveMessage('Error loading shelves.');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setFullName(user.user_metadata?.full_name || 'Jane Reader');
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
      }
      loadProfileData();
      loadShelves(); // FIX Bug 1
    }
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
        setShelves((prev) => [...prev, created]);
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

  const handleAddBook = async (shelfId, book) => {
    if (!user) return;
    try {
      await addBookToShelf(
        user.id,
        shelfId,
        book.bookId || book.id,
        book.title,
        book.author,
        book.coverUrl || book.cover
      );
      setShowAddBookModal(false);
      setSelectedBook(null); // FIX Bug 3
      setSearchQuery('');
      setSearchResults([]);
      setSearchError('');
      await loadShelves();
      setSavedMessage('Book added to shelf.');
      setTimeout(() => setSavedMessage(''), 2000);
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
    setSelectedBook(null);
    setShowAddBookModal(true);
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
              <input type="email" className={styles.fieldInput} value={email} disabled />
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
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* FIX Bug 11 */}
            <h2 className={styles.modalTitle}>Create a New Shelf</h2>
            <form onSubmit={handleCreateShelf}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Shelf Name</label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={newShelfName}
                  onChange={(e) => {
                    setNewShelfName(e.target.value);
                    if (newShelfNameValidation) setNewShelfNameValidation('');
                  }}
                  placeholder="e.g. Favorites, Current Reads, To Read"
                  autoFocus
                />
                {newShelfNameValidation && (
                  <p className={styles.errorText}>{newShelfNameValidation}</p>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Description (optional)</label>
                <textarea
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
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Books</h2>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Search by Title</label>
              <input
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

            <div style={{ marginTop: 16 }}>
              {searchResults.map((book) => (
                <div
                  key={book.id || book.bookId}
                  className={styles.settingItem}
                  style={{ marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => setSelectedBook(book)}
                >
                  <span>{book.title}</span>
                  <span>›</span>
                </div>
              ))}
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
                disabled={!selectedBook}
                onClick={() => handleAddBook(addBookShelfId, selectedBook)}
              >
                Add to Shelf
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}