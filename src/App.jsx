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
import { getIncompleteQuizProgress } from './services/quizService'

const skippedQuizKey = (userId) => `looseleaf_quiz_skipped_${userId}`

function readSkippedQuiz(userId) {
  return localStorage.getItem(skippedQuizKey(userId)) === 'true'
}

function App() {
  const { user, logout, initializing } = useAuth()

  const [currentBook, setCurrentBook] = useState(null)
  const [isRetakingQuiz, setIsRetakingQuiz] = useState(false)
  const [savedQuizProgress, setSavedQuizProgress] = useState(null)

  const [themePreference, setThemePreference] = useState({
    userId: null,
    enabled: false
  })

  const darkMode = Boolean(
    user?.id &&
    themePreference.userId === user.id &&
    themePreference.enabled
  )

  useEffect(() => {
    let cancelled = false

    if (!user?.id || initializing) return

    async function loadTheme() {
      const { data, error } = await supabase
        .from('profiles')
        .select('dark_mode')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Could not load theme preference:', error)
        return
      }

      setThemePreference({
        userId: user.id,
        enabled: data?.dark_mode === true
      })
    }

    loadTheme()

    return () => { cancelled = true }
  }, [user?.id, initializing])

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  const setDarkMode = async (enabled) => {
    if (!user?.id) return

    const userId = user.id
    const previous = darkMode

    setThemePreference({ userId, enabled })

    const { data, error } = await supabase
      .from('profiles')
      .update({ dark_mode: enabled })
      .eq('id', userId)
      .select('id')
      .single()

    if (error || !data) {
      console.error('Could not save theme preference:', error)
      setThemePreference(current =>
        current.userId === userId && current.enabled === enabled
          ? { userId, enabled: previous }
          : current
      )
    }
  }

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
    setSavedQuizProgress(null)
    setIsRetakingQuiz(false)
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

      const draft = await getIncompleteQuizProgress(user.id, {
        client: supabase
      })

      if (cancelled) return

      setSavedQuizProgress(
        draft
          ? { step: draft.current_step === 2 ? 2 : 1, answers: draft.answers || {} }
          : { step: 0, answers: data?.reading_preferences || {} }
      )

      setView(
        draft || completedQuiz || readSkippedQuiz(user.id)
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
              setIsRetakingQuiz(true)
              setView('quiz')
            }}
            onNavigateToSearch={() => setView('search')}
            onNavigateToTimer={() => setView('timer')}
            onSelectBook={(book) => setCurrentBook(book)}
          />
        ) : view === 'search' ? (
          <Search onSelectBook={(book) => setCurrentBook(book)} />
        ) : view === 'profile' ? (
          <Profile
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            user={user}
            logout={handleLogout}
            onSelectBook={(book) => setCurrentBook(book)}
          />
        ) : view === 'timer' ? (
          <ReadingTimer key={user.id} user={user} />
        ) : view === 'reviews-preview' ? (
          <ReviewsPreview />
        ) : (
          <Quiz
            key={user.id}
            user={user}
            isRetake={isRetakingQuiz}
            savedProgress={savedQuizProgress}
            onProgressSaved={(progress) => {
              setSavedQuizProgress(progress)
            }}
            onExit={() => {
              setIsRetakingQuiz(false)
              setView('home')
            }}
            onSkip={() => {
              setIsRetakingQuiz(false)
              localStorage.setItem(skippedQuizKey(user.id), 'true')
              setView('home')
            }}
            onComplete={(answers) => {
              setSavedQuizProgress({ step: 0, answers })
              setIsRetakingQuiz(false)
              localStorage.removeItem(skippedQuizKey(user.id))
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