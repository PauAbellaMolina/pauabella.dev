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
    // Trunk
    const tx = sx;
    const ty = sy - 4;
    ctx.fillStyle = C.trunkBrown;
    ctx.fillRect(tx - 2, ty, 4, 14);

    // Canopy — layered circles for an organic look
    const seed = (col * 13 + row * 7) % 3;
    const size = 12 + seed * 2;

    ctx.fillStyle = C.leafDark;
    ctx.beginPath();
    ctx.arc(tx, ty - size + 4, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C.leafGreen;
    ctx.beginPath();
    ctx.arc(tx + 2, ty - size + 1, size - 3, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = C.grassLight;
    ctx.beginPath();
    ctx.arc(tx + 3, ty - size - 2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(ctx, sx, sy, col, row) {
    const seed = (col * 7 + row * 3) % 5;
    const rw = 10 + seed;
    const rh = 6 + seed * 0.5;
    const rx = sx;
    const ry = sy + 6;

    // Shadow
    ctx.fillStyle = C.rockGray;
    ctx.beginPath();
    ctx.ellipse(rx, ry + 2, rw + 1, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock body
    ctx.fillStyle = C.rockLight;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = '#c0c0b8';
    ctx.beginPath();
    ctx.ellipse(rx - 2, ry - 2, rw * 0.5, rh * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBush(ctx, sx, sy) {
    const bx = sx;
    const by = sy + 4;

    ctx.fillStyle = C.leafDark;
    ctx.beginPath();
    ctx.ellipse(bx, by, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C.leafGreen;
    ctx.beginPath();
    ctx.ellipse(bx + 1, by - 2, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTallGrass(ctx, sx, sy, col, row) {
    const seed = col * 11 + row * 5;
    ctx.strokeStyle = C.darkGrass;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const ox = (seed + i * 13) % 16 - 8;
      const lean = ((seed + i * 7) % 6 - 3) * 0.8;
      ctx.beginPath();
      ctx.moveTo(sx + ox, sy + 10);
      ctx.quadraticCurveTo(sx + ox + lean, sy - 2, sx + ox + lean * 1.5, sy - 8);
      ctx.stroke();
    }
  }

  function drawLighthouse(ctx, sx, sy) {
    // Base
    const bx = sx;
    const by = sy - 8;

    // Tower
    ctx.fillStyle = C.lighthouse;
    ctx.beginPath();
    ctx.moveTo(bx - 8, by);
    ctx.lineTo(bx - 5, by - 44);
    ctx.lineTo(bx + 5, by - 44);
    ctx.lineTo(bx + 8, by);
    ctx.closePath();
    ctx.fill();

    // Stripe
    ctx.fillStyle = C.cottageRoof;
    ctx.fillRect(bx - 7, by - 16, 14, 6);
    ctx.fillRect(bx - 6, by - 32, 12, 6);

    // Lamp room
    ctx.fillStyle = C.lighthouseTop;
    ctx.fillRect(bx - 6, by - 50, 12, 8);

    // Lamp
    ctx.fillStyle = '#e8c44a';
    ctx.beginPath();
    ctx.arc(bx, by - 46, 3, 0, Math.PI * 2);
    ctx.fill();

    // Roof
    ctx.fillStyle = C.lighthouseTop;
    ctx.beginPath();
    ctx.moveTo(bx - 7, by - 50);
    ctx.lineTo(bx, by - 58);
    ctx.lineTo(bx + 7, by - 50);
    ctx.closePath();
    ctx.fill();
  }

  function drawCottageWall(ctx, sx, sy) {
    const bx = sx;
    const by = sy - 4;

    // Wall (isometric-ish front face)
    ctx.fillStyle = C.cottage;
    ctx.fillRect(bx - 14, by - 18, 28, 22);

    // Roof
    ctx.fillStyle = C.cottageRoof;
    ctx.beginPath();
    ctx.moveTo(bx - 17, by - 18);
    ctx.lineTo(bx, by - 30);
    ctx.lineTo(bx + 17, by - 18);
    ctx.closePath();
    ctx.fill();

    // Door
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(bx - 3, by - 4, 6, 8);

    // Window
    ctx.fillStyle = '#d4e8f0';
    ctx.fillRect(bx - 11, by - 14, 6, 5);
    ctx.fillRect(bx + 5, by - 14, 6, 5);

    // Window cross
    ctx.strokeStyle = C.cottage;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - 8, by - 14);
    ctx.lineTo(bx - 8, by - 9);
    ctx.moveTo(bx - 11, by - 11.5);
    ctx.lineTo(bx - 5, by - 11.5);
    ctx.moveTo(bx + 8, by - 14);
    ctx.lineTo(bx + 8, by - 9);
    ctx.moveTo(bx + 5, by - 11.5);
    ctx.lineTo(bx + 11, by - 11.5);
    ctx.stroke();
  }

  function drawPierPost(ctx, sx, sy) {
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(sx - 2, sy - 6, 4, 12);
    ctx.fillStyle = C.wood;
    ctx.fillRect(sx - 4, sy - 8, 8, 3);
  }

  function drawSignpost(ctx, sx, sy) {
    // Pole
    ctx.fillStyle = C.wood;
    ctx.fillRect(sx - 1.5, sy - 4, 3, 16);

    // Sign board
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(sx - 10, sy - 16, 20, 12);

    // Sign face
    ctx.fillStyle = C.sand;
    ctx.fillRect(sx - 8, sy - 14, 16, 8);

    // Text lines (tiny decorative marks)
    ctx.fillStyle = C.woodDark;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(sx - 6, sy - 12, 12, 1.5);
    ctx.fillRect(sx - 6, sy - 9, 8, 1.5);
    ctx.globalAlpha = 1;
  }

  function drawWell(ctx, sx, sy) {
    const wx = sx;
    const wy = sy + 2;

    // Base stone ring (ellipse)
    ctx.fillStyle = C.rockGray;
    ctx.beginPath();
    ctx.ellipse(wx, wy + 2, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner ring
    ctx.fillStyle = C.rockLight;
    ctx.beginPath();
    ctx.ellipse(wx, wy, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark water inside
    ctx.fillStyle = C.deepWater;
    ctx.beginPath();
    ctx.ellipse(wx, wy, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Support posts
    ctx.fillStyle = C.wood;
    ctx.fillRect(wx - 10, wy - 18, 3, 18);
    ctx.fillRect(wx + 7, wy - 18, 3, 18);

    // Roof beam
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(wx - 11, wy - 20, 22, 3);

    // Small roof
    ctx.fillStyle = C.cottageRoof;
    ctx.beginPath();
    ctx.moveTo(wx - 13, wy - 19);
    ctx.lineTo(wx, wy - 26);
    ctx.lineTo(wx + 13, wy - 19);
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
    const py = sy - 2; // stand slightly above tile center

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(px, py + 10, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = C.playerBody;
    ctx.fillRect(px - 5, py - 6, 10, 12);

    // Head
    ctx.fillStyle = C.playerSkin;
    ctx.beginPath();
    ctx.arc(px, py - 11, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = C.playerHair;
    ctx.beginPath();
    ctx.arc(px, py - 13, 6, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes (direction-dependent)
    ctx.fillStyle = '#fff';
    const eyeOx = direction === 'left' ? -2 : direction === 'right' ? 2 : 0;
    ctx.beginPath();
    ctx.arc(px - 2 + eyeOx, py - 11, 1.2, 0, Math.PI * 2);
    ctx.arc(px + 2 + eyeOx, py - 11, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = C.playerBody;
    ctx.fillRect(px - 4, py + 6, 3, 5);
    ctx.fillRect(px + 1, py + 6, 3, 5);

    // Shoes
    ctx.fillStyle = C.trunkBrown;
    ctx.fillRect(px - 5, py + 10, 4, 2);
    ctx.fillRect(px + 1, py + 10, 4, 2);
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

      // Inventory panel
      this.inventoryOpen = false;
      this.invPanel = document.getElementById('inventory-panel');
      this.invPanelSticks = document.getElementById('inv-panel-sticks');
      this.invPanelStones = document.getElementById('inv-panel-stones');
      this.invBtn = document.getElementById('inv-btn');

      // Time
      this.lastTime = 0;
      this.running = false;

      this.resize();
      this.setupInput();
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
        }
      }

      if (!p.moving) {
        const dir = this.getInputDirection();
        if (dir) {
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
          this.showDialogue('You found a stick!');
          return;
        }
        if (obj === O.ROCK && !harvested) {
          this.inventory.stones++;
          this.harvestedObjects.add(key);
          this.updateInventory();
          this.showDialogue('You picked up a stone.');
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

  startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    gameContainer.classList.remove('hidden');

    game = new Game(canvas, hudLabel);
    // Small delay to let layout settle
    requestAnimationFrame(() => {
      game.resize();
      game.start();
    });
  });

})();
