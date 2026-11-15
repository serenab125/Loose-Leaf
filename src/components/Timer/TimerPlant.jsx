
export default function TimerPlant({ stage = 0 }) {
    return (
      <svg
        width="110"
        height="130"
        viewBox="0 0 110 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Growing reading plant"
      >
        {/* Main stem */}
        <path
          d="M55 85V55"
          stroke="#727747"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
  
        {/* Stage 1: Small sprout */}
        {stage >= 1 && (
          <path
            d="M55 78Q37 78 33 62Q49 61 55 78ZM55 78Q72 77 77 61Q61 60 55 78Z"
            fill="#E4E8B9"
            stroke="#727747"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
  
        {/* Stage 2: Growing leaves */}
        {stage >= 2 && (
          <>
            <path
              d="M55 65Q37 63 35 47Q50 47 55 65ZM55 65Q73 63 76 47Q61 47 55 65Z"
              fill="#E4E8B9"
              stroke="#727747"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M55 55V35"
              stroke="#727747"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </>
        )}
  
        {/* Stage 3: Blooming flower */}
        {stage >= 3 && (
          <>
            <path
              d="M55 44Q44 34 47 24Q55 27 55 44ZM55 44Q66 34 63 24Q55 27 55 44Z"
              fill="#E4E8B9"
              stroke="#727747"
              strokeWidth="2"
            />
            <circle cx="55" cy="19" r="6" fill="#E8AAB4" />
            <circle cx="55" cy="19" r="2.5" fill="#C98996" />
          </>
        )}
  
        {/* Flowerpot */}
        <path
          d="M30 91H80L74 117Q73 121 68 121H42Q37 121 36 117L30 91Z"
          fill="#EAD5B9"
          stroke="#80563E"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
  
        {/* Pot rim */}
        <rect
          x="24"
          y="85"
          width="62"
          height="9"
          rx="4.5"
          fill="#BD9175"
          stroke="#80563E"
          strokeWidth="2.5"
        />
      </svg>
    );
  }
  