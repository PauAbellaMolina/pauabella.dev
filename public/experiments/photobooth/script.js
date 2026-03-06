'use strict';

// ── Strip dimensions (canvas pixels, used for download) ──────────────────────
const STRIP_W  = 400;
const PHOTO_W  = 340;
const PHOTO_H  = 255; // 4:3 of PHOTO_W
const PAD_X    = 30;
const PAD_TOP  = 30;
const GAP      = 16;
const PAD_BOT  = 204; // generous bottom space (3× original)
const TOTAL    = 4;
const STRIP_H  = PAD_TOP + TOTAL * PHOTO_H + (TOTAL - 1) * GAP + PAD_BOT;
// = 30 + 1020 + 48 + 204 = 1302

// Display width of the strip on screen (CSS pixels)
const DISPLAY_W = 220;

// ── Filter definitions ────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'none',  label: 'original', css: 'none' },
  { id: 'bw',    label: 'b&w',      css: 'grayscale(1)' },
  { id: 'sepia', label: 'sepia',    css: 'sepia(0.8) contrast(1.05)' },
  { id: 'vivid', label: 'vivid',    css: 'saturate(1.6) contrast(1.1)' },
  { id: 'faded', label: 'faded',    css: 'contrast(0.8) brightness(1.1) saturate(0.6)' },
  { id: 'warm',  label: 'warm',     css: 'sepia(0.3) saturate(1.3) brightness(1.05) contrast(1.08)' },
];

// ── Frame (strip background) definitions ─────────────────────────────────────
// swatch: CSS background string for the picker tile
// bg:     canvas fill color for the strip background
const FRAMES = [
  {
    id: 'white',
    label: 'white',
    swatch: 'background:#fff; border:1px solid rgba(15,76,129,0.12)',
    draw: drawFrameWhite,
  },
  {
    id: 'cream',
    label: 'cream',
    swatch: 'background:#fff0db',
    draw: drawFrameCream,
  },
  {
    id: 'navy',
    label: 'navy',
    swatch: 'background:#0f4c81',
    draw: drawFrameNavy,
  },
  {
    id: 'grain',
    label: 'grain',
    swatch: 'background:radial-gradient(circle,rgba(120,90,50,0.1) 1px,transparent 1px) 0 0/4px 4px,#fff',
    draw: drawFrameGrain,
  },
  {
    id: 'lined',
    label: 'lined',
    swatch: 'background:repeating-linear-gradient(to bottom,#fff 0px,#fff 7px,rgba(15,76,129,0.08) 7px,rgba(15,76,129,0.08) 8px)',
    draw: drawFrameLined,
  },
];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const video        = $('video');
const flashEl      = $('flash');
const countdownEl  = $('countdown');
const previewEl    = $('photo-preview');
const cameraStatus = $('camera-status');
const goBtn        = $('btn-go');
const pickersEl    = $('pickers');
const progressDots = $('progress-dots');
const stripCanvas  = $('strip-canvas');
const stripLabel   = $('strip-label');
const stripActions = $('strip-actions');
const dots         = [0, 1, 2, 3].map(i => $(`dot-${i}`));

// ── State ─────────────────────────────────────────────────────────────────────
let photos         = [];
let stream         = null;
let selectedFilter = 'none';
let selectedFrame  = 'white';

// ── Utilities ─────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + id).classList.add('active');
}

// ── Pickers init ──────────────────────────────────────────────────────────────
function initPickers() {
  const filterRow = $('filter-picker');
  FILTERS.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'filter-pick' + (f.id === 'none' ? ' active' : '');
    btn.dataset.id = f.id;
    btn.textContent = f.label;
    btn.addEventListener('click', () => {
      filterRow.querySelectorAll('.filter-pick').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFilter = f.id;
      video.style.filter = f.css === 'none' ? '' : f.css;
    });
    filterRow.appendChild(btn);
  });

  const frameRow = $('frame-picker');
  FRAMES.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'frame-pick' + (f.id === 'white' ? ' active' : '');
    btn.dataset.id = f.id;

    const swatch = document.createElement('span');
    swatch.className = 'frame-swatch';
    swatch.setAttribute('style', f.swatch);

    const label = document.createElement('span');
    label.className = 'frame-name';
    label.textContent = f.label;

    btn.appendChild(swatch);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      frameRow.querySelectorAll('.frame-pick').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFrame = f.id;
    });
    frameRow.appendChild(btn);
  });
}

// ── Camera ────────────────────────────────────────────────────────────────────
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    await new Promise(resolve => video.addEventListener('loadedmetadata', resolve, { once: true }));
    showScreen('camera');
  } catch {
    $('screen-start').querySelector('p').textContent = 'camera access is required';
    $('btn-start').textContent = 'try again';
  }
}

// ── Frame capture ─────────────────────────────────────────────────────────────
// Captures the current video frame, mirrored (selfie-style), cropped to 4:3,
// with the selected CSS filter applied via ctx.filter.
function captureFrame() {
  const canvas = document.createElement('canvas');
  canvas.width  = PHOTO_W;
  canvas.height = PHOTO_H;
  const ctx = canvas.getContext('2d');

  const vw = video.videoWidth  || 640;
  const vh = video.videoHeight || 480;
  const targetRatio = PHOTO_W / PHOTO_H;
  const videoRatio  = vw / vh;

  let sw, sh, sx, sy;
  if (videoRatio > targetRatio) {
    sh = vh;
    sw = Math.round(vh * targetRatio);
    sx = Math.round((vw - sw) / 2);
    sy = 0;
  } else {
    sw = vw;
    sh = Math.round(vw / targetRatio);
    sx = 0;
    sy = Math.round((vh - sh) / 2);
  }

  // Apply filter to canvas draw
  const filter = FILTERS.find(f => f.id === selectedFilter);
  if (filter && filter.css !== 'none') {
    ctx.filter = filter.css;
  }

  // Mirror horizontally (selfie orientation)
  ctx.save();
  ctx.translate(PHOTO_W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PHOTO_W, PHOTO_H);
  ctx.restore();

  ctx.filter = 'none';

  return canvas.toDataURL('image/jpeg', 0.92);
}

// ── Flash effect ──────────────────────────────────────────────────────────────
async function doFlash() {
  flashEl.style.transition = 'opacity 0.06s ease-in';
  flashEl.style.opacity = '1';
  await sleep(110);
  flashEl.style.transition = 'opacity 0.32s ease-out';
  flashEl.style.opacity = '0';
  await sleep(330);
}

// ── Countdown ─────────────────────────────────────────────────────────────────
async function doCountdown() {
  countdownEl.classList.add('visible');
  for (let n = 3; n >= 1; n--) {
    const span = document.createElement('span');
    span.className = 'num';
    span.textContent = n;
    countdownEl.innerHTML = '';
    countdownEl.appendChild(span);
    await sleep(950);
  }
  countdownEl.classList.remove('visible');
  countdownEl.innerHTML = '';
}

// ── Brief preview of captured photo ──────────────────────────────────────────
async function showPreview(dataURL) {
  previewEl.src = dataURL;
  previewEl.style.opacity = '1';
  await sleep(580);
  previewEl.style.transition = 'opacity 0.25s ease';
  previewEl.style.opacity = '0';
  await sleep(260);
  previewEl.src = '';
  previewEl.style.transition = '';
}

// ── Main shoot sequence ───────────────────────────────────────────────────────
async function runShoot() {
  goBtn.style.display = 'none';
  pickersEl.classList.add('hidden');
  progressDots.classList.add('visible');
  photos = [];

  for (let i = 0; i < TOTAL; i++) {
    cameraStatus.textContent = `photo ${i + 1} of ${TOTAL}`;

    if (i > 0) await sleep(700);

    await doCountdown();

    const dataURL = captureFrame();
    photos.push(dataURL);

    await doFlash();

    dots[i].classList.add('filled');

    await showPreview(dataURL);
  }

  cameraStatus.textContent = 'developing...';
  await sleep(500);

  await buildStrip();
}

// ── Frame pattern drawing functions ──────────────────────────────────────────

function drawFrameWhite(ctx) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);
}

function drawFrameCream(ctx) {
  ctx.fillStyle = '#fff0db';
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);
}

function drawFrameNavy(ctx) {
  ctx.fillStyle = '#0f4c81';
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);
}

function drawFrameGrain(ctx) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);
  // Warm paper grain — random micro-dots
  const count = Math.round(STRIP_W * STRIP_H * 0.018);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * STRIP_W;
    const y = Math.random() * STRIP_H;
    const a = Math.random() * 0.10 + 0.02;
    ctx.fillStyle = `rgba(110, 80, 45, ${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawFrameLined(ctx) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);
  ctx.strokeStyle = 'rgba(15, 76, 129, 0.06)';
  ctx.lineWidth = 1;
  for (let y = 0.5; y < STRIP_H; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(STRIP_W, y);
    ctx.stroke();
  }
}

// ── Build strip canvas & reveal ───────────────────────────────────────────────
async function buildStrip() {
  showScreen('strip');
  stripLabel.textContent = 'developing...';
  stripActions.classList.remove('visible');

  await document.fonts.ready;

  const images = await Promise.all(
    photos.map(src => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    }))
  );

  stripCanvas.width  = STRIP_W;
  stripCanvas.height = STRIP_H;

  const displayHeight = Math.round(STRIP_H * DISPLAY_W / STRIP_W);
  stripCanvas.style.width  = DISPLAY_W + 'px';
  stripCanvas.style.height = displayHeight + 'px';

  const ctx = stripCanvas.getContext('2d');

  // Draw the selected frame background
  const frame = FRAMES.find(f => f.id === selectedFrame);
  frame.draw(ctx);

  // Draw each photo — navy frame gets a subtle light border around each photo
  const isNavy = selectedFrame === 'navy';
  images.forEach((img, i) => {
    const y = PAD_TOP + i * (PHOTO_H + GAP);
    ctx.drawImage(img, PAD_X, y, PHOTO_W, PHOTO_H);
    if (isNavy) {
      ctx.strokeStyle = 'rgba(255, 240, 219, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD_X + 0.5, y + 0.5, PHOTO_W - 1, PHOTO_H - 1);
    }
  });

  // Subtle date at the bottom
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  ctx.fillStyle = isNavy
    ? 'rgba(255, 240, 219, 0.4)'
    : 'rgba(15, 76, 129, 0.3)';
  ctx.font = '500 11px "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(dateStr, STRIP_W / 2, STRIP_H - 24);

  // Sync the strip-wrapper background so the "printing" reveal looks right
  $('strip-wrapper').style.background = isNavy ? '#0f4c81' : '#ffffff';

  await sleep(500);
  stripLabel.textContent = '';

  stripCanvas.classList.remove('reveal');
  void stripCanvas.offsetWidth;
  stripCanvas.classList.add('reveal');

  await sleep(2800);
  stripActions.classList.add('visible');
}

// ── Download ──────────────────────────────────────────────────────────────────
function downloadStrip() {
  const link = document.createElement('a');
  link.download = `photobooth-${new Date().toISOString().slice(0, 10)}.jpg`;
  link.href = stripCanvas.toDataURL('image/jpeg', 0.95);
  link.click();
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function reset() {
  photos = [];
  dots.forEach(d => d.classList.remove('filled'));
  goBtn.style.display = '';
  pickersEl.classList.remove('hidden');
  progressDots.classList.remove('visible');
  cameraStatus.textContent = 'ready when you are';
  stripCanvas.classList.remove('reveal');
  stripCanvas.style.width  = '';
  stripCanvas.style.height = '';
  $('strip-wrapper').style.background = '';
  showScreen('camera');
}

// ── Init & events ─────────────────────────────────────────────────────────────
initPickers();

$('btn-start').addEventListener('click', startCamera);
$('btn-go').addEventListener('click', runShoot);
$('btn-download').addEventListener('click', downloadStrip);
$('btn-again').addEventListener('click', reset);
