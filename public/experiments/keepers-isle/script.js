// ─────────────────────────────────────────────
// Keeper's Isle — Isometric exploration game
// ─────────────────────────────────────────────

(function () {
  'use strict';

  // ── Constants ──────────────────────────────

  const TILE_W = 64;
  const TILE_H = 32;
  const MAP_COLS = 22;
  const MAP_ROWS = 22;

  // Movement duration in ms (per tile)
  const MOVE_MS = 180;

  // LocalStorage key for save data
  const SAVE_KEY = 'keepers-isle-save';

  // Tile type enum
  const T = {
    DEEP_WATER:    0,
    SHALLOW_WATER: 1,
    SAND:          2,
    GRASS:         3,
    DARK_GRASS:    4,
    STONE_PATH:    5,
    WOOD:          6,
    FLOWERS:       7,
  };

  // Object type enum
  const O = {
    NONE:       0,
    TREE:       1,
    ROCK:       2,
    BUSH:       3,
    LIGHTHOUSE: 4,
    COTTAGE:    5,
    TALL_GRASS: 6,
    PIER_POST:  7,
    SIGNPOST:   8,
    WELL:       9,
  };

  // Colors derived from the site palette
  const C = {
    deepWater:    '#0a3d6b',
    shallowWater: '#1a6aaa',
    waterHighlight: '#2a7ec4',
    sand:         '#e8d5b5',
    sandDark:     '#d9c4a0',
    grass:        '#7a9e6e',
    grassLight:   '#8fb180',
    darkGrass:    '#5d7e52',
    stonePath:    '#bfb1a0',
    stoneLight:   '#d1c5b8',
    wood:         '#8b6f4e',
    woodDark:     '#6e5738',
    flowers1:     '#c4785a',   // terracotta
    flowers2:     '#7958CE',   // lavender (from Norda palette)
    flowers3:     '#d4a66a',   // gold
    trunkBrown:   '#5e4530',
    leafGreen:    '#4a7a3e',
    leafDark:     '#3b6630',
    rockGray:     '#8a8a80',
    rockLight:    '#a5a59a',
    cottage:      '#fff0db',
    cottageRoof:  '#c4785a',
    lighthouse:   '#fff0db',
    lighthouseTop:'#0f4c81',
    playerBody:   '#0f4c81',
    playerSkin:   '#e8c9a0',
    playerHair:   '#3a2a1a',
    bg:           '#fff0db',
    text:         '#0f4c81',
  };

  // ── Map Data ───────────────────────────────
  // Hand-crafted 22x22 island
  // Each row is one line for readability

  /* eslint-disable no-multi-spaces, comma-spacing */
  const TERRAIN = [
    //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
    [ 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2
    [ 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 3
    [ 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0], // 4
    [ 0, 0, 0, 1, 2, 3, 3, 3, 4, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0], // 5
    [ 0, 0, 0, 1, 2, 3, 7, 3, 5, 3, 3, 4, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0], // 6
    [ 0, 0, 1, 2, 3, 3, 3, 3, 5, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0], // 7
    [ 0, 0, 1, 2, 3, 4, 3, 3, 5, 5, 5, 5, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0], // 8
    [ 0, 0, 1, 2, 3, 3, 3, 3, 5, 3, 3, 5, 3, 4, 3, 3, 2, 1, 0, 0, 0, 0], // 9
    [ 0, 0, 1, 2, 3, 3, 7, 3, 5, 3, 3, 5, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0], // 10
    [ 0, 0, 0, 1, 2, 3, 3, 3, 5, 3, 3, 5, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0], // 11
    [ 0, 0, 0, 1, 2, 3, 3, 3, 5, 3, 3, 3, 5, 3, 3, 4, 3, 3, 2, 1, 0, 0], // 12
    [ 0, 0, 0, 1, 2, 3, 4, 3, 3, 3, 3, 3, 5, 3, 3, 3, 3, 3, 2, 1, 0, 0], // 13
    [ 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 7, 3, 5, 3, 3, 3, 3, 2, 1, 0, 0, 0], // 14
    [ 0, 0, 0, 0, 1, 2, 3, 3, 4, 3, 3, 3, 5, 3, 3, 4, 2, 1, 0, 0, 0, 0], // 15
    [ 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 6, 2, 2, 1, 1, 0, 0, 0, 0, 0], // 16
    [ 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 2, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0], // 17
    [ 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 1, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 18
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 19
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 20
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 21
  ];

  const OBJECTS = [
    //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 3
    [ 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 4
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 5
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 6
    [ 0, 0, 0, 0, 2, 0, 1, 0, 0, 8, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // 7
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 8
    [ 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0], // 9
    [ 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0], // 10
    [ 0, 0, 0, 0, 0, 3, 0, 0, 9, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], // 11
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0], // 12
    [ 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // 13
    [ 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0], // 14
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 15
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 16
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 17
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 18
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 19
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 20
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 21
  ];
  /* eslint-enable */

  // Location labels based on map regions
  function getLocationLabel(col, row) {
    if (TERRAIN[row] && TERRAIN[row][col] === T.WOOD) return 'The Pier';
    if (OBJECTS[row] && (OBJECTS[row][col] === O.LIGHTHOUSE)) return 'The Lighthouse';
    if (OBJECTS[row] && (OBJECTS[row][col] === O.COTTAGE)) return 'The Cottage';
    if (TERRAIN[row] && TERRAIN[row][col] === T.SAND) return 'The Shore';
    if (TERRAIN[row] && TERRAIN[row][col] === T.STONE_PATH) return 'Stone Path';
    if (TERRAIN[row] && TERRAIN[row][col] === T.FLOWERS) return 'The Garden';
    if (row <= 7 && col <= 10) return 'North Grove';
    if (row <= 7) return 'North Hill';
    if (row >= 14) return 'South Point';
    if (col >= 14) return 'East Bluff';
    if (col <= 7) return 'West Meadow';
    return 'The Clearing';
  }

  // ── Rendering Helpers ──────────────────────

  // Convert tile coords to screen (isometric) coords
  // Returns the center-top of the tile diamond
  function tileToScreen(col, row) {
    return {
      x: (col - row) * (TILE_W / 2),
      y: (col + row) * (TILE_H / 2),
    };
  }

  // Convert screen coords to tile coords (inverse of tileToScreen)
  function screenToTile(sx, sy) {
    // Inverse of the isometric projection:
    // sx = (col - row) * (TILE_W / 2)
    // sy = (col + row) * (TILE_H / 2)
    // Solving: col = (sx / (TILE_W/2) + sy / (TILE_H/2)) / 2
    //          row = (sy / (TILE_H/2) - sx / (TILE_W/2)) / 2
    const col = (sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2;
    const row = (sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2;
    return { col: Math.round(col), row: Math.round(row) };
  }

  // Draw an isometric diamond (flat tile)
  function drawDiamond(ctx, sx, sy, color, strokeColor) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2);
    ctx.lineTo(sx, sy + TILE_H);
    ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // Draw a tile with slight variation for organic feel
  function drawTile(ctx, col, row, sx, sy, time) {
    const type = TERRAIN[row][col];

    switch (type) {
      case T.DEEP_WATER: {
        // Subtle animated wave by shifting shade
        const wave = Math.sin(time * 0.002 + col * 0.7 + row * 0.5) * 8;
        const r = 10 + wave * 0.3;
        const g = 61 + wave * 0.5;
        const b = 107 + wave;
        drawDiamond(ctx, sx, sy, `rgb(${r},${g},${b})`);
        // Occasional wave highlight
        if (Math.sin(time * 0.001 + col * 1.3 + row * 0.8) > 0.7) {
          drawWaveHighlight(ctx, sx, sy, time, col, row);
        }
        break;
      }
      case T.SHALLOW_WATER: {
        const wave = Math.sin(time * 0.0025 + col * 0.6 + row * 0.4) * 10;
        const r = 26 + wave * 0.4;
        const g = 106 + wave * 0.6;
        const b = 170 + wave;
        drawDiamond(ctx, sx, sy, `rgb(${r},${g},${b})`);
        if (Math.sin(time * 0.0015 + col * 1.1 + row) > 0.6) {
          drawWaveHighlight(ctx, sx, sy, time, col, row);
        }
        break;
      }
      case T.SAND:
        drawDiamond(ctx, sx, sy, (col + row) % 3 === 0 ? C.sandDark : C.sand);
        break;
      case T.GRASS:
        drawDiamond(ctx, sx, sy, (col + row) % 5 === 0 ? C.grassLight : C.grass);
        break;
      case T.DARK_GRASS:
        drawDiamond(ctx, sx, sy, C.darkGrass);
        break;
      case T.STONE_PATH:
        drawDiamond(ctx, sx, sy, (col + row) % 2 === 0 ? C.stonePath : C.stoneLight);
        break;
      case T.WOOD:
        drawDiamond(ctx, sx, sy, (col + row) % 2 === 0 ? C.wood : C.woodDark);
        break;
      case T.FLOWERS:
        drawDiamond(ctx, sx, sy, C.grass);
        drawFlowers(ctx, sx, sy, col, row);
        break;
    }
  }

  function drawWaveHighlight(ctx, sx, sy, time, col, row) {
    const phase = Math.sin(time * 0.003 + col + row * 0.5);
    const ox = phase * 6;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(sx + ox - 8, sy + TILE_H / 2 - 1);
    ctx.quadraticCurveTo(sx + ox, sy + TILE_H / 2 - 4, sx + ox + 8, sy + TILE_H / 2 - 1);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawFlowers(ctx, sx, sy, col, row) {
    // Scatter a few small dots on the grass tile
    const seed = col * 31 + row * 17;
    const colors = [C.flowers1, C.flowers2, C.flowers3];
    for (let i = 0; i < 5; i++) {
      const hash = (seed * (i + 1) * 7) % 100;
      const fx = sx + (hash % 20 - 10) * 1.2;
      const fy = sy + TILE_H * 0.3 + ((hash * 3) % 14 - 2);
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % 3];
      ctx.fill();
    }
  }

  // ── Object Drawing ─────────────────────────

  function drawObject(ctx, col, row, sx, sy) {
    const obj = OBJECTS[row][col];
    if (obj === O.NONE) return;

    switch (obj) {
      case O.TREE:
        drawTree(ctx, sx, sy, col, row);
        break;
      case O.ROCK:
        drawRock(ctx, sx, sy, col, row);
        break;
      case O.BUSH:
        drawBush(ctx, sx, sy);
        break;
      case O.LIGHTHOUSE:
        drawLighthouse(ctx, sx, sy);
        break;
      case O.COTTAGE:
        drawCottageWall(ctx, sx, sy);
        break;
      case O.TALL_GRASS:
        drawTallGrass(ctx, sx, sy, col, row);
        break;
      case O.PIER_POST:
        drawPierPost(ctx, sx, sy);
        break;
      case O.SIGNPOST:
        drawSignpost(ctx, sx, sy);
        break;
      case O.WELL:
        drawWell(ctx, sx, sy);
        break;
    }
  }

  function drawTree(ctx, sx, sy, col, row) {
    const tx = sx;
    const ty = sy - 4;
    const seed = (col * 13 + row * 7) % 5;
    const size = 14 + seed * 2;

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(tx + 4, sy + 8, 14, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Trunk (tapered, with wood grain hint)
    ctx.fillStyle = C.trunkBrown;
    ctx.beginPath();
    ctx.moveTo(tx - 3, ty + 14);
    ctx.lineTo(tx - 2, ty);
    ctx.lineTo(tx + 2, ty);
    ctx.lineTo(tx + 3, ty + 14);
    ctx.closePath();
    ctx.fill();

    // Trunk highlight
    ctx.fillStyle = C.wood;
    ctx.beginPath();
    ctx.moveTo(tx - 1, ty + 14);
    ctx.lineTo(tx - 1, ty + 2);
    ctx.lineTo(tx + 1, ty + 2);
    ctx.lineTo(tx + 1, ty + 14);
    ctx.closePath();
    ctx.fill();

    // Canopy — multiple overlapping ellipses for organic shape
    const canopyY = ty - size + 2;

    // Back layer (shadow)
    ctx.fillStyle = C.leafDark;
    ctx.beginPath();
    ctx.ellipse(tx - 4, canopyY + 4, size * 0.7, size * 0.6, 0, 0, Math.PI * 2);
    ctx.ellipse(tx + 5, canopyY + 6, size * 0.65, size * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(tx, canopyY + 8, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main layer
    ctx.fillStyle = C.leafGreen;
    ctx.beginPath();
    ctx.ellipse(tx - 3, canopyY, size * 0.7, size * 0.65, 0, 0, Math.PI * 2);
    ctx.ellipse(tx + 4, canopyY + 2, size * 0.6, size * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(tx, canopyY + 4, size * 0.75, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top cluster
    ctx.beginPath();
    ctx.ellipse(tx, canopyY - 4, size * 0.55, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlights
    ctx.fillStyle = C.grassLight;
    ctx.beginPath();
    ctx.ellipse(tx - 2, canopyY - 6, size * 0.3, size * 0.25, 0, 0, Math.PI * 2);
    ctx.ellipse(tx + 4, canopyY - 2, size * 0.2, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(ctx, sx, sy, col, row) {
    const seed = (col * 7 + row * 3) % 5;
    const rw = 11 + seed;
    const rh = 7 + seed * 0.5;
    const rx = sx;
    const ry = sy + 5;

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(rx + 3, ry + 5, rw + 2, rh - 1, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Rock shadow layer
    ctx.fillStyle = C.rockGray;
    ctx.beginPath();
    ctx.ellipse(rx, ry + 2, rw + 1, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock body
    ctx.fillStyle = C.rockLight;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mid highlight
    ctx.fillStyle = '#b8b8ae';
    ctx.beginPath();
    ctx.ellipse(rx - 1, ry - 1, rw * 0.7, rh * 0.6, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Top highlight
    ctx.fillStyle = '#d0d0c8';
    ctx.beginPath();
    ctx.ellipse(rx - 2, ry - 2, rw * 0.4, rh * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBush(ctx, sx, sy) {
    const bx = sx;
    const by = sy + 3;

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(bx + 2, by + 6, 11, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Back leaves
    ctx.fillStyle = C.leafDark;
    ctx.beginPath();
    ctx.ellipse(bx - 4, by + 1, 7, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(bx + 4, by + 2, 6, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(bx, by + 2, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Front leaves
    ctx.fillStyle = C.leafGreen;
    ctx.beginPath();
    ctx.ellipse(bx - 3, by - 1, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(bx + 3, by, 5.5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(bx, by - 1, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = C.grassLight;
    ctx.beginPath();
    ctx.ellipse(bx - 1, by - 3, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Small berries/sticks hint
    ctx.fillStyle = C.wood;
    ctx.beginPath();
    ctx.arc(bx + 4, by - 1, 1.2, 0, Math.PI * 2);
    ctx.arc(bx - 3, by + 1, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTallGrass(ctx, sx, sy, col, row) {
    const seed = col * 11 + row * 5;

    // Draw blades in layers for depth
    const colors = [C.darkGrass, C.leafDark, C.leafGreen];

    for (let layer = 0; layer < 3; layer++) {
      ctx.strokeStyle = colors[layer];
      ctx.lineWidth = 2 - layer * 0.4;

      for (let i = 0; i < 4; i++) {
        const idx = layer * 4 + i;
        const ox = ((seed + idx * 17) % 20 - 10) * 0.8;
        const lean = ((seed + idx * 11) % 8 - 4) * 0.6;
        const height = 10 + (seed + idx) % 6;

        ctx.beginPath();
        ctx.moveTo(sx + ox, sy + 10 - layer * 2);
        ctx.quadraticCurveTo(
          sx + ox + lean * 1.2,
          sy + 2 - layer * 2,
          sx + ox + lean * 1.8,
          sy - height - layer * 2
        );
        ctx.stroke();
      }
    }
  }

  function drawLighthouse(ctx, sx, sy) {
    const bx = sx;
    const by = sy - 8;

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(bx + 8, sy + 6, 18, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tower shadow side
    ctx.fillStyle = '#e0d8c8';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 1, by - 44);
    ctx.lineTo(bx + 6, by - 44);
    ctx.lineTo(bx + 9, by);
    ctx.closePath();
    ctx.fill();

    // Tower main
    ctx.fillStyle = C.lighthouse;
    ctx.beginPath();
    ctx.moveTo(bx - 8, by);
    ctx.lineTo(bx - 5, by - 44);
    ctx.lineTo(bx + 1, by - 44);
    ctx.lineTo(bx, by);
    ctx.closePath();
    ctx.fill();

    // Stripes
    ctx.fillStyle = C.cottageRoof;
    ctx.beginPath();
    ctx.moveTo(bx - 7.5, by - 14);
    ctx.lineTo(bx - 6.5, by - 20);
    ctx.lineTo(bx + 6.5, by - 20);
    ctx.lineTo(bx + 7.5, by - 14);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(bx - 6, by - 30);
    ctx.lineTo(bx - 5.5, by - 36);
    ctx.lineTo(bx + 5.5, by - 36);
    ctx.lineTo(bx + 6, by - 30);
    ctx.closePath();
    ctx.fill();

    // Lamp room
    ctx.fillStyle = C.lighthouseTop;
    ctx.fillRect(bx - 6, by - 52, 12, 10);

    // Windows on lamp room
    ctx.fillStyle = '#d4e8f0';
    ctx.fillRect(bx - 4, by - 50, 3, 6);
    ctx.fillRect(bx + 1, by - 50, 3, 6);

    // Lamp glow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(bx, by - 47, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lamp center
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(bx, by - 47, 3, 0, Math.PI * 2);
    ctx.fill();

    // Roof
    ctx.fillStyle = C.lighthouseTop;
    ctx.beginPath();
    ctx.moveTo(bx - 8, by - 52);
    ctx.lineTo(bx, by - 62);
    ctx.lineTo(bx + 8, by - 52);
    ctx.closePath();
    ctx.fill();

    // Roof highlight
    ctx.fillStyle = '#1a5a90';
    ctx.beginPath();
    ctx.moveTo(bx - 6, by - 52);
    ctx.lineTo(bx - 1, by - 60);
    ctx.lineTo(bx - 1, by - 52);
    ctx.closePath();
    ctx.fill();
  }

  function drawCottageWall(ctx, sx, sy) {
    const bx = sx;
    const by = sy - 4;

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(bx + 6, sy + 6, 20, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Wall shadow side
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(bx + 2, by - 18, 13, 22);

    // Wall main
    ctx.fillStyle = C.cottage;
    ctx.fillRect(bx - 14, by - 18, 18, 22);

    // Wall edge line
    ctx.strokeStyle = '#d8d0c0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 2, by - 18);
    ctx.lineTo(bx + 2, by + 4);
    ctx.stroke();

    // Roof shadow
    ctx.fillStyle = '#a86048';
    ctx.beginPath();
    ctx.moveTo(bx, by - 30);
    ctx.lineTo(bx + 18, by - 18);
    ctx.lineTo(bx + 2, by - 18);
    ctx.closePath();
    ctx.fill();

    // Roof main
    ctx.fillStyle = C.cottageRoof;
    ctx.beginPath();
    ctx.moveTo(bx - 17, by - 18);
    ctx.lineTo(bx, by - 32);
    ctx.lineTo(bx + 2, by - 18);
    ctx.closePath();
    ctx.fill();

    // Roof highlight
    ctx.fillStyle = '#d08868';
    ctx.beginPath();
    ctx.moveTo(bx - 14, by - 18);
    ctx.lineTo(bx - 2, by - 28);
    ctx.lineTo(bx - 2, by - 18);
    ctx.closePath();
    ctx.fill();

    // Chimney
    ctx.fillStyle = C.rockGray;
    ctx.fillRect(bx + 6, by - 34, 5, 10);
    ctx.fillStyle = C.rockLight;
    ctx.fillRect(bx + 5, by - 35, 7, 2);

    // Smoke puff
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bx + 8, by - 38, 2, 0, Math.PI * 2);
    ctx.arc(bx + 10, by - 41, 2.5, 0, Math.PI * 2);
    ctx.arc(bx + 8, by - 44, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Door
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(bx - 4, by - 5, 7, 9);
    ctx.fillStyle = C.wood;
    ctx.fillRect(bx - 3, by - 4, 5, 7);

    // Door handle
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(bx + 1, by - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Windows
    ctx.fillStyle = '#d4e8f0';
    ctx.fillRect(bx - 12, by - 14, 6, 5);

    // Window frame
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 12, by - 14, 6, 5);

    // Window cross
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bx - 9, by - 14);
    ctx.lineTo(bx - 9, by - 9);
    ctx.moveTo(bx - 12, by - 11.5);
    ctx.lineTo(bx - 6, by - 11.5);
    ctx.stroke();

    // Window glow
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(bx - 11, by - 13, 4, 3);
    ctx.restore();
  }

  function drawPierPost(ctx, sx, sy) {
    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx + 2, sy + 7, 6, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Post body
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(sx - 2.5, sy - 6, 5, 13);
    // Highlight
    ctx.fillStyle = C.wood;
    ctx.fillRect(sx - 1.5, sy - 6, 2, 12);

    // Cap
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(sx - 5, sy - 9, 10, 4);
    ctx.fillStyle = C.wood;
    ctx.fillRect(sx - 4, sy - 8, 8, 2);
  }

  function drawSignpost(ctx, sx, sy) {
    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx + 3, sy + 10, 8, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Pole
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(sx - 2, sy - 4, 4, 17);
    ctx.fillStyle = C.wood;
    ctx.fillRect(sx - 1, sy - 4, 2, 16);

    // Sign board shadow
    ctx.fillStyle = '#5a4528';
    ctx.fillRect(sx - 10, sy - 15, 21, 13);

    // Sign board
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(sx - 11, sy - 17, 21, 13);

    // Sign face
    ctx.fillStyle = C.sand;
    ctx.fillRect(sx - 9, sy - 15, 17, 9);

    // Sign face highlight
    ctx.fillStyle = '#f0e5d0';
    ctx.fillRect(sx - 8, sy - 14, 15, 3);

    // Text lines (decorative marks)
    ctx.fillStyle = C.text;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(sx - 7, sy - 13, 13, 1.5);
    ctx.fillRect(sx - 7, sy - 10, 9, 1.5);
    ctx.globalAlpha = 1;
  }

  function drawWell(ctx, sx, sy) {
    const wx = sx;
    const wy = sy + 2;

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(wx + 4, wy + 8, 16, 7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Base stone ring shadow
    ctx.fillStyle = '#7a7a72';
    ctx.beginPath();
    ctx.ellipse(wx, wy + 4, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base stone ring
    ctx.fillStyle = C.rockGray;
    ctx.beginPath();
    ctx.ellipse(wx, wy + 1, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner ring
    ctx.fillStyle = C.rockLight;
    ctx.beginPath();
    ctx.ellipse(wx, wy - 1, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone ring highlight
    ctx.fillStyle = '#d0d0c8';
    ctx.beginPath();
    ctx.ellipse(wx - 4, wy - 2, 5, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Dark water inside
    ctx.fillStyle = C.deepWater;
    ctx.beginPath();
    ctx.ellipse(wx, wy - 1, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water shimmer
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = C.shallowWater;
    ctx.beginPath();
    ctx.ellipse(wx - 2, wy - 2, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Support posts with highlight
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(wx - 10, wy - 18, 3, 19);
    ctx.fillRect(wx + 7, wy - 18, 3, 19);
    ctx.fillStyle = C.wood;
    ctx.fillRect(wx - 9, wy - 18, 1.5, 18);
    ctx.fillRect(wx + 8, wy - 18, 1.5, 18);

    // Rope and bucket hint
    ctx.strokeStyle = C.sand;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx, wy - 18);
    ctx.lineTo(wx, wy - 8);
    ctx.stroke();

    // Roof beam
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(wx - 11, wy - 20, 22, 3);
    ctx.fillStyle = C.wood;
    ctx.fillRect(wx - 10, wy - 19, 20, 1);

    // Roof shadow
    ctx.fillStyle = '#a86048';
    ctx.beginPath();
    ctx.moveTo(wx, wy - 27);
    ctx.lineTo(wx + 14, wy - 19);
    ctx.lineTo(wx, wy - 19);
    ctx.closePath();
    ctx.fill();

    // Roof main
    ctx.fillStyle = C.cottageRoof;
    ctx.beginPath();
    ctx.moveTo(wx - 14, wy - 19);
    ctx.lineTo(wx, wy - 28);
    ctx.lineTo(wx, wy - 19);
    ctx.closePath();
    ctx.fill();

    // Roof highlight
    ctx.fillStyle = '#d08868';
    ctx.beginPath();
    ctx.moveTo(wx - 12, wy - 19);
    ctx.lineTo(wx - 2, wy - 26);
    ctx.lineTo(wx - 2, wy - 19);
    ctx.closePath();
    ctx.fill();
  }

  // ── Interaction Data ───────────────────────

  const INTERACTIONS = {
    [O.SIGNPOST]: {
      a: 'A weathered signpost reads: "Welcome to Keeper\'s Isle. The lighthouse watches to the east."',
      b: 'You give the post a firm pat. It wobbles slightly.',
    },
    [O.WELL]: {
      a: 'An old stone well. You can hear water echoing far below.',
      b: 'You lower the bucket and draw up cold, clear water. Refreshing.',
    },
    [O.LIGHTHOUSE]: {
      a: 'The lighthouse tower. Its lamp guides ships home each night.',
      b: 'The heavy door is locked. You\'ll need to find the key.',
    },
    [O.COTTAGE]: {
      a: 'Your cozy cottage. A thin curl of smoke rises from the chimney.',
      b: 'You peek through the window. Everything looks tidy inside.',
    },
    [O.TREE]: {
      a: 'A sturdy tree. Its branches sway gently in the sea breeze.',
      b: 'You shake the trunk. A few leaves flutter down.',
    },
    [O.ROCK]: {
      a: 'A smooth, sun-warmed stone.',
      b: 'You give it a push. It doesn\'t budge.',
    },
    [O.BUSH]: {
      a: 'A wild bush. Small berries peek through the leaves.',
      b: 'You rustle through the bush. A startled bird flies out.',
    },
    [O.PIER_POST]: {
      a: 'A weathered mooring post. Salt-crusted rope hangs from it.',
      b: 'You tug the rope. It holds firm.',
    },
  };

  // ── Player Drawing ─────────────────────────

  function drawPlayer(ctx, sx, sy, direction) {
    const px = sx;
    const py = sy - 4; // stand slightly above tile center

    // Soft shadow
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(px, py + 14, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs (rounded)
    ctx.fillStyle = C.playerBody;
    ctx.beginPath();
    ctx.ellipse(px - 2.5, py + 9, 2.5, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(px + 2.5, py + 9, 2.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shoes (rounded)
    ctx.fillStyle = C.trunkBrown;
    ctx.beginPath();
    ctx.ellipse(px - 3, py + 13, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(px + 3, py + 13, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (rounded rectangle shape using arc)
    ctx.fillStyle = C.playerBody;
    ctx.beginPath();
    ctx.moveTo(px - 5, py + 2);
    ctx.lineTo(px - 5, py - 4);
    ctx.quadraticCurveTo(px - 5, py - 7, px - 2, py - 7);
    ctx.lineTo(px + 2, py - 7);
    ctx.quadraticCurveTo(px + 5, py - 7, px + 5, py - 4);
    ctx.lineTo(px + 5, py + 2);
    ctx.quadraticCurveTo(px + 5, py + 5, px + 2, py + 5);
    ctx.lineTo(px - 2, py + 5);
    ctx.quadraticCurveTo(px - 5, py + 5, px - 5, py + 2);
    ctx.closePath();
    ctx.fill();

    // Collar accent
    ctx.fillStyle = C.cottage;
    ctx.beginPath();
    ctx.ellipse(px, py - 6, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head (slightly larger, softer)
    ctx.fillStyle = C.playerSkin;
    ctx.beginPath();
    ctx.arc(px, py - 12, 7, 0, Math.PI * 2);
    ctx.fill();

    // Hair (fuller, with slight texture)
    ctx.fillStyle = C.playerHair;
    ctx.beginPath();
    ctx.arc(px, py - 14, 7, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    // Hair tuft
    ctx.beginPath();
    ctx.ellipse(px + 3, py - 18, 3, 4, Math.PI * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Ear (visible on side views)
    if (direction === 'left' || direction === 'right') {
      ctx.fillStyle = C.playerSkin;
      const earX = direction === 'left' ? px - 6 : px + 6;
      ctx.beginPath();
      ctx.ellipse(earX, py - 11, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes (direction-dependent, with pupils)
    const eyeOx = direction === 'left' ? -2 : direction === 'right' ? 2 : 0;
    const eyeOy = direction === 'up' ? -1 : 0;

    // Eye whites
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(px - 2.5 + eyeOx * 0.5, py - 11 + eyeOy, 2, 2.2, 0, 0, Math.PI * 2);
    ctx.ellipse(px + 2.5 + eyeOx * 0.5, py - 11 + eyeOy, 2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = C.playerHair;
    ctx.beginPath();
    ctx.arc(px - 2.5 + eyeOx, py - 10.5 + eyeOy, 1, 0, Math.PI * 2);
    ctx.arc(px + 2.5 + eyeOx, py - 10.5 + eyeOy, 1, 0, Math.PI * 2);
    ctx.fill();

    // Subtle blush
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = C.flowers1;
    ctx.beginPath();
    ctx.ellipse(px - 4, py - 9, 2, 1.2, 0, 0, Math.PI * 2);
    ctx.ellipse(px + 4, py - 9, 2, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Game Class ─────────────────────────────

  class Game {
    constructor(canvas, hudLabel) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.hudLabel = hudLabel;

      // Player state
      this.player = {
        col: 8,  // start on the stone path
        row: 9,
        targetCol: 8,
        targetRow: 9,
        prevCol: 8,
        prevRow: 9,
        moving: false,
        moveProgress: 0,
        direction: 'down',
      };

      // Camera offset (in screen pixels) — initialize at player position
      const startPos = tileToScreen(this.player.col, this.player.row);
      this.camera = { x: startPos.x, y: startPos.y };

      // Input
      this.keys = {};
      this.justPressed = {};
      this.moveQueue = null;

      // Dialogue state
      this.dialogueOpen = false;
      this.dialogueBox = document.getElementById('dialogue-box');
      this.dialogueText = document.getElementById('dialogue-text');

      // Inventory
      this.inventory = { sticks: 0, stones: 0 };
      this.harvestedObjects = new Set(); // tracks "col,row" strings
      this.invSticksEl = document.getElementById('inv-sticks');
      this.invStonesEl = document.getElementById('inv-stones');
      this.invSticksItem = this.invSticksEl ? this.invSticksEl.closest('.inv-item') : null;
      this.invStonesItem = this.invStonesEl ? this.invStonesEl.closest('.inv-item') : null;

      // Inventory panel
      this.inventoryOpen = false;
      this.invPanel = document.getElementById('inventory-panel');
      this.invPanelSticks = document.getElementById('inv-panel-sticks');
      this.invPanelStones = document.getElementById('inv-panel-stones');
      this.invBtn = document.getElementById('inv-btn');

      // Collection popup
      this.collectPopup = document.getElementById('collect-popup');
      this.collectText = document.getElementById('collect-text');
      this.collectTimeout = null;

      // Tap-to-move pathfinding
      this.pathTarget = null; // { col, row } destination
      this.pathQueue = [];    // Array of { col, row } steps

      // Time
      this.lastTime = 0;
      this.running = false;

      // Load saved state if exists
      this.loadState();

      this.resize();
      this.setupInput();
    }

    // ── Save/Load State ──

    saveState() {
      const state = {
        player: {
          col: this.player.col,
          row: this.player.row,
          direction: this.player.direction,
        },
        inventory: { ...this.inventory },
        harvestedObjects: Array.from(this.harvestedObjects),
      };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      } catch (e) {
        // localStorage might be unavailable or full
      }
    }

    loadState() {
      try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return;

        const state = JSON.parse(saved);

        // Restore player position (with validation)
        if (state.player &&
            typeof state.player.col === 'number' &&
            typeof state.player.row === 'number' &&
            state.player.col >= 0 && state.player.col < MAP_COLS &&
            state.player.row >= 0 && state.player.row < MAP_ROWS) {
          this.player.col = state.player.col;
          this.player.row = state.player.row;
          this.player.targetCol = state.player.col;
          this.player.targetRow = state.player.row;
          this.player.prevCol = state.player.col;
          this.player.prevRow = state.player.row;
          this.player.direction = state.player.direction || 'down';

          // Update camera to player position
          const pos = tileToScreen(this.player.col, this.player.row);
          this.camera.x = pos.x;
          this.camera.y = pos.y;
        }

        // Restore inventory
        if (state.inventory) {
          if (typeof state.inventory.sticks === 'number') {
            this.inventory.sticks = state.inventory.sticks;
          }
          if (typeof state.inventory.stones === 'number') {
            this.inventory.stones = state.inventory.stones;
          }
        }

        // Restore harvested objects
        if (Array.isArray(state.harvestedObjects)) {
          this.harvestedObjects = new Set(state.harvestedObjects);
        }

        // Update UI
        this.updateInventory();
      } catch (e) {
        // Invalid save data, start fresh
        console.warn('Failed to load save data:', e);
      }
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.screenW = rect.width;
      this.screenH = rect.height;
    }

    setupInput() {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','x','z','i'].includes(e.key)) {
          e.preventDefault();
        }
        if (!this.keys[e.key]) {
          this.justPressed[e.key] = true;
        }
        this.keys[e.key] = true;
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.key] = false;
      });
      window.addEventListener('resize', () => this.resize());

      // D-pad buttons (hold-style, like directional keys)
      const bindDpad = (id, dir) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const start = (e) => { e.preventDefault(); this.keys[dir] = true; };
        const end = (e) => { e.preventDefault(); this.keys[dir] = false; };
        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', end, { passive: false });
        btn.addEventListener('touchcancel', end, { passive: false });
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
        btn.addEventListener('mouseleave', end);
      };
      bindDpad('btn-up', 'ArrowUp');
      bindDpad('btn-down', 'ArrowDown');
      bindDpad('btn-left', 'ArrowLeft');
      bindDpad('btn-right', 'ArrowRight');

      // A/B buttons (tap-style, trigger on press)
      const bindAction = (id, key) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const tap = (e) => {
          e.preventDefault();
          this.justPressed[key] = true;
        };
        btn.addEventListener('touchstart', tap, { passive: false });
        btn.addEventListener('mousedown', tap);
      };
      bindAction('btn-a', 'x');   // A button maps to X key
      bindAction('btn-b', 'z');   // B button maps to Z key

      // Inventory button
      if (this.invBtn) {
        const openInv = (e) => {
          e.preventDefault();
          this.justPressed['i'] = true;
        };
        this.invBtn.addEventListener('touchstart', openInv, { passive: false });
        this.invBtn.addEventListener('mousedown', openInv);
      }

      // Tap-to-move on canvas
      const handleTap = (clientX, clientY) => {
        if (this.dialogueOpen || this.inventoryOpen) return;

        const rect = this.canvas.getBoundingClientRect();
        const tapX = clientX - rect.left;
        const tapY = clientY - rect.top;

        // Convert screen tap to world coordinates (accounting for camera)
        const worldX = tapX - this.screenW / 2 + this.camera.x;
        const worldY = tapY - this.screenH / 2 + this.camera.y - 40; // -40 matches render offset

        // Convert world coords to tile
        const { col, row } = screenToTile(worldX, worldY);

        // Check if destination is valid and walkable
        if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
          if (this.canWalk(col, row)) {
            this.setPathTarget(col, row);
          }
        }
      };

      this.canvas.addEventListener('click', (e) => {
        handleTap(e.clientX, e.clientY);
      });

      this.canvas.addEventListener('touchend', (e) => {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          handleTap(touch.clientX, touch.clientY);
        }
      }, { passive: true });
    }

    start() {
      this.running = true;
      this.lastTime = performance.now();
      this.updateHud();
      requestAnimationFrame((t) => this.loop(t));
    }

    loop(time) {
      if (!this.running) return;
      const dt = time - this.lastTime;
      this.lastTime = time;
      this.update(dt, time);
      this.render(time);
      requestAnimationFrame((t) => this.loop(t));
    }

    // ── Update ──

    update(dt) {
      // Handle button presses
      const pressedA = this.justPressed['x'] || this.justPressed['X'];
      const pressedB = this.justPressed['z'] || this.justPressed['Z'];
      const pressedI = this.justPressed['i'] || this.justPressed['I'];

      // Inventory panel takes priority
      if (this.inventoryOpen) {
        if (pressedI || pressedA || pressedB) {
          this.hideInventoryPanel();
        }
        this.justPressed = {};
        return;
      }

      // Dialogue
      if (this.dialogueOpen) {
        if (pressedA || pressedB) {
          this.hideDialogue();
        }
        this.justPressed = {};
        return;
      }

      // Open inventory
      if (pressedI) {
        this.showInventoryPanel();
        this.justPressed = {};
        return;
      }

      if (pressedA) this.interact('a');
      if (pressedB) this.interact('b');
      this.justPressed = {};

      const p = this.player;

      if (p.moving) {
        p.moveProgress += dt / MOVE_MS;
        if (p.moveProgress >= 1) {
          // Arrive
          p.col = p.targetCol;
          p.row = p.targetRow;
          p.moving = false;
          p.moveProgress = 0;
          this.updateHud();
          this.saveState();

          // Check if reached path destination
          if (this.pathTarget && p.col === this.pathTarget.col && p.row === this.pathTarget.row) {
            this.clearPath();
          }
        }
      }

      if (!p.moving) {
        const dir = this.getInputDirection();
        if (dir) {
          // Manual input clears any active path
          this.clearPath();

          const nc = p.col + dir.dc;
          const nr = p.row + dir.dr;
          if (this.canWalk(nc, nr)) {
            p.prevCol = p.col;
            p.prevRow = p.row;
            p.targetCol = nc;
            p.targetRow = nr;
            p.moving = true;
            p.moveProgress = 0;
            p.direction = dir.name;
          }
        } else if (this.pathQueue.length > 0) {
          // Follow the path
          const next = this.getNextPathStep();
          if (next && this.canWalk(next.col, next.row)) {
            // Calculate direction for animation
            const dc = next.col - p.col;
            const dr = next.row - p.row;
            let direction = 'down';
            if (dr < 0) direction = 'up';
            else if (dr > 0) direction = 'down';
            else if (dc < 0) direction = 'left';
            else if (dc > 0) direction = 'right';

            p.prevCol = p.col;
            p.prevRow = p.row;
            p.targetCol = next.col;
            p.targetRow = next.row;
            p.moving = true;
            p.moveProgress = 0;
            p.direction = direction;
          } else {
            // Path blocked, clear it
            this.clearPath();
          }
        }
      }

      // Smooth camera toward player
      const target = this.getPlayerScreenPos();
      this.camera.x += (target.x - this.camera.x) * 0.1;
      this.camera.y += (target.y - this.camera.y) * 0.1;
    }

    getInputDirection() {
      if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
        return { dc: 0, dr: -1, name: 'up' };
      }
      if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
        return { dc: 0, dr: 1, name: 'down' };
      }
      if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
        return { dc: -1, dr: 0, name: 'left' };
      }
      if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
        return { dc: 1, dr: 0, name: 'right' };
      }
      return null;
    }

    canWalk(col, row) {
      if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return false;
      const tile = TERRAIN[row][col];
      if (tile === T.DEEP_WATER || tile === T.SHALLOW_WATER) return false;
      const obj = OBJECTS[row][col];
      if (obj === O.TREE || obj === O.ROCK || obj === O.BUSH || obj === O.COTTAGE || obj === O.LIGHTHOUSE || obj === O.PIER_POST || obj === O.SIGNPOST || obj === O.WELL) return false;
      return true;
    }

    // ── Pathfinding (A*) ──

    setPathTarget(col, row) {
      const startCol = this.player.moving ? this.player.targetCol : this.player.col;
      const startRow = this.player.moving ? this.player.targetRow : this.player.row;

      // Already there
      if (startCol === col && startRow === row) {
        this.pathTarget = null;
        this.pathQueue = [];
        return;
      }

      const path = this.findPath(startCol, startRow, col, row);
      if (path && path.length > 0) {
        this.pathTarget = { col, row };
        this.pathQueue = path;
      }
    }

    findPath(startCol, startRow, endCol, endRow) {
      // A* pathfinding
      const openSet = [];
      const closedSet = new Set();
      const cameFrom = new Map();

      const heuristic = (c, r) => Math.abs(c - endCol) + Math.abs(r - endRow);
      const key = (c, r) => `${c},${r}`;

      const gScore = new Map();
      const fScore = new Map();

      gScore.set(key(startCol, startRow), 0);
      fScore.set(key(startCol, startRow), heuristic(startCol, startRow));
      openSet.push({ col: startCol, row: startRow });

      const neighbors = [
        { dc: 0, dr: -1 }, // up
        { dc: 0, dr: 1 },  // down
        { dc: -1, dr: 0 }, // left
        { dc: 1, dr: 0 },  // right
      ];

      while (openSet.length > 0) {
        // Get node with lowest fScore
        openSet.sort((a, b) => {
          const fa = fScore.get(key(a.col, a.row)) || Infinity;
          const fb = fScore.get(key(b.col, b.row)) || Infinity;
          return fa - fb;
        });
        const current = openSet.shift();
        const ck = key(current.col, current.row);

        // Reached goal
        if (current.col === endCol && current.row === endRow) {
          const path = [];
          let curr = ck;
          while (cameFrom.has(curr)) {
            const [c, r] = curr.split(',').map(Number);
            path.unshift({ col: c, row: r });
            curr = cameFrom.get(curr);
          }
          return path;
        }

        closedSet.add(ck);

        for (const { dc, dr } of neighbors) {
          const nc = current.col + dc;
          const nr = current.row + dr;
          const nk = key(nc, nr);

          if (closedSet.has(nk)) continue;
          if (!this.canWalk(nc, nr)) continue;

          const tentativeG = (gScore.get(ck) || 0) + 1;
          const existingG = gScore.get(nk);

          if (existingG === undefined || tentativeG < existingG) {
            cameFrom.set(nk, ck);
            gScore.set(nk, tentativeG);
            fScore.set(nk, tentativeG + heuristic(nc, nr));

            if (!openSet.some(n => n.col === nc && n.row === nr)) {
              openSet.push({ col: nc, row: nr });
            }
          }
        }
      }

      // No path found
      return null;
    }

    clearPath() {
      this.pathTarget = null;
      this.pathQueue = [];
    }

    getNextPathStep() {
      if (this.pathQueue.length === 0) return null;
      return this.pathQueue.shift();
    }

    getPlayerScreenPos() {
      const p = this.player;
      if (p.moving) {
        const from = tileToScreen(p.prevCol, p.prevRow);
        const to = tileToScreen(p.targetCol, p.targetRow);
        const t = this.easeInOut(p.moveProgress);
        return {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        };
      }
      return tileToScreen(p.col, p.row);
    }

    easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    updateHud() {
      if (this.hudLabel) {
        this.hudLabel.textContent = getLocationLabel(this.player.col, this.player.row);
      }
    }

    // ── Interaction ──

    getFacingTile() {
      const p = this.player;
      const dirMap = {
        up:    { dc: 0, dr: -1 },
        down:  { dc: 0, dr:  1 },
        left:  { dc: -1, dr: 0 },
        right: { dc:  1, dr: 0 },
      };
      const d = dirMap[p.direction] || { dc: 0, dr: 1 };
      return { col: p.col + d.dc, row: p.row + d.dr };
    }

    interact(button) {
      if (this.player.moving) return;

      const { col, row } = this.getFacingTile();
      if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return;

      const obj = OBJECTS[row][col];
      const data = INTERACTIONS[obj];
      if (!data) return;

      const key = `${col},${row}`;
      const harvested = this.harvestedObjects.has(key);

      // Handle B button collection for bushes and rocks
      if (button === 'b') {
        if (obj === O.BUSH && !harvested) {
          this.inventory.sticks++;
          this.harvestedObjects.add(key);
          this.updateInventory();
          this.saveState();
          this.showCollectPopup('+1 Stick');
          this.pulseInvItem(this.invSticksItem);
          return;
        }
        if (obj === O.ROCK && !harvested) {
          this.inventory.stones++;
          this.harvestedObjects.add(key);
          this.updateInventory();
          this.saveState();
          this.showCollectPopup('+1 Stone');
          this.pulseInvItem(this.invStonesItem);
          return;
        }
        // Show "already collected" message for harvested objects
        if ((obj === O.BUSH || obj === O.ROCK) && harvested) {
          this.showDialogue(obj === O.BUSH
            ? 'You already searched this bush.'
            : 'You already took a stone from here.');
          return;
        }
      }

      const text = data[button];
      if (text) {
        this.showDialogue(text);
      }
    }

    updateInventory() {
      if (this.invSticksEl) this.invSticksEl.textContent = this.inventory.sticks;
      if (this.invStonesEl) this.invStonesEl.textContent = this.inventory.stones;
    }

    showCollectPopup(text) {
      if (this.collectTimeout) {
        clearTimeout(this.collectTimeout);
      }
      this.collectText.textContent = text;
      this.collectPopup.classList.remove('hidden');
      // Force reflow to restart animation
      this.collectPopup.style.animation = 'none';
      this.collectPopup.offsetHeight;
      this.collectPopup.style.animation = '';

      this.collectTimeout = setTimeout(() => {
        this.collectPopup.classList.add('hidden');
      }, 800);
    }

    pulseInvItem(el) {
      if (!el) return;
      el.classList.remove('pulse');
      el.offsetHeight; // Force reflow
      el.classList.add('pulse');
      setTimeout(() => el.classList.remove('pulse'), 300);
    }

    showDialogue(text) {
      this.dialogueOpen = true;
      this.dialogueText.textContent = text;
      this.dialogueBox.classList.remove('hidden');
    }

    hideDialogue() {
      this.dialogueOpen = false;
      this.dialogueBox.classList.add('hidden');
    }

    showInventoryPanel() {
      this.inventoryOpen = true;
      // Update panel counts
      if (this.invPanelSticks) this.invPanelSticks.textContent = this.inventory.sticks;
      if (this.invPanelStones) this.invPanelStones.textContent = this.inventory.stones;
      this.invPanel.classList.remove('hidden');
    }

    hideInventoryPanel() {
      this.inventoryOpen = false;
      this.invPanel.classList.add('hidden');
    }

    // ── Render ──

    render(time) {
      const ctx = this.ctx;
      const w = this.screenW;
      const h = this.screenH;

      // Clear
      ctx.fillStyle = C.deepWater;
      ctx.fillRect(0, 0, w, h);

      // Camera transform: center player on screen
      ctx.save();
      ctx.translate(w / 2 - this.camera.x, h / 2 - this.camera.y + 40);

      // Draw tiles back-to-front (painter's algorithm)
      // In isometric, we draw row by row, col by col
      for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
          const { x, y } = tileToScreen(col, row);
          drawTile(ctx, col, row, x, y, time);
        }
      }

      // Draw destination marker if path target exists
      if (this.pathTarget) {
        const { x, y } = tileToScreen(this.pathTarget.col, this.pathTarget.row);
        const pulse = 0.5 + Math.sin(time * 0.006) * 0.3;
        ctx.save();
        ctx.globalAlpha = pulse * 0.4;
        ctx.strokeStyle = C.playerBody;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.lineTo(x + TILE_W / 2 - 4, y + TILE_H / 2);
        ctx.lineTo(x, y + TILE_H - 4);
        ctx.lineTo(x - TILE_W / 2 + 4, y + TILE_H / 2);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // Collect drawable entities (objects + player) for depth sorting
      const entities = [];

      for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
          if (OBJECTS[row][col] !== O.NONE) {
            entities.push({ col, row, type: 'object' });
          }
        }
      }

      // Player position for sorting
      const pPos = this.getPlayerScreenPos();
      const pCol = this.player.moving
        ? this.player.prevCol + (this.player.targetCol - this.player.prevCol) * this.player.moveProgress
        : this.player.col;
      const pRow = this.player.moving
        ? this.player.prevRow + (this.player.targetRow - this.player.prevRow) * this.player.moveProgress
        : this.player.row;
      entities.push({ col: pCol, row: pRow, type: 'player' });

      // Sort by depth (row + col gives isometric depth)
      entities.sort((a, b) => (a.row + a.col) - (b.row + b.col));

      // Draw sorted entities
      for (const ent of entities) {
        if (ent.type === 'player') {
          drawPlayer(ctx, pPos.x, pPos.y, this.player.direction);
        } else {
          const { x, y } = tileToScreen(ent.col, ent.row);
          drawObject(ctx, ent.col, ent.row, x, y);
        }
      }

      ctx.restore();
    }
  }

  // ── Initialization ─────────────────────────

  const startScreen = document.getElementById('start-screen');
  const gameContainer = document.getElementById('game-container');
  const canvas = document.getElementById('game-canvas');
  const hudLabel = document.getElementById('location-label');
  const startBtn = document.getElementById('start-btn');

  let game = null;

  function startGame() {
    startScreen.style.display = 'none';
    gameContainer.classList.remove('hidden');

    game = new Game(canvas, hudLabel);
    // Small delay to let layout settle
    requestAnimationFrame(() => {
      game.resize();
      game.start();
    });
  }

  startBtn.addEventListener('click', startGame);

  // Check for saved progress
  const hasSave = localStorage.getItem(SAVE_KEY);
  if (hasSave) {
    // Update button text and auto-start
    startBtn.textContent = 'Continue';
    startGame();
  }

})();
