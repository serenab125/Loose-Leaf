import { useState } from 'react'
import RetakeQuizCard from './RetakeQuizCard'
import CurrentRead from './CurrentRead'
import TopRecommendationCard from './TopRecommendationCard'
import './home.css'

function HomeCarousel({ onRetakeQuiz, onNavigateToSearch }) {
  const [activeSlide, setActiveSlide] = useState(0)

  const slides = [
    <CurrentRead key="current" 
    onNavigateToSearch={onNavigateToSearch}
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