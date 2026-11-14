
import { useState, useEffect, useRef } from 'react';
import './Timer.css';
import TimerPlant from './TimerPlant';




function TimeWheel({ label, value, max, onChange }) {
    const scrollRef = useRef(null);
    const numbers = Array.from({ length: max + 1 }, (_, i) => i);
  
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = value * 32;
      }
    }, [value]);
  
    const handleScroll = (event) => {
      const selectedNumber = Math.max(
        0,
        Math.min(max, Math.round(event.currentTarget.scrollTop / 32))
      );
  
      if (selectedNumber !== value) {
        onChange(selectedNumber);
      }
    };
  
    return (
      <div className="time-wheel">
        <div
          className="time-wheel-scroll"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {numbers.map((number) => (
            <button
              key={number}
              type="button"
              className={`time-wheel-number ${
                value === number ? 'selected' : ''
              }`}
              onClick={() => onChange(number)}
            >
              {String(number).padStart(2, '0')}
            </button>
          ))}
        </div>
        <span className="time-wheel-label">{label}</span>
      </div>
    );
  }
  
  

export default function ReadingTimer() {
  const [secondsRemaining, setSecondsRemaining] = useState(30 * 60);
  const [hours, setHours] = useState(0);
const [minutes, setMinutes] = useState(30);
const [seconds, setSeconds] = useState(0);

const selectedDuration = hours * 3600 + minutes * 60 + seconds;
  const [status, setStatus] = useState('ready');

  const progress =
  selectedDuration > 0
    ? Math.max(0, Math.min(1, 1 - secondsRemaining / selectedDuration))
    : 0;

const plantStage =
  status === 'completed' ? 3 :
  status === 'ready' ? 0 :
  progress >= 0.75 ? 3 :
  progress >= 0.5 ? 2 :
  progress >= 0.25 ? 1 : 0;

  useEffect(() => {
    if (status !== 'running') return;
  
    const interval = setInterval(() => {
      setSecondsRemaining((previous) => {
        return Math.max(previous - 1, 0);
      });
    }, 1000);
  
    return () => clearInterval(interval);
  }, [status]);
  
  useEffect(() => {
    if (secondsRemaining === 0 && status === 'running') {
      setStatus('completed');
    }
  }, [secondsRemaining, status]);

  return (
    <main className="reading-timer">
      <img
  src="/looseleaf-logo%202.png"
  alt="LooseLeaf"
  className="timer-logo"
/>
      <h1>Start your read & watch your growth!</h1>

      <div className={`timer-plant-circle ${status}`}>
  <div className="timer-plant-inner">
    <TimerPlant stage={plantStage} />
  </div>
</div>

<p>
  {status === 'ready'
    ? 'READY WHEN YOU ARE'
    : status === 'running'
    ? 'READING IN PROGRESS'
    : status === 'paused'
    ? 'PAUSED'
    : 'SESSION COMPLETE'}
</p>


      
{status === 'ready' && (
  <div className="timer-setup">
    <TimeWheel
      label="HOURS"
      value={hours}
      max={23}
      onChange={(value) => {
        setHours(value);
        setSecondsRemaining(value * 3600 + minutes * 60 + seconds);
      }}
    />

    <TimeWheel
      label="MINUTES"
      value={minutes}
      max={59}
      onChange={(value) => {
        setMinutes(value);
        setSecondsRemaining(hours * 3600 + value * 60 + seconds);
      }}
    />

    <TimeWheel
      label="SECONDS"
      value={seconds}
      max={59}
      onChange={(value) => {
        setSeconds(value);
        setSecondsRemaining(hours * 3600 + minutes * 60 + value);
      }}
    />
  </div>
)}



{status === 'ready' ? (
  <p className="timer-instructions">
    Scroll to set your reading time
  </p>
) : (
  <div className="timer-display">
    {String(Math.floor(secondsRemaining / 3600)).padStart(2, '0')}:
    {String(Math.floor((secondsRemaining % 3600) / 60)).padStart(2, '0')}:
    {String(secondsRemaining % 60).padStart(2, '0')}
  </div>
)}

      
{status === 'ready' ? (
  <button
    type="button"
    onClick={() => {
        if (selectedDuration > 0) {
          setSecondsRemaining(selectedDuration);
          setStatus('running');
        }
      }}
  >
    Start
  </button>
) : status === 'running' ? (
  <div className="timer-controls">
    <button
      type="button"
      onClick={() => setStatus('paused')}
    >
      Pause
    </button>
    <button
      type="button"
      onClick={() => {
        setStatus('ready');
        setSecondsRemaining(selectedDuration);
      }}
    >
      End
    </button>
  </div>
) : status === 'paused' ? (
  <div className="timer-controls">
    <button
      type="button"
      onClick={() => setStatus('running')}
    >
      Resume
    </button>
    <button
      type="button"
      onClick={() => {
        setStatus('ready');
        setSecondsRemaining(selectedDuration);
      }}
    >
      End
    </button>
  </div>
) : (
  <button
    type="button"
    onClick={() => {
        setSecondsRemaining(selectedDuration);
      setStatus('ready');
    }}
  >
    Start New Session
  </button>
)}

    </main>
  );
}
