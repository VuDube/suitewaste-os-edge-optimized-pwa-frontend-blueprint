# SuiteWaste OS — Edge-Optimized PWA

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/VuDube/suitewaste-os-edge-optimized-pwa-frontend-blueprint)

## Overview

SuiteWaste OS is a production-ready Progressive Web App (PWA) frontend that emulates a modern, unified mobile operating system tailored for industrial waste management. Deployed via Cloudflare Pages, it provides a premium, enterprise-grade experience with dark-mode default (OLED Black) and Bio-Green accents. The app features local authentication via IndexedDB (using Dexie.js), role-based access control (RBAC), and offline-first architecture with simulated network sync. Gestural interactions powered by Framer Motion and @use-gesture/react enable a native-like "Flow State" navigation, including a glassmorphism Suite Switcher for seamless suite transitions.

This single-file implementation (primarily in `src/pages/HomePage.tsx`) delivers the complete authenticated experience: login screen, homescreen app grid, role-specific dashboards for Operations, Payments, Compliance, Training, and AI Assist, plus settings with manual sync. All data persists locally in IndexedDB, ensuring full offline functionality.

## Key Features

- **Mobile OS Simulation**: Homescreen app grid with neumorphic/glassmorphism icons, responsive layout mimicking iOS/Android.
- **Secure Local Authentication**: IndexedDB-backed login with demo accounts and RBAC (e.g., Field Operator sees only Routes & Tasks; Executives access Finance & AI Assist).
- **Gesture-Driven Navigation**: Two-finger slide invokes the Suite Switcher cover-flow; supports double-tap, flick, and pinch gestures.
- **Role-Specific Dashboards**: Five interactive suites with IndexedDB-persisted data (tasks, payments, compliance logs, training modules, AI chat).
- **Offline-First PWA**: Dexie.js for local storage; service worker for app-shell caching and simulated stale-while-revalidate sync.
- **Visual Excellence**: Dark OLED theme (#0f0f0f), Bio-Green accents (#2E7D32), micro-interactions, and fluid animations for a premium feel.
- **Accessibility & Responsiveness**: Mobile-first design with touch-friendly targets, high contrast, and screen-reader support.
- **Manual Sync & Settings**: Background sync simulation with progress UI; includes logout and theme toggle.

## Tech Stack

- **Frontend**: React 18, React Router 6, TypeScript
- **Styling**: Tailwind CSS v3, shadcn/ui components, Lucide React icons
- **Animations & Gestures**: Framer Motion, @use-gesture/react
- **State & Storage**: Zustand (minimal use), Dexie.js (IndexedDB wrapper), UUID
- **PWA & Offline**: Vite Plugin PWA, Service Worker (app-shell caching)
- **Utilities**: Sonner (toasts), React Hook Form (forms), Date-fns
- **Backend Integration**: Hono (Cloudflare Workers), but client-only for this PWA
- **Build Tools**: Vite, Bun (package manager), Cloudflare Wrangler

## Quick Start

### Prerequisites

- Bun 1.0+ installed (https://bun.sh/)
- Node.js 18+ (for Vite dev server)
- Cloudflare account (for deployment)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd suitewaste-os
   ```

2. Install dependencies using Bun:
   ```
   bun install
   ```

3. (Optional) Generate TypeScript types for Cloudflare Workers:
   ```
   bun run cf-typegen
   ```

The project is now ready for development or deployment.

## Development

### Running Locally

Start the development server:
```
bun run dev
```

- Access the app at `http://localhost:3000` (or the port shown).
- The app simulates IndexedDB initialization on first login; use demo credentials (e.g., `field@suitewaste.os` / `Auditor123`).
- Test gestures: Use trackpad/mouse for two-finger slide (or click the top-left badge); mobile emulation via browser dev tools.

### Scripts

- `bun run dev`: Start dev server with hot reload.
- `bun run build`: Build for production (outputs to `dist/`).
- `bun run lint`: Run ESLint for code quality.
- `bun run preview`: Preview production build locally.

### Environment Setup

No environment variables are required for local development. For production, ensure Cloudflare bindings are configured via Wrangler (see Deployment).

### Testing Gestures & Offline Mode

- **Gestures**: In the Suite Switcher, test double-tap to open suites, flick for navigation, and pinch to zoom previews.
- **Offline**: Disable network in browser dev tools; app loads from cache and uses IndexedDB.
- **Sync Simulation**: From Settings, trigger "Manual Sync" to see progress animation (emulates network latency).

## Usage

### Demo Accounts (RBAC Testing)

Upon first launch, IndexedDB auto-populates these accounts (password: `Auditor123`):

- `field@suitewaste.os` (Field Operator: Routes & Tasks, e-Waste Log, Training)
- `manager@suitewaste.os` (Manager: All suites)
- `auditor@suitewaste.os` (Auditor: Compliance Reports, Training)
- `executive@suitewaste.os` (Executive: Finance Center, Compliance, AI Assist)
- `trainer@suitewaste.os` (Trainer: Training Hub, AI Assist)

Login routes to role-gated homescreen. Tap icons to enter suites; use gestures for switching.

### API Simulation

While primarily client-side, the template includes Cloudflare Workers endpoints (e.g., `/api/users`). Extend `worker/user-routes.ts` for real backend integration. Local fetches simulate network with IndexedDB fallbacks.

### Customization

- **Add Suites**: Extend dashboards in `HomePage.tsx` with new IndexedDB tables via Dexie.
- **Theme**: Toggle dark/light in Settings (defaults to dark).
- **PWA Enhancements**: Edit `public/manifest.json` (if using vite-plugin-pwa) for custom icons/splash.

## Deployment

Deploy to Cloudflare Pages for global edge delivery:

1. Build the project:
   ```
   bun run build
   ```

2. Install Wrangler CLI if needed:
   ```
   bun add -g wrangler
   ```

3. Authenticate with Cloudflare:
   ```
   wrangler login
   ```

4. Deploy the Workers backend (if using API routes):
   ```
   wrangler deploy
   ```

5. For Pages (static frontend):
   - Push to GitHub and connect via Cloudflare Dashboard > Pages > Connect to Git.
   - Build command: `bun run build`
   - Output directory: `dist`
   - Framework: Vite

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/VuDube/suitewaste-os-edge-optimized-pwa-frontend-blueprint)

The PWA will be accessible at `<project-name>.pages.dev`. Enable service worker in production for offline support.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit changes: `git commit -m 'Add amazing feature'`.
4. Push: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

Follow the code style (ESLint + Prettier) and ensure tests pass. Focus on mobile responsiveness and gesture reliability.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.