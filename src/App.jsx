import './App.css';
import { useState } from 'react';
import { useAuth } from './account/useAuth';
import { CreateAccount } from './account/CreateAccount';
import ForgotPassword from './account/ForgotPassword';
import ResetPassword from './account/ResetPassword';
import { Login } from './account/Login';
import { Quiz } from './quiz/Quiz';
import { Home } from './home/Home';
import Search from './pages/Search/Search';

function App() {
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('looseleaf_remember_me') === 'true';
    }
    return false;
  });

  const [view, setView] = useState('login');
  const [isQuizCompleted, setIsQuizCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('looseleaf_quiz_completed') === 'true';
    }
    return false;
  });
  const [activePage, setActivePage] = useState('home');
  const [skipQuiz] = useState(false);
  const [currentBook, setCurrentBook] = useState(null);

  const handleRememberMeChange = (checked) => {
    setRememberMe(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('looseleaf_remember_me', String(checked));
    }
  };

  // Only persistSession is a parameter now. No restoreSession.
  const { user, login, logout, loading, savePreferences } = useAuth(rememberMe);

  // Handle recovery link before anything else.
  if (typeof window !== 'undefined' && window.location.pathname === '/reset-password') {
    return (
      <main>
        <ResetPassword />
      </main>
    );
  }

  if (loading) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf8f3' }}>
        <p style={{ color: '#5b3113', fontFamily: 'Georgia, serif' }}>Loading LooseLeaf...</p>
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
            setRememberMe={handleRememberMeChange}
            onSuccess={() => setView('home')}
            signIn={login}
            loading={loading}
          />
        )}
      </main>
    );
  }

  const handleQuizComplete = async (quizAnswers) => {
    try {
      if (savePreferences) await savePreferences(quizAnswers);
    } catch (err) {
      console.error('Error saving quiz results:', err);
    } finally {
      setIsQuizCompleted(true);
      localStorage.setItem('looseleaf_quiz_completed', 'true');
    }
  };

  const handleQuizSkip = async () => {
    setIsQuizCompleted(true);
    localStorage.setItem('looseleaf_quiz_completed', 'true');
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
            color: '#b69b8d',
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
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
        <Quiz user={user} onSkip={handleQuizSkip} onComplete={handleQuizComplete} />
      </main>
    );
  }

  return (
    <main>
      {activePage === 'search' ? (
        <>
          <button type="button" onClick={() => setActivePage('home')} style={{ margin: '16px', padding: '10px 16px', cursor: 'pointer' }}>
            ← Back to Home
          </button>
          <Search onSelectBook={(book) => setCurrentBook(book)} />
        </>
      ) : (
        <Home
          user={user}
          logout={logout}
          currentBook={currentBook}
          onRetakeQuiz={() => {
            setActivePage('home');
            setIsQuizCompleted(false);
          }}
          onNavigateToSearch={() => setActivePage('search')}
          onSelectBook={(book) => setCurrentBook(book)}
          skipQuiz={skipQuiz}
        />
      )}
    </main>
  );
}

export default App;
