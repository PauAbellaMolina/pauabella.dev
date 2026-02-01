# CLAUDE.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

This is **pauabella.dev**, a personal portfolio website for Pau Abella built with React. The site showcases professional work, side projects, and personal interests through a minimalist, design-focused interface.

**Live site:** https://pauabella.dev

## Tech Stack

- **Framework:** React 18 (Create React App)
- **Routing:** react-router-dom v7
- **Styling:** Plain CSS (no preprocessors or CSS-in-JS)
- **Deployment:** Netlify (SPA redirect configured in `public/_redirects`)
- **Language:** JavaScript (no TypeScript)

## Project Structure

```
pauabella.dev/
├── public/                  # Static assets served directly
│   ├── _redirects          # Netlify SPA routing config
│   ├── index.html          # HTML template
│   └── favicon.*           # Site icons
├── src/
│   ├── App.js              # Main app with route definitions
│   ├── App.css             # Primary stylesheet (all page styles)
│   ├── index.js            # React entry point with BrowserRouter
│   ├── index.css           # Base/reset styles
│   ├── assets/
│   │   ├── css/fonts.css   # Custom font definitions
│   │   ├── fonts/          # Custom font files (.otf)
│   │   ├── images/         # Image assets (webp format)
│   │   └── svg/            # SVG assets
│   ├── components/
│   │   └── TransitionWrapper.js  # Page transition wrapper
│   └── pages/
│       ├── Home.js         # Main landing page
│       ├── Norda.js        # Norda Tickets project page
│       ├── Bikepack.js     # Bikepacking photo gallery
│       ├── Blogposts.js    # Blog posts page
│       └── Vibecoding.js   # Vibecoding experiments page
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

Routes are defined in `App.js`:
- `/` → Home
- `/norda` → Norda project page
- `/bikepack` → Bikepacking gallery
- `/blogposts` → Blog posts page
- `/vibecoding` → Vibecoding experiments page

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
2. Add a route in `src/App.js`
3. Add page-specific background color in `App.css` (e.g., `.newpage .page-background`)
4. Add selection colors if needed (e.g., `.newpage .App ::selection`)

## Important Notes

- No backend/API integrations - this is a static site
- The `_redirects` file in `public/` handles Netlify SPA routing (all paths → index.html)
- Custom fonts are loaded locally via `@font-face` in `fonts.css`
- The avatar click interaction provides a fun color randomization feature
- Keep the design minimalist and focused - avoid adding unnecessary complexity
