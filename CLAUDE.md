# CLAUDE.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

This is **pauabella.dev**, a personal portfolio website for Pau Abella built with React. The site showcases professional work, side projects, and personal interests through a minimalist, design-focused interface.

**Live site:** https://pauabella.dev

## Tech Stack

- **Framework:** React 18 (Create React App)
- **Language:** TypeScript
- **Routing:** react-router-dom v7
- **Styling:** Plain CSS (no preprocessors or CSS-in-JS)
- **Deployment:** Netlify (SPA redirect configured in `public/_redirects`)

## Project Structure

```
pauabella.dev/
├── public/
│   ├── _redirects          # Netlify SPA routing config
│   ├── index.html          # HTML template
│   ├── favicon.*           # Site icons
│   └── experiments/        # Simple standalone experiments (HTML/CSS/JS)
│       └── [experiment]/
│           ├── index.html
│           ├── style.css
│           └── script.js
├── experiments/            # Complex experiments with own build (future)
│   └── [experiment]/
│       ├── package.json
│       └── src/
├── src/
│   ├── App.tsx             # Main app with route definitions
│   ├── App.css             # Primary stylesheet (all page styles)
│   ├── experiments.ts      # Experiments registry/config
│   ├── types.ts            # TypeScript type definitions
│   ├── index.tsx           # React entry point with BrowserRouter
│   ├── index.css           # Base/reset styles
│   ├── assets/
│   │   ├── css/fonts.css   # Custom font definitions
│   │   ├── fonts/          # Custom font files (.otf)
│   │   ├── images/         # Image assets (webp format)
│   │   └── svg/            # SVG assets
│   ├── styles/             # Component CSS files
│   │   ├── Vibecoding.css
│   │   ├── ExperimentModal.css
│   │   └── ExperimentFullscreen.css
│   ├── components/
│   │   ├── TransitionWrapper.tsx
│   │   └── ExperimentModal.tsx
│   └── pages/
│       ├── Home.tsx
│       ├── Norda.tsx
│       ├── Bikepack.tsx
│       ├── Blogposts.tsx
│       ├── Vibecoding.tsx
│       └── ExperimentFullscreen.tsx
└── package.json
```

## Key Conventions

### Component Structure

Each page component follows a consistent pattern:

1. Imports fonts.css and App.css
2. Uses `useState` for dynamic color palette
3. Includes an interactive `PauAvatar` SVG that randomizes colors on click
4. Wraps content in a div with className `App` and inline color styles

### Styling Patterns

- **CSS files** go in `src/styles/` - keep pages/ and components/ folders for .tsx only
- **Page backgrounds:** Set via CSS classes on `.page-wrapper` (e.g., `.norda .page-background`)
- **Color palettes:** Each page has a default accent color defined in state:
  - Home: `#0f4c81` (blue)
  - Norda: `#7958CE` (purple)
  - Bikepack: `#0f4c81` (blue)
  - Blogposts: `#0f4c81` (blue)
  - Vibecoding: `#0f4c81` (blue)
- **Typography:**
  - Headings: 'TASA Orbiter' font
  - Body text: 'Valverde' font
  - Contact/links: 'DM Sans' (Google Fonts)
- **Responsive breakpoint:** 600px for mobile styles
- **Transitions:** Hover effects use `skewX(-15deg)` transform, fade-in animations for page loads

### Routing

Routes are defined in `App.tsx`:
- `/` → Home
- `/norda` → Norda project page
- `/bikepack` → Bikepacking gallery
- `/blogposts` → Blog posts page
- `/vibecoding` → Vibecoding experiments listing
- `/experiment/:experimentId` → Fullscreen experiment view

The URL pathname (without `/`) is added as a class to `.page-wrapper` for page-specific styling.

### Image Assets

- Use **webp format** for optimized images
- Images stored in `src/assets/images/`
- Always include descriptive `alt` text (required for build)

## Development Commands

```bash
npm start       # Start development server (http://localhost:3000)
npm run build   # Create production build
npm test        # Run tests
```

## Adding New Pages

1. Create a new component in `src/pages/` following the existing pattern
2. Add a route in `src/App.tsx`
3. Add page-specific background color in `App.css` (e.g., `.newpage .page-background`)
4. Add selection colors if needed (e.g., `.newpage .App ::selection`)

## Vibecoding Experiments

The `/vibecoding` section hosts containerized experiments (mini-apps, games, demos) that are isolated from the main portfolio code.

### Adding a New Experiment

1. **Create the experiment folder** in `public/experiments/[experiment-name]/`
2. **Add your files:**
   ```
   public/experiments/my-game/
   ├── index.html    # Entry point (required)
   ├── style.css     # Styles
   └── script.js     # Logic
   ```
3. **Register in `src/experiments.ts`:**
   ```typescript
   {
     id: 'my-game',
     title: 'My Game',
     description: 'A short description',
     path: '/experiments/my-game/index.html',
     displayMode: 'modal',  // or 'fullscreen'
     thumbnail: null,       // optional: '/experiments/my-game/thumb.webp'
   }
   ```

### Display Modes

- **`modal`**: Opens in an overlay on the Vibecoding page (good for small demos)
- **`fullscreen`**: Navigates to `/experiment/[id]` with a back button (good for games)

### Extracting Experiments

Each experiment in `public/experiments/` is self-contained. To deploy independently:
1. Copy the experiment folder
2. It already has `index.html` as entry point - ready to deploy anywhere

### Complex Experiments

For experiments needing their own build process (React, bundlers, etc.):
1. Create in `experiments/[name]/` with its own `package.json`
2. Build output goes to `public/experiments/[name]/`
3. Register the same way in `src/experiments.ts`

---

### Experiment Design Guidelines

Experiments are standalone HTML/CSS/JS files, so they can't import the site's custom fonts or React components directly. But they must still **look and feel like they belong on this site**. The portfolio has a deliberate visual identity — warm, minimal, typographic, unhurried. Experiments should feel like natural extensions of that identity, not generic game templates slapped into an iframe.

The single most important rule: **an experiment should feel like something Pau made, not something anyone could have scaffolded from a tutorial.**

---

#### Color Palette

Experiments must draw from the same palette the rest of the site uses. The site lives in a world of warm creams and deep navy. Experiments should too.

**Good:**
```css
body {
  background: #fff0db;          /* site's primary background */
  color: #0f4c81;               /* site's primary accent — deep navy */
}

/* For an experiment that needs a darker mood (e.g. a night-themed game),
   pull toward deep navy rather than generic dark gradients: */
body {
  background: #0f4c81;
  color: #fff0db;
}

/* Norda-style lavender is also available for variety: */
body {
  background: #EEE7FF;
  color: #7958CE;
}
```

**Bad:**
```css
/* Generic dark game template — looks like every other vibe-coded project */
body {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
}

/* Neon coral that doesn't exist anywhere in the portfolio */
button {
  background: #e94560;
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.4);
}
```

Why: The dark gradient + neon coral combo is the default output of "make me a game" prompts. It has no relationship to this site's identity. Using the site's cream and navy grounds the experiment visually — even a fast-paced game can feel considered.

---

#### Typography

The site's custom fonts (`TASA Orbiter`, `Valverde`) live in `src/assets/fonts/` and aren't accessible to standalone experiments. Use **DM Sans** from Google Fonts — it's already part of the site's type system (used for all links and UI labels) and is available via CDN.

**Good:**
```html
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
```
```css
body {
  font-family: 'DM Sans', sans-serif;
}

/* Headings: use heavy weight of DM Sans to echo the boldness of TASA Orbiter */
h1 {
  font-family: 'DM Sans', sans-serif;
  font-weight: 800;
  letter-spacing: -0.02em;  /* tight tracking reads as more editorial */
}

/* Game labels, scores, UI: medium weight, clean */
.score {
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
}
```

**Bad:**
```css
/* Generic system stack — no visual personality at all */
body {
  font-family: system-ui, -apple-system, sans-serif;
}

/* Oversized headings that feel shouty rather than confident */
h1 {
  font-size: 3rem;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
```

Why: `system-ui` is invisible — it communicates nothing. DM Sans ties the experiment back to the site's type system. The tight letter-spacing and heavy weight of DM Sans at 800 gives you boldness without needing a decorative display font.

---

#### Buttons & Interactive Elements

The site's interactive elements are understated. Links skew slightly on hover. Buttons in the portfolio chrome (modal close, back button) are borderless or minimal. Experiment buttons should follow the same restrained energy.

**Good:**
```css
button {
  background: #0f4c81;
  color: #fff0db;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.75rem;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

button:hover {
  transform: scale(1.04);
  opacity: 0.85;
}

button:active {
  transform: scale(0.97);
}
```

**Bad:**
```css
/* Pill shape + glow shadow = generic game UI, not this site */
button {
  background: #e94560;
  border-radius: 50px;
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

button:hover {
  box-shadow: 0 6px 30px rgba(233, 69, 96, 0.6);  /* glows louder on hover */
}
```

Why: Pill buttons with color-matched glows are the most common pattern in vibe-coded games. They draw too much attention to themselves. The site's buttons are quiet — they serve the action without performing.

---

#### Game UI Elements (Scores, Timers, Targets)

Game-specific chrome should be typographic and minimal. Let the numbers and labels do the work. Don't frame them in containers that look like HUDs.

**Good:**
```css
/* Score: just text, positioned cleanly */
.score-board {
  display: flex;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  color: #0f4c81;
  /* No background. No border. Just type on the page background. */
}

/* Timer bar: thin, understated, uses the accent color */
.timer-bar-bg {
  height: 3px;
  background: rgba(15, 76, 129, 0.15);  /* whisper of the accent */
  border-radius: 2px;
}

.timer-bar {
  height: 100%;
  background: #0f4c81;
  border-radius: 2px;
  /* No "urgent" red state. Trust the player to read a shrinking bar. */
}

/* Clickable targets: solid, clean shapes */
.target {
  background: #0f4c81;
  border-radius: 50%;
  box-shadow: none;  /* no glow */
}
```

**Bad:**
```css
/* Score board with a dark semi-transparent background — looks like an overlay HUD */
.score-board {
  background: rgba(0, 0, 0, 0.3);
  font-size: 1.5rem;  /* oversized for what's just a number */
}

/* Timer bar that turns red to panic the player — adds visual noise */
.timer-bar.urgent {
  background: #ff3333;
}

/* Target with a radial gradient and neon glow */
.target {
  background: radial-gradient(circle, #e94560 0%, #c23a51 100%);
  box-shadow: 0 0 20px rgba(233, 69, 96, 0.6);
}
```

Why: Game UIs on this site should feel like they were designed, not assembled from a template. A score is just a number. A timer bar is just a thin line shrinking. A target is just a shape. Trust the player's ability to read these without shouting.

---

#### Animations & Feedback

The site's animation language is gentle. Page transitions fade in over 0.8s. Link hovers are a 100ms skew. Nothing on the main site pulses, glows, or explodes. Experiments can be snappier (they're games — feedback needs to be immediate), but the *style* of that feedback should stay restrained.

**Good:**
```css
/* Click feedback: brief scale pulse, nothing more */
.target.hit {
  animation: hit 0.15s ease-out forwards;
}

@keyframes hit {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

/* Wrong answer: a short shake — communicates error without color drama */
.wrong {
  animation: shake 0.3s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-8px); }
  75%      { transform: translateX(8px); }
}

/* Word/element entrance: subtle scale-up, fast */
@keyframes popIn {
  0%   { transform: scale(0.85); opacity: 0; }
  100% { transform: scale(1);    opacity: 1; }
}
```

**Bad:**
```css
/* Target scales to 1.5x and disappears — too dramatic, draws too much eye */
@keyframes hit {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }  /* 1.5x is loud */
}

/* Correct answer brightens to 1.4x filter — flashy, not considered */
@keyframes flashCorrect {
  40% { filter: brightness(1.4); }  /* sudden brightness spike */
}

/* Wrong answer shakes AND the game ends with a color flash — double signal */
.wrong {
  animation: flashWrong 0.4s ease-out;  /* 0.4s is slow for a "wrong" state */
}
```

Why: The site's interactions have a quiet confidence. A 1.3x scale-out on a target hit is enough — you saw it disappear, you know you clicked it. 1.5x with a glow reads as a VFX explosion. Keep feedback immediate but visually calm.

---

#### Layout & Spacing

The site breathes. Pages have generous padding, content is never crammed edge-to-edge, and whitespace carries meaning. Experiments — even games — should maintain that sense of air.

**Good:**
```css
body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff0db;
  color: #0f4c81;
  padding: 1.5rem;  /* breathing room from viewport edges */
}

.game-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* Content is centered in open space, not pinned to edges */
}

/* Start/end screens: centered, typographic, short */
.screen {
  text-align: center;
  max-width: 360px;
  margin: 0 auto;
}

.screen h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
}

.screen p {
  font-size: 1rem;
  line-height: 1.5;
  opacity: 0.7;  /* secondary info is visually quieter */
  margin-bottom: 1.5rem;
}
```

**Bad:**
```css
/* Full-viewport flex layout with no padding — content touches the edges */
.game-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;  /* traps everything, no breathing room */
}

/* Oversized headings that dominate instead of leading */
.start-screen h1 {
  font-size: 3rem;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);  /* shadow adds visual weight */
}
```

---

#### Responsive Behavior

The site breaks at **600px**. All experiments must follow this same breakpoint and remain fully playable on mobile.

```css
@media (max-width: 600px) {
  /* Scale down font sizes proportionally */
  .screen h1  { font-size: 2rem; }
  .score-board { font-size: 0.9rem; }

  /* Reduce padding but keep some breathing room */
  body { padding: 1rem; }

  /* Interactive targets: ensure tap targets are at least 44px */
  .target { min-width: 44px; min-height: 44px; }
  .color-btn { min-height: 44px; }
}
```

---

#### Quick-Reference Checklist

Before shipping an experiment, verify:

- [ ] Background uses `#fff0db`, `#EEE7FF`, or `#0f4c81` (not a dark gradient)
- [ ] Text color uses `#0f4c81` or `#fff0db` (not generic `white`)
- [ ] Font is DM Sans loaded from Google Fonts (not `system-ui`)
- [ ] Buttons have `border-radius: 6px` and no `box-shadow` glow
- [ ] No element uses `#e94560` or any color not in the site palette
- [ ] Animations stay under 1.3x scale, under 200ms for feedback
- [ ] Score/timer UI has no background container or text-shadow
- [ ] Responsive at 600px, tap targets ≥ 44px on mobile
- [ ] Content has padding from viewport edges (minimum `1rem`)

## Important Notes

- No backend/API integrations - this is a static site
- The `_redirects` file in `public/` handles Netlify SPA routing (all paths → index.html)
- Custom fonts are loaded locally via `@font-face` in `fonts.css`
- The avatar click interaction provides a fun color randomization feature
- Keep the design minimalist and focused - avoid adding unnecessary complexity

---

## Rules for AI Assistants

When working on this codebase, follow these guidelines:

### Git Workflow

- **Always open a PR** after completing work - never leave changes only on a branch
- **Commit often** with clear, descriptive messages
- **Keep PRs focused** - one feature or fix per PR when possible
- Target PRs to the appropriate base branch (usually `main` or `claudecode`)

### Code Organization

- **CSS files** belong in `src/styles/`, not alongside components
- **Only .tsx files** in `pages/` and `components/` folders
- **Update CLAUDE.md** when adding new pages, routes, or significant features

### Before Finishing

1. Ensure all changes are committed
2. Push to the remote branch
3. Open a PR with a clear summary
4. Update CLAUDE.md if the project structure changed
