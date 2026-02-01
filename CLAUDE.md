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
