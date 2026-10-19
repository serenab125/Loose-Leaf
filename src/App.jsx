import './App.css'
import { useState } from 'react'
import { useAuth } from './account/useAuth'
import { CreateAccount } from './account/CreateAccount'
import { Login } from './account/Login'
import { Quiz } from './quiz/Quiz'

function App() {
  const { user, logout, loading, savePreferences } = useAuth()
  const [view, setView] = useState('login')

  if (loading) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf8f3' }}>
        <p style={{ color: '#5b3113', fontFamily: 'Georgia, serif' }}>Loading LooseLeaf...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main>
        {view === 'create' ? (
          <CreateAccount onNavigateToLogin={() => setView('login')} />
        ) : (
          <Login onNavigateToCreateAccount={() => setView('create')} />
        )}
      </main>
    )
  }

  const handleQuizComplete = async (quizAnswers) => {
    try {
      if (savePreferences) {
        await savePreferences(quizAnswers)
        console.log('Successfully saved reading preferences to Supabase!')
      } else {
        console.log('Quiz completed with answers:', quizAnswers)
      }
      // TODO: Redirect to book recommendations or bookshelf view here
    } catch (err) {
      console.error('Error saving quiz results:', err)
    }
  }

  return (
    <main>
      <header style={{ 
        padding: '1rem 2rem', 
        display: 'flex', 
        justify: 'space-between', 
        alignItems: 'center',
        background: '#fdf8f3',
        borderBottom: '1px solid #eaeed8'
      }}>
        <span style={{ color: '#5b3113', fontWeight: '600' }}>
          Welcome, {user.user_metadata?.full_name || user.email}!
        </span>
        <button 
          type="button" 
          onClick={logout} 
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '12px', 
            border: 'none',
            background: '#5b3113',
            color: '#ffffff',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Sign Out
        </button>
      </header>

      <Quiz 
        onSkip={() => console.log('Quiz skipped')} 
        onComplete={handleQuizComplete} 
      />
    </main>
  )
}

export default App