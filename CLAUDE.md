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
- **Backend** (`server.js`): Single Express 5 file handling all API routes, file scanning, and static serving.
- **Backend Utilities** (`src/utils/`): TypeScript modules shared between frontend and backend. They are compiled separately via `tsconfig.backend.json` to CommonJS in `dist-backend/utils/`. The main `tsconfig.json` has `noEmit: true` (Vite handles frontend compilation), so backend utilities **must** use the separate config.
- **Server Utilities** (`server-utils/`): Plain CommonJS modules used only by the backend (no compilation step needed).

### Data Storage (File-Based, No Database)

- `models/*-munchie.json` — metadata sidecar for each 3D model (~2-5KB after image migration)
- `models/.munchie_media/` — centralized image store for extracted images (created by "Migrate Images" in Settings → Backup)
- `data/config.json` — app configuration
- `data/collections.json` — user-defined model groups

**`imageVersion` field in munchie.json:**
- `1` (or absent) — images stored as inline base64 data URLs inside `parsedImages` / `userDefined.images`
- `2` — images extracted to `.munchie_media/`; those fields contain filenames like `5d486324c27f_parsed_0.png` instead of base64. The `/api/media/` route serves these files.

### Server Utilities (`server-utils/`)

These are plain CommonJS modules — no compilation step, require directly from `server.js`.

- **`modelIndex.js`** — In-memory `Map<id, lightweightEntry>` built at startup via `buildIndex()`. Eliminates per-request filesystem scanning of all munchie.json files.
  - `getAll()` — returns all lightweight entries (used by `/api/models`)
  - `get(id)` / `getMunchieJsonPath(id)` / `getAllMunchieJsonPaths()` — O(1) lookups
  - `updateFromDisk(id, path)` / `addFromDisk(path)` / `remove(id)` — incremental mutations kept in sync by save/delete/upload endpoints
  - `rebuild()` — full rescan (used after bulk operations)
  - Lightweight entries strip `parsedImages` and `userDefined.images` blobs; for v2 models they resolve `thumbnailUrl` directly to `/api/media/<filename>` to skip the thumbnail endpoint entirely.

- **`imageExtractor.js`** — Extracts inline base64 images from munchie.json to `.munchie_media/`.
  - `extractImages(munchieJsonPath, modelsRoot)` — migrates one file; sets `imageVersion: 2`; idempotent (skips v2 files).
  - `extractNewUserImages(model, modelsRoot)` — called in `/api/save-model` to extract any new user-uploaded images on already-migrated (v2) models.
  - `translateV2ToUrls(model)` — converts v2 filenames to `/api/media/` URLs for client consumption.
  - `getMediaDir(modelsRoot)` — returns path to `.munchie_media/` directory.
  - Filenames use first 12 chars of the model hash + source + index: `{hash12}_{parsed|user}_{n}.{ext}`

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

### API Endpoints of Note

- `GET /api/models` — returns lightweight index entries (no image blobs). Supports server-side filtering/sorting/pagination: `?page=1&pageSize=50&search=...&category=...&tags=...&sort=name_asc&fileType=3mf&isPrinted=true&hasImages=true`.  `pageSize=0` returns all. Response: `{ models, total, page, pageSize, totalPages }`.
- `GET /api/load-model?id=<id>` — returns full munchie.json (including image data) for the detail drawer. For v2 models the image fields contain filenames; `translateV2ToUrls()` is applied so the client receives `/api/media/` URLs.
- `GET /api/model-thumbnail/:id` — on-demand thumbnail. Handles v1 (decodes inline base64) and v2 (reads file from `.munchie_media/`). Not called for v2 models in the grid because the index resolves `/api/media/` URLs directly.
- `GET /api/media/:filename` — serves binary image files from `.munchie_media/` with 24h browser caching.
- `POST /api/migrate-images` — batch-migrates all indexed munchie.json files from v1 to v2 using `imageExtractor.extractImages()`. Returns `{ migrated, skipped, errors }`. Rebuilds the index on completion.
- `POST /api/rebuild-index` — forces a full rescan and index rebuild without a server restart.

### Settings Architecture

- `SettingsPage.tsx` is now a thin shell; all content lives in `src/components/settings/`:
  - `SettingsSidebar.tsx` — tab navigation sidebar (controlled by `App.tsx`)
  - Tab components: `GeneralTab`, `CategoriesTab`, `TagsTab`, `ConfigTab`, `BackupTab`, `IntegrityTab`, `SupportTab`, `ExperimentalTab`
- **BackupTab** includes the "Migrate Images to Disk" action that calls `POST /api/migrate-images`.

### Testing

- Vitest 4 with jsdom environment.
- `vitest.config.ts` configures the test environment and sets `@` as an alias for `src/`.
- `vitest.setup.ts` mocks Radix UI primitives (Checkbox, Select, Slider, DropdownMenu) to test-friendly HTML elements — new component tests using these work without extra setup.
- Component tests live in `tests/components/`.
- Tests use an isolated collections file (`data/collections.test.json`) and per-worker config files (`data/config.vitest-*.json`) to prevent interference during parallel runs.
- Server/API tests are in `tests/server/`.

### Docker

Multi-stage Dockerfile: builder stage (`npm run build` + `npm run build:backend`), then production stage copies `build/`, `dist-backend/`, `server.js`, and `server-utils/`. The backend serves both the API and the frontend static files from a single port (3001).

The `.munchie_media/` directory lives inside the models volume mount, so it is automatically persisted and backed up with the rest of the model data.
