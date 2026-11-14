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
import { supabase } from './supabaseClient'
import ReviewsPreview from './components/Reviews/ReviewsPreview'
import ReadingTimer from './components/Timer/Timer'

function App() {
  const { user, logout, loading, savePreferences } = useAuth()
  const [checkingQuiz, setCheckingQuiz] = useState(true)
  const [view, setView] = useState(() =>
    window.location.pathname === '/reset-password' ? 'reset' : 'login') // Possible views: 'login', 'create', 'forgot', 'reset'
  useEffect(() => {
    if (loading) return;

    if (!user?.id) {
      setCheckingQuiz(false);
      return;
    }

    let cancelled = false;
    setCheckingQuiz(true);

    async function checkQuizHistory() {
      const { data, error } = await supabase
        .from('profiles')
        .select('reading_preferences')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Could not check quiz history:', error);
        setCheckingQuiz(false);
        return;
      }

      const completedQuiz =
        data?.reading_preferences &&
        Object.keys(data.reading_preferences).length > 0;

      const skippedQuiz =
        localStorage.getItem(`looseleaf_quiz_skipped_${user.id}`) === 'true';

        const savedQuizStep = localStorage.getItem('looseleaf_quiz_step');

        const hasUnfinishedQuiz =
          savedQuizStep === '1' || savedQuizStep === '2';
        
        setView(
          hasUnfinishedQuiz
            ? 'quiz'
            : completedQuiz || skippedQuiz
              ? 'home'
              : 'quiz'
        );
      setCheckingQuiz(false);
    }

    checkQuizHistory();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading]);

  if (loading || (user && checkingQuiz && view !== 'reset')) {
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

      <div className="app-content">
        {view === 'home' ? (
          <Home
            user={user}
            skippedQuiz={localStorage.getItem(`looseleaf_quiz_skipped_${user.id}`) === 'true'}
            onRetakeQuiz={() => {
              localStorage.setItem('looseleaf_quiz_step', '0')
              setView('quiz')
            }}
            onNavigateToSearch={() => setView('search')}
          />
        ) : view === 'search' ? (
          <Search />
        ) : view === 'profile' ? (
          <Profile user={user} logout={logout} />
        ) : view === 'timer' ? (
          <ReadingTimer />
        ) : view === 'reviews-preview' ? (
          <ReviewsPreview />
        ) : (
          <Quiz
  user={user}
  onBackToHome={() => setView('home')}
  onSkip={() => {
              localStorage.setItem(`looseleaf_quiz_skipped_${user.id}`, 'true')
              setView('home')
            }}
            onComplete={async (answers) => {
              try {
                localStorage.removeItem(`looseleaf_quiz_skipped_${user.id}`)
                if (savePreferences) {
                  await savePreferences(answers)
                }
              } catch (error) {
                console.error('Could not save quiz preferences:', error)
              } finally {
                setView('home')
              }
            }}
          />
        )}

        {view !== 'quiz' && (
          <nav className="bottom-nav" aria-label="Main navigation">
            <button
              type="button"
              className={view === 'home' ? 'active' : ''}
              onClick={() => setView('home')}
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
  onClick={() => setView('timer')}
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
              onClick={() => setView('reviews-preview')}
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
              onClick={() => setView('profile')}
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