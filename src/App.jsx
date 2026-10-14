import { useState } from 'react';
import { Login } from './account/Login';
import { CreateAccount } from './account/CreateAccount';

export function App() {
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  if (showCreateAccount) {
    return <CreateAccount onNavigateToLogin={() => setShowCreateAccount(false)} />;
  }

  return <Login onNavigateToCreateAccount={() => setShowCreateAccount(true)} />;
}
