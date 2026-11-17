import './App.css'
import { useEffect, useState } from 'react'
import { useAuth } from './account/useAuth'
import { CreateAccount } from './account/CreateAccount'
import ForgotPassword from './account/ForgotPassword'
import ResetPassword from './account/ResetPassword'
import { Login } from './account/Login'
import { Quiz } from './quiz/Quiz'
import Search from './pages/Search/Search'
import { Home } from './home/Home'
import { Profile } from './pages/Profile/Profile'
import BookDetail from './pages/BookDetail/BookDetail'
import ReviewsPreview from './components/Reviews/ReviewsPreview'
import ReadingTimer from './components/Timer/Timer'
import { supabase } from './supabaseClient'
import { PROGRESS_KEY } from './quiz/useQuiz'

const skippedQuizKey = (userId) => `looseleaf_quiz_skipped_${userId}`

function readSkippedQuiz(userId) {
  return localStorage.getItem(skippedQuizKey(userId)) === 'true'
}

/**
 * A saved quiz counts as "unfinished" only while it is on a question step.
 * Step 0 is the introduction and step 3 is the loading/complete screen, so
 * neither should yank the user back into the quiz on every sign-in.
 */
function hasUnfinishedQuiz() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return false
    const step = JSON.parse(raw)?.step
    return step === 1 || step === 2
  } catch {
    return false
  }
}

function App() {
  const { user, logout, initializing } = useAuth()

  const [currentBook, setCurrentBook] = useState(null)
  const [view, setView] = useState(() => {
    if (window.location.pathname === '/reset-password') return 'reset'
    return 'login'
  })
  const [quizReady, setQuizReady] = useState(false)
  const [gateUserId, setGateUserId] = useState(null)

  // Re-run the quiz-history check whenever the signed-in user changes.
  // This is the React-endorsed "adjust state during render" pattern; doing it
  // in the effect body would be a synchronous setState on every mount.
  if (user?.id !== gateUserId) {
    setGateUserId(user?.id)
    setQuizReady(false)
  }

  useEffect(() => {
    if (initializing || !user?.id) return

    let cancelled = false

    async function checkQuizHistory() {
      const { data, error } = await supabase
        .from('profiles')
        .select('reading_preferences')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Could not check quiz history:', error)
        setView('home')
        setQuizReady(true)
        return
      }

      const completedQuiz = Boolean(
        data?.reading_preferences &&
          Object.keys(data.reading_preferences).length > 0
      )

      setView(
        hasUnfinishedQuiz()
          ? 'quiz'
          : completedQuiz || readSkippedQuiz(user.id)
            ? 'home'
            : 'quiz'
      )
      setQuizReady(true)
    }

    checkQuizHistory()

    return () => {
      cancelled = true
    }
  }, [user?.id, initializing])

  const handleLogout = async () => {
    await logout()
    setCurrentBook(null)
    setView('login')
  }

  const goTo = (nextView) => {
    setCurrentBook(null)
    setView(nextView)
  }

  if (initializing || (user && !quizReady && view !== 'reset')) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf8f3' }}>
        <p style={{ color: '#5b3113', fontFamily: 'Georgia, serif' }}>Loading LooseLeaf...</p>
      </main>
    )
  }

  if (view === 'reset') {
    return (
      <main>
        <ResetPassword />
      </main>
    )
  }

  if (!user) {
    return (
      <main>
        {view === 'create' ? (
          <CreateAccount onNavigateToLogin={() => setView('login')} />
        ) : view === 'forgot' ? (
          <ForgotPassword onNavigateToLogin={() => setView('login')} />
        ) : (
          <Login
            onNavigateToCreateAccount={() => setView('create')}
            onNavigateToForgotPassword={() => setView('forgot')}
          />
        )}
      </main>
    )
  }

  if (currentBook) {
    return (
      <main>
        <BookDetail
          book={currentBook}
          user={user}
          onBack={() => setCurrentBook(null)}
          onUpdateStatus={(book, status) => {
            console.log(`Updated ${book?.title} to status: ${status}`)
          }}
        />
      </main>
    )
  }

  return (
    <main>
      <div className="app-content">
        {view === 'home' ? (
          <Home
            user={user}
            skippedQuiz={readSkippedQuiz(user.id)}
            onRetakeQuiz={() => {
              localStorage.setItem(
                PROGRESS_KEY,
                JSON.stringify({ step: 0, answers: {} })
              )
              setView('quiz')
            }}
            onNavigateToSearch={() => setView('search')}
            onSelectBook={(book) => setCurrentBook(book)}
          />
        ) : view === 'search' ? (
          <Search onSelectBook={(book) => setCurrentBook(book)} />
        ) : view === 'profile' ? (
          <Profile
            user={user}
            logout={handleLogout}
            onSelectBook={(book) => setCurrentBook(book)}
          />
        ) : view === 'timer' ? (
          <ReadingTimer />
        ) : view === 'reviews-preview' ? (
          <ReviewsPreview />
        ) : (
          <Quiz
            user={user}
            onSkip={() => {
              localStorage.setItem(skippedQuizKey(user.id), 'true')
              localStorage.removeItem(PROGRESS_KEY)
              setView('home')
            }}
            onComplete={() => {
              localStorage.removeItem(skippedQuizKey(user.id))
              localStorage.removeItem(PROGRESS_KEY)
              setView('home')
            }}
          />
        )}

        {view !== 'quiz' && (
          <nav className="bottom-nav" aria-label="Main navigation">
            <button
              type="button"
              className={view === 'home' ? 'active' : ''}
              onClick={() => goTo('home')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </button>

            <button
              type="button"
              className={view === 'timer' ? 'active' : ''}
              onClick={() => goTo('timer')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Timer</span>
            </button>

            <button
              type="button"
              className={view === 'search' ? 'active' : ''}
              onClick={() => goTo('search')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search</span>
            </button>

            <button
              type="button"
              className={view === 'profile' ? 'active' : ''}
              onClick={() => goTo('profile')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Profile</span>
            </button>
          </nav>
        )}
      </div>
    </main>
  )
}

export default App