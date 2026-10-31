import { useState } from 'react'
import RetakeQuizCard from './RetakeQuizCard'
import CurrentReadCard from './CurrentReadCard'
import TopRecommendationCard from './TopRecommendationCard'
import './home.css'

function HomeCarousel({ onRetakeQuiz }) {
  const [activeSlide, setActiveSlide] = useState(2)

  const slides = [
    <CurrentReadCard
      key="current"
      book={null}
      onPickBook={() => alert('Pick a book clicked!')}
    />,
    <TopRecommendationCard
      key="recommendation"
      book={null}
      onStartReading={(book) => {
        console.log('Start reading:', book)
      }}
    />,

    <RetakeQuizCard
      key="retake"
      onRetakeQuiz={onRetakeQuiz}
    />,
  ]

  return (
    <section className="home-carousel" aria-label="Homepage highlights">
      <div className="home-carousel-content">
        {slides[activeSlide]}
      </div>

      <div className="home-carousel-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`home-carousel-dot ${
              activeSlide === index ? 'active' : ''
            }`}
            onClick={() => setActiveSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={activeSlide === index ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  )
}

export default HomeCarousel