// src/App.jsx
//
// LooseLeaf application root.
// ATH-01 "Create Account" is the first screen. After the user creates an
// account, we redirect them to the reading-preference quiz (see Quiz.jsx).

import { useState } from 'react';
import { Quiz } from './quiz/Quiz';
import { CreateAccount } from './account/CreateAccount';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (isAuthenticated) {
    return <Quiz />;
  }

  return <CreateAccount onAccountCreated={() => setIsAuthenticated(true)} />;
}
