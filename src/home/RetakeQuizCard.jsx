import './home.css'

function RetakeQuizCard({ onRetakeQuiz }) {
  return (
    <section className="retake-quiz-card">
      <p className="retake-quiz-label">MOOD CHANGED?</p>

      <h2>Retake your quiz</h2>

      <p>
        Answer again and we'll refresh everything on your shelf.
      </p>

      <button
        type="button"
        onClick={onRetakeQuiz}
      >
        Retake Quiz
      </button>
    </section>
  )
}

export default RetakeQuizCard