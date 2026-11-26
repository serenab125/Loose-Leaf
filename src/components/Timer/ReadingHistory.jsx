import { useState, useEffect } from 'react';
import {
  getReadingSessions,
  getJournalEntries,
  saveJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  deleteReadingSession
} from '../../services/readingHistoryService';
import './ReadingHistory.css';
import { searchBooksByTitle } from '../../services/bookService';
import AppDialog from '../Dialog/AppDialog';

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [
    h && `${h} hr`,
    m && `${m} min`,
    s && `${s} sec`
  ].filter(Boolean).join(' ') || '0 sec';
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function ReadingHistory({
  user, refreshKey, view, setView
}) {
  const [sessions, setSessions] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const [deletingSession, setDeletingSession] = useState(false);

  async function handleDeleteSession(id) {
    if (deletingSession) return;

    setDeletingSession(true);
    setDeleteSessionId(null);
    setError('');

    try {
      await deleteReadingSession(id, user.id);

      setSessions(previous =>
        previous.filter(session => session.id !== id)
      );

      setEntries(previous =>
        previous.map(entry =>
          entry.session_id === id
            ? { ...entry, session_id: null }
            : entry
        )
      );
    } catch {
      setError('Unable to delete your reading session. Please try again.');
    } finally {
      setDeletingSession(false);
    }
  }

  const [sessionId, setSessionId] = useState(null);
  const [bookTitle, setBookTitle] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookResults, setBookResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    setBookResults([]);
    setSearchError('');
    setSearchLoading(false);

    if (view !== 'write' || selectedBook || bookTitle.trim().length < 2) return;

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setSearchLoading(true);

      try {
        const results = await searchBooksByTitle(bookTitle.trim());
        if (!cancelled) setBookResults(results.slice(0, 6));
      } catch {
        if (!cancelled) {
          setSearchError('Search unavailable. You can still enter a title manually.');
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [bookTitle, selectedBook, view]);

  const [journalText, setJournalText] = useState('');

  useEffect(() => {
    if (!user?.id || !view) return;

    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      getReadingSessions(user.id),
      getJournalEntries(user.id)
    ])
      .then(([sessionData, journalData]) => {
        if (!active) return;
        setSessions(sessionData);
        setEntries(journalData);
      })
      .catch(() => {
        if (active) setError('Unable to load your reading history.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user?.id, view, refreshKey]);

  function openJournal(session = null, entry = null) {
    setEditingId(entry?.id ?? null);
    setSessionId(entry?.session_id ?? session?.id ?? null);
    setBookTitle(entry?.book_title ?? '');
    setSelectedBook(entry?.book_id ? {
      bookId: entry.book_id,
      title: entry.book_title,
      author: entry.book_author,
      coverUrl: entry.cover_url
    } : null);
    setBookResults([]);
    setJournalText(entry?.journal_text ?? '');
    setError('');
    setView('write');
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!bookTitle.trim() || !journalText.trim() || saving) return;

    setSaving(true);
    setError('');

    const values = {
      book_title: bookTitle.trim(),
      book_id: selectedBook?.bookId || selectedBook?.id || null,
      book_author: selectedBook?.author || null,
      cover_url: selectedBook?.coverUrl || selectedBook?.cover || null,
      journal_text: journalText.trim(),
      session_id: sessionId
    };

    try {
      if (editingId) {
        await updateJournalEntry(editingId, user.id, values);
      } else {
        await saveJournalEntry({
          ...values,
          user_id: user.id
        });
      }

      setView('journal');
    } catch {
      setError('Unable to save your entry. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleteId(null);
    setError('');

    try {
      await deleteJournalEntry(id, user.id);
      setEntries(previous => previous.filter(entry => entry.id !== id));
    } catch {
      setError('Unable to delete your entry.');
    }
  }

  return (
    <section className={`rh-section ${view ? 'rh-full-screen' : ''}`}>
      {view && (
        <div className="rh-screen-header">
          <button
            type="button"
            aria-label="Go back"
            disabled={saving}
            onClick={() => setView(view === 'write'
              ? (sessionId && !editingId ? 'log' : 'journal')
              : null)}
          >
            ← Back
          </button>
          <span>❀</span>
        </div>
      )}

      {!view && (
        <>
      <div className="rh-heading">
        <span>❀</span>
        <h2>Your Reading Journey</h2>
        <span>❀</span>
      </div>

      <button
        className="rh-menu rh-log-menu"
        onClick={() => setView(view === 'log' ? null : 'log')}
        disabled={saving}
        aria-expanded={view === 'log'}
      >
        <span className="rh-symbol">◷</span>
        <span>
          <strong>My Reading Log</strong>
          <small>Every page is a little progress.</small>
        </span>
        <span>›</span>
      </button>

      <button
        className="rh-menu rh-journal-menu"
        onClick={() => setView(view === 'journal' ? null : 'journal')}
        disabled={saving}
        aria-expanded={view === 'journal'}
      >
        <span className="rh-symbol">✎</span>
        <span>
          <strong>My Reading Journal</strong>
          <small>A space for your bookish thoughts.</small>
        </span>
        <span>›</span>
      </button>

        </>
      )}

      {error && <p className="rh-error" role="alert">{error}</p>}

      {view && loading && <p>Loading your reading journey...</p>}

      {view === 'log' && !loading && (
        <div className="rh-content">
          <h2>Reading Log</h2>

          {!error && sessions.length === 0 && (
            <p>Your reading journey starts here.
              Complete a reading session to see it in your log.
            </p>
          )}

          {sessions.map(session => (
            <article className="rh-session" key={session.id}>
              <strong>{formatDate(session.started_at)}</strong>
              <small>
                {formatTime(session.started_at)} to {formatTime(session.ended_at)}
              </small>
              <div className="rh-session-details">
                <span>{formatDuration(session.duration_seconds)}</span>
                <small>
                  {session.completed ? 'Completed' : 'Ended early'}
                </small>
              </div>
              {entries.filter(entry => entry.session_id === session.id).map(entry => (
                <div className="rh-linked-entry" key={entry.id}>
                  <small>✎ Journal Entry</small>
                  <div className="rh-entry-book">
                    {entry.cover_url && (
                      <img src={entry.cover_url} alt="" />
                    )}
                    <div>
                      <h3>{entry.book_title}</h3>
                      {entry.book_author && <small>{entry.book_author}</small>}
                    </div>
                  </div>
                  <p>{entry.journal_text}</p>
                  <button
                    className="rh-text-button"
                    onClick={() => openJournal(session, entry)}
                  >
                    View / Edit Journal Entry
                  </button>
                </div>
              ))}


              <button
                type="button"
                className="rh-delete-session"
                disabled={deletingSession}
                onClick={() => setDeleteSessionId(session.id)}
              >
                Delete Session
              </button>

              {!entries.some(entry => entry.session_id === session.id) && (
                <button
                  className="rh-text-button"
                  onClick={() => openJournal(session)}
                >
                  ✎ Journal about this session
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {view === 'journal' && !loading && (
        <div className="rh-content">
          <h2>My Reading Journal</h2>
          <p className="rh-subtitle">Just between you and your books.</p>

          <button
            className="rh-primary"
            onClick={() => openJournal()}
          >
            + New Journal Entry
          </button>

          {!error && entries.length === 0 && (
            <p>Your notebook is waiting for its first story.</p>
          )}

          {entries.map(entry => (
            <article className="rh-notebook" key={entry.id}>
              <small>{formatDate(entry.created_at)}</small>
              <div className="rh-entry-book">
                    {entry.cover_url && (
                      <img src={entry.cover_url} alt="" />
                    )}
                    <div>
                      <h3>{entry.book_title}</h3>
                      {entry.book_author && <small>{entry.book_author}</small>}
                    </div>
                  </div>
              <p className="rh-entry-text">{entry.journal_text}</p>
              <div className="rh-entry-actions">
                <button onClick={() => openJournal(null, entry)}>
                  Edit
                </button>
                <button onClick={() => setDeleteId(entry.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {view === 'write' && (
        <form className="rh-notebook rh-form" onSubmit={handleSave}>
          <h2>{editingId ? 'Edit Your Entry' : 'A Moment to Reflect'}</h2>
          <small>❀ Your private reading journal ❀</small>

          {sessionId && <small>Linked to a reading session</small>}

          <label htmlFor="rh-book-title">What are you reading?</label>
          <input
            id="rh-book-title"
            value={bookTitle}
            onChange={event => {
              setSelectedBook(null);
              setBookTitle(event.target.value);
            }}
            placeholder="Search or enter a book title"
            maxLength={300}
            required
          />


          {selectedBook ? (
            <div className="rh-book-result">
              {selectedBook.coverUrl && (
                <img src={selectedBook.coverUrl} alt="" />
              )}
              <div>
                <strong>{selectedBook.title}</strong>
                <small>{selectedBook.author}</small>
                <small>✓ Book selected</small>
              </div>
            </div>
          ) : (
            <>
              {searchLoading && <small>Searching books...</small>}
              {searchError && <small>{searchError}</small>}

              {bookResults.length > 0 && (
                <div className="rh-book-results">
                  {bookResults.map((book, index) => (
                    <button
                      type="button"
                      key={book.bookId || book.id || index}
                      className="rh-book-result"
                      onClick={() => {
                        setSelectedBook(book);
                        setBookTitle(book.title);
                        setBookResults([]);
                      }}
                    >
                      {book.coverUrl && (
                        <img src={book.coverUrl} alt="" />
                      )}
                      <div>
                        <strong>{book.title}</strong>
                        <small>{book.author}</small>
                      </div>
                      <span>+</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <label htmlFor="rh-journal-text">Dear journal...</label>
          <textarea
            id="rh-journal-text"
            value={journalText}
            onChange={event => setJournalText(event.target.value)}
            placeholder="What stood out to you today?"
            rows={8}
            maxLength={10000}
            required
          />

          <button className="rh-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Journal Entry'}
          </button>

          <button
            type="button"
            className="rh-text-button"
            disabled={saving}
            onClick={() => setView('journal')}
          >
            Cancel
          </button>
        </form>
      )}

      {deleteSessionId !== null && (
        <AppDialog
          title="Delete Reading Session?"
          message="This reading session will be permanently removed. Any linked journal entries will remain in your Reading Journal."
          confirmLabel="Delete Session"
          destructive
          onCancel={() => setDeleteSessionId(null)}
          onConfirm={() => handleDeleteSession(deleteSessionId)}
        />
      )}

      {deleteId !== null && (
        <AppDialog
          title="Delete Journal Entry?"
          message="Are you sure you want to delete this journal entry? This cannot be undone."
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleteId(null)}
          onConfirm={() => handleDelete(deleteId)}
        />
      )}
    </section>
  );
}
