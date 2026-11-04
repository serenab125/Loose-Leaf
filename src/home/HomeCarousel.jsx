
import { useEffect, useRef, useState } from 'react'
import RetakeQuizCard from './RetakeQuizCard'
import CurrentRead from './CurrentRead'
import TopRecommendationCard from './TopRecommendationCard'
import { fetchPersonalizedRecommendations } from '../services/bookService'
import './home.css'

function HomeCarousel({ user, onRetakeQuiz, onNavigateToSearch }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [recommendedBook, setRecommendedBook] = useState(null)
  const [recommendationLoading, setRecommendationLoading] = useState(true)

  // Track touch and mouse dragging
  const dragStartX = useRef(null)
  const dragStartY = useRef(null)
  const isDragging = useRef(false)
  const preventClick = useRef(false)

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

  // Loop continuously through all three slides
  const nextSlide = () => {
    setActiveSlide((previous) => (previous + 1) % 3)
  }

  const previousSlide = () => {
    setActiveSlide((previous) => (previous - 1 + 3) % 3)
  }

  // Detect when a swipe or drag begins
  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    dragStartX.current = event.clientX
    dragStartY.current = event.clientY
    isDragging.current = true
    preventClick.current = false
  }

  // Determine whether the user swiped left or right
  const handlePointerUp = (event) => {
    if (!isDragging.current || dragStartX.current === null) return

    const differenceX = event.clientX - dragStartX.current
    const differenceY = event.clientY - dragStartY.current

    isDragging.current = false
    dragStartX.current = null
    dragStartY.current = null

    // Ignore small movements and vertical scrolling
    if (
      Math.abs(differenceX) < 50 ||
      Math.abs(differenceX) <= Math.abs(differenceY)
    ) {
      return
    }

    preventClick.current = true

    if (differenceX < 0) {
      nextSlide()
    } else {
      previousSlide()
    }
  }

  const handlePointerCancel = () => {
    isDragging.current = false
    dragStartX.current = null
    dragStartY.current = null
  }

  // Stop card buttons from activating after a swipe
  const handleClickCapture = (event) => {
    if (preventClick.current) {
      event.preventDefault()
      event.stopPropagation()
      preventClick.current = false
    }
  }

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
      <div
        className="home-carousel-content"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleClickCapture}
      >
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
