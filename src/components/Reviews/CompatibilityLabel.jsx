
import './CompatibilityLabel.css'

export default function CompatibilityLabel({ score }) {
  if (
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    return null
  }

  return (
    <span className="compatibility-label">
      {Math.round(score)}% Match
    </span>
  )
}
