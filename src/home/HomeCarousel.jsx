import { useEffect, useState } from 'react'
import RetakeQuizCard from './RetakeQuizCard'
import CurrentRead from './CurrentRead'
import TopRecommendationCard from './TopRecommendationCard'
import './home.css'
import { fetchPersonalizedRecommendations } from '../services/bookService'

function HomeCarousel({ user,onRetakeQuiz, onNavigateToSearch }) {
  const [activeSlide, setActiveSlide] = useState(0)

  const [recommendedBook, setRecommendedBook] = useState(null)
  const [recommendationLoading, setRecommendationLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadRecommendation() {
      setRecommendationLoading(true)

      try {
        const result = await fetchPersonalizedRecommendations(user?.id)

        if (!cancelled) {
          setRecommendedBook(result.books?.[0] ?? null)
        }
      } catch (error) {
        console.error('Unable to load recommendation:', error)

        if (!cancelled) {
          setRecommendedBook(null)
        }
      } finally {
        if (!cancelled) {
          setRecommendationLoading(false)
        }
      }
    }
  

    loadRecommendation()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const slides = [
    <CurrentRead
      key="current"
      onNavigateToSearch={onNavigateToSearch}
    />,

    recommendationLoading ? (
      <p key="recommendation-loading" role="status">
        Finding your next favorite book...
      </p>
    ) : (
      <TopRecommendationCard
        key="recommendation"
        book={recommendedBook}
        onStartReading={(book) => {
          console.log('Start reading:', book)
        }}
      />
    ),

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