import { useState } from 'react'

function MoodQuestion() {
  const vibeOptions = [
    'Cozy & Comforting',
    'Funny & Light',
    'Romantic',
    'Emotional',
    'Dark & Mysterious',
    'Exciting',
    'Thought-provoking',
    'Surprise me!',
  ]

  const [selectedVibes, setSelectedVibes] = useState([])

  const toggleVibe = (vibe) => {
    if (selectedVibes.includes(vibe)) {
      setSelectedVibes(selectedVibes.filter((item) => item !== vibe))
    } else {
      setSelectedVibes([...selectedVibes, vibe])
    }
  }

  return (
    <section>
      <p>5 VIBE</p>

      <h2>What kind of stories are you looking for?</h2>

      <p>We can always change it later.</p>

      <div>
        {vibeOptions.map((vibe) => (
          <button
            key={vibe}
            type="button"
            onClick={() => toggleVibe(vibe)}
          >
            {vibe}
          </button>
        ))}
      </div>
    </section>
  )
}

export default MoodQuestion