(function () {
  'use strict';

  /* ── constants ─────────────────────────────────────── */

  const COLORS  = ['#7958CE', '#3D8C5C', '#C2785B'];
  const BG      = '#fff0db';
  const GRAVITY = 0.32;
  const JUMP    = -8.8;
  const MOUSE_SMOOTH = 0.18;  // how quickly clawd tracks the mouse (0–1)
  const CW      = 36;          // clawd width (body 28 + arms 4+4)
  const CH      = 24;          // clawd height (body 16 + legs 8)
  const PH      = 13;          // platform height
  const PW_MIN  = 72;
  const PW_MAX  = 135;
  const GAP_MIN = 52;
  const GAP_MAX = 78;
  const AHEAD   = 800;         // generate platforms this far above camera
  const LEGEND_H = 72;          // height reserved for bottom legend UI

  /* ── DOM ────────────────────────────────────────────── */

  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const ctx    = canvas.getContext('2d');

  /* ── state ──────────────────────────────────────────── */

  let W, H;
  let phase = 'start';        // start | playing | gameover
  let clawd, platforms, cam, score, genY;
  let mouseX = 0;              // mouse X in canvas coords
  let wantJump = false;        // true on click, consumed on next grounded frame
  let bestScore = parseInt(localStorage.getItem('clawd-hop-best') || '0', 10);
  let slowmo = 0;              // 0–1 current slow-mo intensity
  let slowTimer = 0;           // frames remaining of slow-mo (3s ≈ 180 frames)
  let slowReady = true;        // can activate slow-mo?
  let slowCooldown = 0;        // distinct platforms landed since last use (need 5 to recharge)
  let lastLandedPlat = null;   // reference to last platform landed on (for cooldown counting)
  const SLOW_DURATION = 180;   // ~3 seconds at 60fps
  const SLOW_COOLDOWN = 5;     // platforms to land before recharge

  /* ── canvas sizing ──────────────────────────────────── */

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight - LEGEND_H;
  }

  /* ── platform generation ────────────────────────────── */

  function resetPlatforms() {
    const groundY = H - 20;
    platforms = [{ x: 0, y: groundY, w: W, ci: 2 }];
    genY = groundY - GAP_MIN - Math.random() * (GAP_MAX - GAP_MIN);
    fillPlatforms();
  }

  const PAD = 18;  // minimum horizontal gap between platforms in same band

  function fillPlatforms() {
    while (genY > cam - AHEAD) {
      // guarantee one platform of each color per band
      const colors = [0, 1, 2];
      // shuffle so placement order is random
      for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
      }

      const band = [];  // placed platforms in this band {x, w}
      for (const ci of colors) {
        const w = PW_MIN + Math.random() * (PW_MAX - PW_MIN);
        const x = placeWithoutOverlap(band, w);
        if (x === null) continue;  // skip if truly no room (shouldn't happen)
        const y = genY + Math.random() * 12;
        platforms.push({ x, y, w, ci });
        band.push({ x, w });
      }

      genY -= GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
    }
  }

  // find an x position for a platform of width `w` that doesn't overlap existing ones
  function placeWithoutOverlap(band, w) {
    const maxAttempts = 20;
    for (let a = 0; a < maxAttempts; a++) {
      const x = Math.random() * (W - w);
      let ok = true;
      for (const p of band) {
        // check overlap with padding
        if (x < p.x + p.w + PAD && x + w > p.x - PAD) {
          ok = false;
          break;
        }
      }
      if (ok) return x;
    }
    // fallback: find first gap that fits
    const sorted = [...band].sort((a, b) => a.x - b.x);
    // try left edge
    if (sorted.length === 0) return Math.random() * (W - w);
    if (sorted[0].x - PAD >= w) return Math.random() * (sorted[0].x - PAD - w);
    // try gaps between
    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = sorted[i].x + sorted[i].w + PAD;
      const gapEnd   = sorted[i + 1].x - PAD;
      if (gapEnd - gapStart >= w) return gapStart + Math.random() * (gapEnd - gapStart - w);
    }
    // try right edge
    const last = sorted[sorted.length - 1];
    const rightStart = last.x + last.w + PAD;
    if (W - rightStart >= w) return rightStart + Math.random() * (W - rightStart - w);
    return null;
  }

  function prune() {
    platforms = platforms.filter(p => p.y < cam + H + 200);
  }

  /* ── init game ──────────────────────────────────────── */

  function init() {
    cam   = 0;
    score = 0;
    resetPlatforms();

    const groundY = H - 20;
    mouseX = W / 2;
    clawd = {
      x: W / 2, y: groundY - CH,
      vy: 0,
      ci: 2,
      grounded: false,
      prevY: groundY - CH,
    };

    slowmo = 0;
    slowTimer = 0;
    slowReady = true;
    slowCooldown = 0;
    lastLandedPlat = null;
  }

  /* ── update ─────────────────────────────────────────── */

  function update() {
    if (phase !== 'playing') return;

    // slow-mo timer
    if (slowTimer > 0) {
      slowTimer--;
      slowmo += (1 - slowmo) * 0.25;
      if (slowTimer === 0) slowCooldown = 0;          // start counting platforms
    } else {
      slowmo += (0 - slowmo) * 0.15;
      if (slowmo < 0.01) slowmo = 0;
    }
    const ts = 1 - slowmo * 0.88;   // timeScale: 1.0 → 0.12

    // horizontal: clawd smoothly tracks mouse X
    clawd.x += (mouseX - clawd.x) * MOUSE_SMOOTH;

    // jump (click or touch)
    if (wantJump && clawd.grounded) {
      clawd.vy = JUMP;
      clawd.grounded = false;
      wantJump = false;
    }

    // physics (scaled by slow-mo)
    clawd.vy += GRAVITY * ts;
    clawd.prevY = clawd.y;
    clawd.y += clawd.vy * ts;

    // clamp to screen edges (no wrap — mouse-driven)
    clawd.x = Math.max(CW / 2, Math.min(W - CW / 2, clawd.x));

    // platform collision (only while falling)
    const wasGrounded = clawd.grounded;
    clawd.grounded = false;
    if (clawd.vy >= 0) {
      const bot     = clawd.y + CH;
      const prevBot = clawd.prevY + CH;
      const left    = clawd.x - CW / 2 + 5;
      const right   = clawd.x + CW / 2 - 5;

      for (const p of platforms) {
        if (p.ci !== clawd.ci) continue;                    // wrong color → phase through
        if (right <= p.x || left >= p.x + p.w) continue;   // no horizontal overlap
        if (prevBot <= p.y + 2 && bot >= p.y) {             // crossing platform top
          clawd.y  = p.y - CH;
          clawd.vy = 0;
          if (p !== lastLandedPlat) {                    // new platform (not the same one)
            lastLandedPlat = p;
            if (!slowReady && slowTimer === 0) {
              slowCooldown++;
              if (slowCooldown >= SLOW_COOLDOWN) slowReady = true;
            }
          }
          clawd.grounded = true;
          break;
        }
      }
    }

    // camera follows upward only
    const target = clawd.y - H * 0.35;
    if (target < cam) cam += (target - cam) * 0.08;

    // score = height above ground in "meters"
    const height = (H - 20 - CH) - clawd.y;
    if (height > 0) score = Math.max(score, Math.floor(height / 10));

    // generate & prune
    fillPlatforms();
    prune();

    // death: fell below screen
    if (clawd.y > cam + H + 80) die();
  }

  /* ── draw ────────────────────────────────────────────── */

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    if (phase !== 'playing' && phase !== 'gameover') return;

    // platforms
    for (const p of platforms) {
      const sy = p.y - cam;
      if (sy > H + 20 || sy + PH < -20) continue;

      ctx.globalAlpha = p.ci === clawd.ci ? 1 : 0.16 + slowmo * 0.28;
      ctx.fillStyle = COLORS[p.ci];
      ctx.beginPath();
      ctx.roundRect(p.x, sy, p.w, PH, 5);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // clawd character
    drawClawd(clawd.x, clawd.y - cam, COLORS[clawd.ci]);

    // HUD
    drawHUD();
    updateLegend();
  }

  function drawClawd(cx, topY, color) {
    const px = Math.round;  // pixel-snap helper
    ctx.fillStyle = color;

    // unit grid — all sizes relative to a 4px pixel block
    const u = 4;

    // body: wide rectangle (7u wide × 4u tall)
    const bw = u * 7;
    const bh = u * 4;
    const bx = px(cx - bw / 2);
    const by = px(topY);
    ctx.fillRect(bx, by, bw, bh);

    // arms: small rectangles on each side (1u wide × 2u tall)
    const aw = u;
    const ah = u * 2;
    const armY = by + u;
    ctx.fillRect(bx - aw, armY, aw, ah);           // left arm
    ctx.fillRect(bx + bw, armY, aw, ah);            // right arm

    // legs: 4 small rectangles at bottom (1u wide × 2u tall)
    const lw = u;
    const lh = u * 2;
    const legY = by + bh;
    ctx.fillRect(bx + u,       legY, lw, lh);       // left-inner
    ctx.fillRect(bx + u * 2,   legY, lw, lh);       // left-outer
    ctx.fillRect(bx + u * 4,   legY, lw, lh);       // right-inner
    ctx.fillRect(bx + u * 5,   legY, lw, lh);       // right-outer

    // eyes: two dark slots near top of body (1u wide × 2u tall)
    const eyeW = u;
    const eyeH = u * 2;
    const eyeY = by + u;
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(bx + u * 2, eyeY, eyeW, eyeH);    // left eye
    ctx.fillRect(bx + u * 4, eyeY, eyeW, eyeH);    // right eye
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // current score
    ctx.fillStyle = '#0f4c81';
    ctx.font = '700 22px "DM Sans", sans-serif';
    ctx.fillText(String(score).padStart(3, '0'), 20, 16);

    // best score
    if (bestScore > 0) {
      ctx.fillStyle = '#0f4c81';
      ctx.globalAlpha = 0.5;
      ctx.font = '600 14px "DM Sans", sans-serif';
      ctx.fillText('Best: ' + String(bestScore).padStart(3, '0'), 20, 44);
      ctx.globalAlpha = 1;
    }
  }

  /* ── DOM legend ─────────────────────────────────────── */

  const legendEl   = $('legend');
  const barFill    = $('slow-bar-fill');
  const dotsEl     = $('slow-dots');
  const legendKeys = COLORS.map((_, i) => $('lk-' + i));

  // build cooldown dots once
  for (let i = 0; i < SLOW_COOLDOWN; i++) {
    const dot = document.createElement('div');
    dot.className = 'slow-dot';
    dotsEl.appendChild(dot);
  }
  const dotEls = dotsEl.querySelectorAll('.slow-dot');

  // set initial key colors
  COLORS.forEach((c, i) => { legendKeys[i].style.backgroundColor = c; });

  // click legend keys to switch color
  legendKeys.forEach((btn, i) => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      if (phase === 'playing') clawd.ci = i;
    });
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      if (phase === 'playing') clawd.ci = i;
    }, { passive: false });
  });

  function updateLegend() {
    // key opacity
    COLORS.forEach((c, i) => {
      const active = i === clawd.ci;
      legendKeys[i].style.opacity = active ? '0.85' : '0.2';
    });

    // slow-mo bar states
    if (slowTimer > 0) {
      // active: shrinking
      dotsEl.classList.remove('visible');
      barFill.style.opacity = '0.5';
      barFill.style.width = ((slowTimer / SLOW_DURATION) * 100) + '%';
    } else if (!slowReady) {
      // cooldown: show dots
      barFill.style.width = '0%';
      barFill.style.opacity = '0';
      dotsEl.classList.add('visible');
      dotEls.forEach((d, i) => {
        d.classList.toggle('filled', i < slowCooldown);
      });
    } else {
      // ready: full bar
      dotsEl.classList.remove('visible');
      barFill.style.opacity = '0.3';
      barFill.style.width = '100%';
    }
  }

  /* ── screen management ──────────────────────────────── */

  function showScreen(id) {
    ['start', 'gameover'].forEach(s => $(s).classList.remove('active'));
    if (id) $(id).classList.add('active');
  }

  function startGame() {
    showScreen(null);
    canvas.style.display = 'block';
    $('touch').classList.add('visible');
    legendEl.classList.add('visible');
    init();
    phase = 'playing';
  }

  function die() {
    phase = 'gameover';
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('clawd-hop-best', String(bestScore));
    }
    $('final-score').textContent = score;
    $('touch').classList.remove('visible');
    legendEl.classList.remove('visible');
    showScreen('gameover');
  }

  function restart() {
    showScreen(null);
    canvas.style.display = 'block';
    $('touch').classList.add('visible');
    legendEl.classList.add('visible');
    init();
    phase = 'playing';
  }

  /* ── input ──────────────────────────────────────────── */

  // mouse: move + click to jump
  canvas.addEventListener('mousemove', e => {
    mouseX = e.clientX;
  });

  canvas.addEventListener('mousedown', e => {
    if (phase === 'playing') wantJump = true;
  });

  document.addEventListener('keydown', e => {
    if (phase === 'playing') {
      const k = e.key.toLowerCase();
      if (k === 'q') clawd.ci = 0;
      if (k === 'w') clawd.ci = 1;
      if (k === 'e') clawd.ci = 2;
      if (e.key === ' ' && slowReady && slowTimer === 0) {
        slowTimer = SLOW_DURATION;
        slowReady = false;
        e.preventDefault();
      }
    }
    if (e.key === ' ') e.preventDefault();
  });

  /* ── touch controls ─────────────────────────────────── */

  function setupTouch() {
    // detect touch device
    window.addEventListener('touchstart', () => {
      document.body.classList.add('has-touch');
    }, { once: true });

    // canvas touch: drag to move, tap to jump
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      mouseX = t.clientX;
      if (phase === 'playing') wantJump = true;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      mouseX = t.clientX;
    }, { passive: false });

    // color buttons: direct selection
    COLORS.forEach((_, i) => {
      const btn = $('t-c' + i);
      if (!btn) return;
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        if (phase === 'playing') clawd.ci = i;
        updateTouchColors();
      }, { passive: false });
    });
  }

  function updateTouchColors() {
    COLORS.forEach((c, i) => {
      const btn = $('t-c' + i);
      if (!btn) return;
      btn.style.backgroundColor = c;
      btn.style.opacity = i === clawd.ci ? '1' : '0.3';
      btn.style.transform = i === clawd.ci ? 'scale(1.15)' : 'scale(1)';
    });
  }

  /* ── game loop ──────────────────────────────────────── */

  function loop() {
    update();
    draw();
    if (phase === 'playing') updateTouchColors();
    requestAnimationFrame(loop);
  }

  /* ── bootstrap ──────────────────────────────────────── */

  resize();
  window.addEventListener('resize', resize);

  $('btn-start').addEventListener('click', startGame);
  $('btn-restart').addEventListener('click', restart);

  setupTouch();
  requestAnimationFrame(loop);
})();
