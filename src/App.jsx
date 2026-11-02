import './App.css'
import { useState, useEffect } from 'react'
import { useAuth } from './account/useAuth'
import { CreateAccount } from './account/CreateAccount'
import ForgotPassword from './account/ForgotPassword'
import ResetPassword from './account/ResetPassword'
import { Login } from './account/Login'
import { Quiz } from './quiz/Quiz'
import { Home } from './home/Home'

function App() {
  const { user, logout, loading } = useAuth(false)
  const [view, setView] = useState(() =>
    window.location.pathname === '/reset-password' ? 'reset' : 'login')
  const [skipQuiz, setSkipQuiz] = useState(false)
  const [currentBook, setCurrentBook] = useState(null)
  const [showHome, setShowHome] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [hasTakenOrSkippedQuiz, setHasTakenOrSkippedQuiz] = useState(() => {
    const stored = localStorage.getItem('looseleaf_quiz_done')
    return stored === 'true'
  })

  // Redirect to home screen if user has already completed/skipped the quiz
  useEffect(() => {
    if (hasTakenOrSkippedQuiz && user && !skipQuiz) {
      setSkipQuiz(true)
    }
  }, [hasTakenOrSkippedQuiz, user, skipQuiz])

  if (loading) {
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
        ) : view === 'forgot' ? ( //Forgot password fucntion
          <ForgotPassword onNavigateToLogin={() => setView('login')} />
        ) : (
          <Login
            onNavigateToCreateAccount={() => setView('create')}
            onNavigateToForgotPassword={() => setView('forgot')} />
        )}
      </main>
    )
  }

  return (
    <main>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          background: '#fdf8f3',
          fontSize: '12px',
          fontWeight: '400',
          color: '#b69b8d'
        }}
      >
        <span>
          Welcome, {user.user_metadata?.full_name?.split(' ')[0] || user.email}!
        </span>
        <button
          type="button"
          onClick={() => {
            logout()
            setView('login')
          }}
          style={{
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: '#b69b8d',
            fontSize: '12px',
            fontWeight: '400',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          Sign out
        </button>
      </div>

      {showSearch ? (
        // Show the search screen
        <Search
          onBack={() => setShowSearch(false)}
          onHomeClick={() => setShowHome(true)}
        />
      ) : showHome ? (
        // Show the home screen with generalized book recommendations
        <Home
          user={user}
          currentBook={currentBook}
          onRetakeQuiz={() => setSkipQuiz(false)}
          onSelectBook={setCurrentBook}
          onHomeClick={() => setShowHome(true)}
          onSearchClick={() => setShowSearch(true)}
        />
      ) : (
        // Show the quiz
        <Quiz
          user={user}
          onSkip={() => {
            setSkipQuiz(true)
            // Mark quiz as done so next login goes straight to home
            localStorage.setItem('looseleaf_quiz_done', 'true')
          }}
          onComplete={() => {
            // Mark quiz as done so next login goes straight to home
            localStorage.setItem('looseleaf_quiz_done', 'true')
            setSkipQuiz(true)
          }}
        />
      )}
    </main>
  )
}

export default App