import './App.css'
import { useState } from 'react'
import { useAuth } from './account/useAuth'
import { CreateAccount } from './account/CreateAccount'
import { Login } from './account/Login'
import { Quiz } from './quiz/Quiz'

function App() {
  const { user, logout, loading } = useAuth()
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

      <Quiz onSkip={() => console.log('Quiz skipped')} />
    </main>
  )
}

export default App