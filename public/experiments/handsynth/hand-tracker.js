/**
 * HandTracker — MediaPipe Hand Landmarker wrapper
 *
 * Owns the webcam stream and MediaPipe lifecycle.
 * Calls back with normalized landmark data on every frame.
 *
 * Usage:
 *   const tracker = new HandTracker(videoElement, (results) => {
 *     // results.landmarks — array of hands, each an array of 21 {x,y,z} points
 *     // results.handedness — array of 'Left'|'Right' per hand
 *   });
 *   await tracker.start();
 *   tracker.stop();
 */
class HandTracker {
  constructor(videoElement, onResults) {
    this.video = videoElement;
    this.onResults = onResults;
    this.handLandmarker = null;
    this.stream = null;
    this.rafId = null;
    this.isRunning = false;
    this.lastTimestamp = -1;
  }

  /**
   * Request camera access, initialize MediaPipe, start the detection loop.
   * Throws if camera access is denied or MediaPipe fails to load.
   */
  async start() {
    if (this.isRunning) return;

    // 1. Request webcam
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    this.video.srcObject = this.stream;
    await new Promise((resolve) =>
      this.video.addEventListener('loadedmetadata', resolve, { once: true })
    );
    await this.video.play();

    // 2. Initialize MediaPipe Hand Landmarker
    const { HandLandmarker, FilesetResolver } = window;

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
    });

    // 3. Start frame loop
    this.isRunning = true;
    this._detect();
  }

  /**
   * Stop the detection loop and release the webcam.
   */
  stop() {
    this.isRunning = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }

    this.video.srcObject = null;
    this.lastTimestamp = -1;
  }

  /**
   * Internal: run detection on each animation frame.
   */
  _detect() {
    if (!this.isRunning) return;

    this.rafId = requestAnimationFrame(() => {
      if (!this.isRunning || !this.handLandmarker) return;

      const now = performance.now();

      // MediaPipe requires strictly increasing timestamps
      if (now > this.lastTimestamp) {
        const result = this.handLandmarker.detectForVideo(this.video, now);
        this.lastTimestamp = now;

        const landmarks = result.landmarks || [];
        const handedness = (result.handednesses || []).map(
          (h) => h[0]?.categoryName || 'Unknown'
        );

        this.onResults({ landmarks, handedness });
      }

      this._detect();
    });
  }
}

// Expose globally for the Babel-compiled React script
window.HandTracker = HandTracker;
