import './App.css'
import { Quiz } from './quiz/Quiz'

function App() {
  return (
  <Quiz
    onSkip={(result) => {
      console.log('Onboarding result:', result)
    }}
  />
)
}

export default App