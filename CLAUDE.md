# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D Model Muncher is a full-stack web app for organizing, searching, and previewing 3D printing models (`.3mf`, `.stl`) with metadata management, G-code analysis, and optional AI-powered suggestions via Google Gemini.

## Development Commands

**First-time / after changing backend utilities:**
```bash
npm run build:backend   # Compile src/utils/*.ts → dist-backend/utils/ (required before running server)
```

**Running locally (two terminals):**
```bash
npm run server   # Terminal 1: Express backend on port 3001
npm run dev      # Terminal 2: Vite dev server on port 3000 (proxies /api and /models to :3001)
```

**Other commands:**
```bash
npm run build           # Vite production build → build/
npm run preview         # Serve production build on port 4173 (still needs backend on :3001)
npm run test            # Run full Vitest suite
npm run test:watch      # Vitest in watch mode
```

**Running a single test file:**
```bash
npx vitest run tests/gcodeParser.test.ts
```

## Architecture

### Frontend/Backend Split

- **Frontend** (`src/`): React 18 + Vite 6 + Tailwind CSS 4 + Radix UI. Entry: `src/main.tsx` → `src/App.tsx`.
- **Backend** (`server.js`): Single ~3200-line Express 5 file handling all API routes, file scanning, and static serving.
- **Backend Utilities** (`src/utils/`): TypeScript modules shared between frontend and backend. They are compiled separately via `tsconfig.backend.json` to CommonJS in `dist-backend/utils/`. The main `tsconfig.json` has `noEmit: true` (Vite handles frontend compilation), so backend utilities **must** use the separate config.

### Data Storage (File-Based, No Database)

- `models/*-munchie.json` — metadata for each 3D model
- `data/config.json` — app configuration
- `data/collections.json` — user-defined model groups

### Key Backend Utilities (edit in `src/utils/`, then run `npm run build:backend`)

- **`gcodeParser.ts`** — Parses `.gcode` and `.gcode.3mf` (BambuLab archive format). Extracts print time, filament usage, and filament colors. Case-insensitive comment parsing. Distinguishes `filament_colour` (hex like `#FFFFFF`) from `filament_colour_type` (numeric codes).
- **`threeMFToJson.ts`** — Extracts metadata, thumbnails (as base64), and MD5 hash from `.3mf`/`.stl` files.
- **`configManager.ts`** — Loads/saves `data/config.json`; manages per-worker test config isolation.

### Model Metadata Lifecycle

Each `.3mf` or `.stl` file gets a `-munchie.json` sidecar. On metadata regeneration:
- **Preserved (user data):** `tags`, `isPrinted`, `printTime`, `filamentUsed`, `category`, `notes`, `license`, `hidden`, `source`, `price`, `related_files`, `gcodeData`, `userDefined`
- **Refreshed from file:** thumbnails, name, designer, dimensions, print settings (for `.3mf` only)

### Print Settings Ownership

- **`.3mf` files:** `printSettings` come from the parsed 3MF file. UI inputs are hidden; regenerate always overwrites them from the file.
- **`.stl` files:** `printSettings` are user-managed and persist across saves and regenerate. UI inputs are shown and editable.
- **BulkEditDrawer:** Print settings only apply to STL selections; blank inputs mean "no change."

### G-code Integration

- Storage modes: `parse-only` (default, no file saved) or `save-and-link` (saves file and adds to `related_files`).
- `.gcode.3mf` archives are saved as binary (not converted to text) to preserve BambuLab metadata.
- G-code data is stored in the `gcodeData` field in `munchie.json`.
- Unit tests: `tests/gcodeParser.test.ts`, fixtures: `tests/fixtures/gcode/`.

### Settings Architecture

- `SettingsPage.tsx` is now a thin shell; all content lives in `src/components/settings/`:
  - `SettingsSidebar.tsx` — tab navigation sidebar (controlled by `App.tsx`)
  - Tab components: `GeneralTab`, `CategoriesTab`, `TagsTab`, `ConfigTab`, `BackupTab`, `IntegrityTab`, `SupportTab`

### Testing

- Vitest 4 with jsdom environment.
- `vitest.config.ts` configures the test environment and sets `@` as an alias for `src/`.
- `vitest.setup.ts` mocks Radix UI primitives (Checkbox, Select, Slider, DropdownMenu) to test-friendly HTML elements — new component tests using these work without extra setup.
- Component tests live in `tests/components/`.
- Tests use an isolated collections file (`data/collections.test.json`) and per-worker config files (`data/config.vitest-*.json`) to prevent interference during parallel runs.
- Server/API tests are in `tests/server/`.

### Docker

Multi-stage Dockerfile: builder stage (`npm run build` + `npm run build:backend`), then production stage copies `build/`, `dist-backend/`, `server.js`, and `server-utils/`. The backend serves both the API and the frontend static files from a single port (3001).
