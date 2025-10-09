# Copilot Instructions for 3D Model Muncher

## Project Overview
- **Purpose:** Organize, search, and preview 3D printing models (.3mf, .stl) with metadata management and a Three.js viewer.
- **Architecture:**
  - **Frontend:** Vite + React (see `src/`)
  - **Backend:** Node.js server (`server.js`) with TypeScript utilities (compiled to `dist-backend/`)
  - **Model Data:** All models and metadata live in `models/` (with `-munchie.json` files)
  - **Config:** App settings in `data/config.json`

## Key Workflows
- **Build Backend Utilities:**
  - Run `npm run build:backend` (or use VS Code task: "tsc: build backend utils")
  - Output: `dist-backend/utils/`
- **Start Backend Server:**
  - Run `npm run server` (port 3001)
- **Start Frontend (Dev):**
  - Run `npm run dev` (port 3000)
- **Build Frontend:**
  - Run `npm run build` (output to `build/`)
- **Preview Production Build:**
  - Run `npm run preview` (port 4173)
- **Docker:**
  - Use `docker-compose.yml` for local/prod/Unraid deployment

## Patterns & Conventions
- **Model Metadata:**
  - Each model file (`.3mf`, `.stl`) gets a `-munchie.json` file with extracted info, thumbnails, tags, and print settings
  - Duplicate detection via MD5 hash
  - Rescans preserve user data

- **Print Settings Ownership:**
  - 3MF (`.3mf`) files: printSettings come from the parsed 3MF. Edits to printSettings in the UI are ignored on save, and regenerate will refresh these values from the 3MF.
  - STL (`.stl`) files: printSettings are user-managed in the `-stl-munchie.json` and must persist across saves and regenerate.
  - Regenerate behavior: for STL, existing non-empty printSettings fields (layerHeight, infill, nozzle, printer) are preserved over parsed defaults; for 3MF, values always refresh from the file.
  - UI behavior:
    - ModelDetailsDrawer: printSettings inputs are shown for STL, hidden for 3MF; the current printer value is displayed as a label.
    - BulkEditDrawer: printSettings apply only to STL selections. Blank inputs mean “no change” and won’t be sent to avoid unintended clears.
- **API Endpoints:**
  - See `server.js` for `/api/models`, `/api/save-model`, `/api/scan-models`, `/api/validate-3mf`, `/api/delete-models`
- **Frontend:**
  - Main entry: `src/main.tsx`, App: `src/App.tsx`
  - Components in `src/components/`
  - Styles in `src/index.css` and `src/components/styles/`
- **Backend Utilities:**
  - TypeScript source: `src/utils/`
  - Compiled JS: `dist-backend/utils/`
- **Config Management:**
  - App config: `data/config.json`
  - Export/import via UI and API

## Integration Points
- **Three.js:** Used for 3D model viewing (see frontend components)
- **Docker:** For deployment and environment management
- **Unraid:** Supported via templates and guides

## Troubleshooting & Tips
- Always build backend utilities before frontend (`npm run build:backend`)
- Backend server must be running for frontend and preview
- Use `/api/validate-3mf` to check model file integrity
- For Docker, ensure port 3001 is available and volumes are mounted

## References
- See `README.md`, `DOCKER-DEPLOYMENT.md`, `UNRAID.md`, and `BACKUP-RESTORE.md` for more details
- Example model metadata: `models/*-munchie.json`
- API logic: `server.js`, backend utils: `src/utils/`

---
**Feedback:** Please review and suggest additions or clarifications for any unclear or missing sections.
