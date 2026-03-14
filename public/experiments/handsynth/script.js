const { useState, useEffect, useRef, useCallback } = React;

// ---------------------------------------------------------------------------
// Continuous color mapping — smooth hue sweep for background gradient
// ---------------------------------------------------------------------------

const DEFAULT_BG = 'hsl(210, 78%, 28%)'; // #0f4c81

/** Map a 0–1 screenX to a smooth background color (hue sweep). */
function noteColor(screenX) {
  // Sweep from 210° (navy) through teal, green, purple, plum across the range
  const hue = 210 + screenX * 160; // 210° → 370° (wraps past 360)
  return `hsl(${hue % 360}, 50%, 27%)`;
}

// ---------------------------------------------------------------------------
// Landmark drawing — two-hand aware
// ---------------------------------------------------------------------------

const DRAW_LANDMARKS = [0, 4, 8, 9, 12, 16, 20];

function drawLandmarks(canvas, landmarks, handedness) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  for (let i = 0; i < landmarks.length; i++) {
    const hand = landmarks[i];
    const isLeft = handedness[i] === 'Left';

    // Chord hand (left) slightly brighter to distinguish
    ctx.fillStyle = isLeft
      ? 'rgba(255, 240, 219, 0.8)'
      : 'rgba(255, 240, 219, 0.5)';

    for (const idx of DRAW_LANDMARKS) {
      const pt = hand[idx];
      if (!pt) continue;
      const x = (1 - pt.x) * w; // mirror for user perspective
      const y = pt.y * h;
      const r = idx === 9 ? 6 : 3; // palm center is larger
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [appState, setAppState] = useState('idle'); // idle | loading | playing | error
  const [errorMsg, setErrorMsg] = useState('');
  const [leftHandInfo, setLeftHandInfo] = useState(null);   // { chordName, screenX } | null
  const [rightHandInfo, setRightHandInfo] = useState(null);  // { noteName, screenX } | null

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const harmonizerRef = useRef(null);
  const trackerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackerRef.current) trackerRef.current.stop();
      if (harmonizerRef.current) harmonizerRef.current.destroy();
    };
  }, []);

  // Resize canvas to match video
  useEffect(() => {
    if (appState !== 'playing') return;
    function resize() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [appState]);

  // ------ Hand tracking callback ------
  const onHandResults = useCallback(({ landmarks, handedness }) => {
    const harmonizer = harmonizerRef.current;
    if (!harmonizer) return;

    let leftFound = false;
    let rightFound = false;
    let leftInfo = null;
    let rightInfo = null;

    for (let i = 0; i < landmarks.length; i++) {
      const label = handedness[i];
      const palm = landmarks[i][9]; // middle finger MCP — stable palm center
      const screenX = 1 - palm.x;   // mirror for user's perspective
      const screenY = palm.y;

      if (label === 'Left') {
        leftFound = true;
        leftInfo = harmonizer.updateLeftHand(screenX, screenY);
      } else if (label === 'Right') {
        rightFound = true;
        rightInfo = harmonizer.updateRightHand(screenX, screenY);
      }
    }

    // Release voices for hands that disappeared
    if (!leftFound && harmonizer.chordHandPresent) {
      harmonizer.releaseLeftHand();
    }
    if (!rightFound && harmonizer.melodyHandPresent) {
      harmonizer.releaseRightHand();
    }

    setLeftHandInfo(leftFound ? leftInfo : null);
    setRightHandInfo(rightFound ? rightInfo : null);

    // Draw landmarks on canvas overlay
    drawLandmarks(canvasRef.current, landmarks, handedness);
  }, []);

  // ------ Start ------
  const handleStart = useCallback(async () => {
    setAppState('loading');

    try {
      // Wait for MediaPipe module
      let waited = 0;
      while (!window.__mediapipeReady && waited < 15000) {
        await new Promise((r) => setTimeout(r, 100));
        waited += 100;
      }
      if (!window.__mediapipeReady) {
        throw new Error('MediaPipe failed to load. Try refreshing.');
      }

      // Init harmonizer (user gesture creates AudioContext)
      const harmonizer = new window.Harmonizer();
      harmonizer.init();
      harmonizerRef.current = harmonizer;

      // Init hand tracker (2 hands)
      const tracker = new window.HandTracker(videoRef.current, onHandResults);
      await tracker.start();
      trackerRef.current = tracker;

      setAppState('playing');
    } catch (err) {
      console.error('Handsynth start error:', err);
      setErrorMsg(err.message || 'Something went wrong.');
      setAppState('error');

      if (harmonizerRef.current) { harmonizerRef.current.destroy(); harmonizerRef.current = null; }
      if (trackerRef.current) { trackerRef.current.stop(); trackerRef.current = null; }
    }
  }, [onHandResults]);

  // ------ Stop ------
  const handleStop = useCallback(() => {
    if (trackerRef.current) { trackerRef.current.stop(); trackerRef.current = null; }
    if (harmonizerRef.current) { harmonizerRef.current.destroy(); harmonizerRef.current = null; }
    setLeftHandInfo(null);
    setRightHandInfo(null);
    setAppState('idle');
  }, []);

  // ---- Render by state ----

  if (appState === 'idle') {
    return (
      <div className="screen center-screen">
        <h1>Handsynth</h1>
        <p className="subtitle">
          Play chords and melody with two hands.
          <br />
          Left hand plays chords. Right hand plays melody.
          <br />
          Move up and down to change brightness.
        </p>
        <button onClick={handleStart}>Start</button>
        <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      </div>
    );
  }

  if (appState === 'loading') {
    return (
      <div className="screen center-screen">
        <h1>Loading...</h1>
        <p className="subtitle">Setting up camera and hand tracking.</p>
        <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      </div>
    );
  }

  if (appState === 'error') {
    return (
      <div className="screen center-screen">
        <h1>Oops</h1>
        <p className="subtitle">{errorMsg}</p>
        <button onClick={() => setAppState('idle')}>Try again</button>
        <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      </div>
    );
  }

  // ---- Playing state ----

  // Build background gradient from hand positions
  const leftColor = leftHandInfo ? noteColor(leftHandInfo.screenX) : DEFAULT_BG;
  const rightColor = rightHandInfo ? noteColor(rightHandInfo.screenX) : DEFAULT_BG;
  const bgGradient = `linear-gradient(to right, ${leftColor} 15%, ${rightColor} 85%)`;

  return (
    <div className="playing-container" style={{ background: bgGradient }}>
      <video ref={videoRef} className="webcam-bg" playsInline muted />
      <canvas ref={canvasRef} className="landmark-overlay" />

      {/* Live hand labels — follow the hand */}
      {leftHandInfo && (
        <div className="chord-label"
          style={{ left: `${leftHandInfo.screenX * 100}%` }}>
          {leftHandInfo.chordName}
        </div>
      )}

      {rightHandInfo && (
        <div className="melody-label"
          style={{ left: `${rightHandInfo.screenX * 100}%` }}>
          {rightHandInfo.noteName}
        </div>
      )}

      <div className="bottom-bar">
        <span className="scale-indicator">Continuous</span>
        <button className="stop-btn" onClick={handleStop}>Stop</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
