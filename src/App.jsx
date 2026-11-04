import './App.css';
import { useState } from 'react';
import { useAuth } from './account/useAuth';
import { CreateAccount } from './account/CreateAccount';
import ForgotPassword from './account/ForgotPassword';
import ResetPassword from './account/ResetPassword';
import { Login } from './account/Login';
import { Quiz } from './quiz/Quiz';
import { Home } from './home/Home';
import { hasIncompleteQuizProgress } from './services/quizService';

function App() {
  // Persist rememberMe and hasLoggedIn so they survive page refreshes/reloads.
  // This is essential for "Remember me" to keep the user signed in across tabs.
  const [rememberMe, setRememberMe] = useState(() => {
    const saved = localStorage.getItem('looseleaf_remember_me');
    return saved === 'true';
  });
  const [hasLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('looseleaf_hasLoggedIn');
    return saved === 'true';
  });
  const setRememberMeState = (value) => {
    localStorage.setItem('looseleaf_remember_me', value ? 'true' : 'false');
    setRememberMe(value);
  };
  const setHasLoggedInState = (value) => {
    localStorage.setItem('looseleaf_hasLoggedIn', value ? 'true' : 'false');
    setIsLoggedIn(value);
  };

  // Determine whether the session should persist across refreshes.
  // "Remember me" ON  -> persistSession=true, the Supabase client saves the
  //                     session to localStorage so the user stays signed in
  //                     after the browser is closed and reopened.
  // "Remember me" OFF -> persistSession=false, the session lives only in memory
  //                     and is cleared when the tab closes.
  const persistSession = rememberMe;

  // restoreSession determines whether the session is restored on app load.
  // If the user has logged in before (hasLoggedIn), the session is restored
  // so the user is taken straight to the home screen after a refresh.
  const restoreSession = hasLoggedIn;

  const { user, logout, loading, savePreferences, supabase: appSupabase } =
    useAuth(persistSession, restoreSession);

  const [redirectToQuiz, setRedirectToQuiz] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(true);
  const [view, setView] = useState(() => {
    if (window.location.pathname === '/reset-password') return 'reset'
    return 'login'
  });

  // Check for incomplete quiz progress on app load when user is authenticated
  useState(() => {
    if (user?.id) {
      hasIncompleteQuizProgress(user.id)
        .then((hasProgress) => {
          if (hasProgress) {
            setRedirectToQuiz(true);
          }
        })
        .catch((err) => {
          console.error('Error checking quiz progress:', err);
        });
    }
  });

  if (loading) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf8f3' }}>
        <p style={{ color: '#5b3113', fontFamily: 'Georgia, serif' }}>Loading LooseLeaf...</p>
      </main>
    );
  }

  if (view === 'reset') {
    return (
      <main>
        <ResetPassword />
      </main>
    );
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
            rememberMe={rememberMe}
            setRememberMe={setRememberMeState}
            onLogin={() => {
              setIsLoggedIn(true);
              setHasLoggedInState(true);
            }}
          />
        )}
      </main>
    );
  }

  // If there is incomplete quiz progress, redirect to the quiz
  if (redirectToQuiz) {
    return (
      <main>
        <Quiz
          user={user}
          onSkip={() => {}}
          onComplete={() => setRedirectToQuiz(false)}
          userId={user.id}
          supabaseClient={appSupabase}
        />
      </main>
    );
  }

  const handleQuizComplete = async (quizAnswers) => {
    try {
      if (savePreferences) {
        await savePreferences(quizAnswers);
      }
    } catch (err) {
      console.error('Error saving quiz results:', err);
    } finally {
      setIsQuizCompleted(true);
    }
  };

  const handleQuizSkip = () => {
    setIsQuizCompleted(true);
  };

  if (!isQuizCompleted) {
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
            onClick={logout}
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

        <Quiz
          user={user}
          onSkip={handleQuizSkip}
          onComplete={handleQuizComplete}
          supabaseClient={appSupabase}
        />
      </main>
    );
  }

  return (
    <main>
      <Home
        user={user}
        logout={logout}
        currentBook={null}
        onRetakeQuiz={() => {
          setRedirectToQuiz(false);
          setIsQuizCompleted(true);
        }}
        onNavigateToSearch={() => {}}
        onSelectBook={() => {}}
      />
    </main>
  );
}

export default App;
