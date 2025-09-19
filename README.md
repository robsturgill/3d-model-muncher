# 3D Model Muncher

Organize, search, and preview your 3D printing models with an intuitive interface.

![Demo Animation](public/images/demo.gif)

## Features

- **3D Model Viewer**: Built-in Three.js viewer for .3mf & .stl files with automatic thumbnails
- **Model Management**: Organize, categorize, and track print status
- **Advanced Search & Filtering**: Search by name, tags, category, print status, and license
- **Automatic Scanning**: Auto-generate metadata JSON files from 3MF files
- **Duplicate Detection**: MD5 hash-based duplicate identification
- **Bulk Editing**: Edit multiple models simultaneously
- **Backup & Restore**: Protect your metadata with compressed backups and flexible restore options
- **Configuration Management**: Export/import app settings
- **Docker Support**: Easy deployment with Docker Compose

## Usage

1. **Add Models**: Place `.3mf` or `.stl` files in the `models/` directory
2. **Scan Models**: Use the scan feature to generate JSON metadata files
3. **Browse & Search**: Filter by category, tags, print status, or license
4. **3D Preview**: Click models to view in the built-in Three.js viewer
5. **Manage**: Edit details, track print status, bulk edit multiple models

## Quick Start

**Development:**
```bash
npm install
npm run build:backend
npm run server        # Terminal 1: Backend server
npm run dev           # Terminal 2: Frontend dev server
# Access: http://localhost:3000
```

**Preview (Test Production Build):**
```bash
npm run build         # Build frontend
npm run server        # Terminal 1: Same backend server
npm run preview       # Terminal 2: Frontend preview server
# Access: http://localhost:4173
```

## Available Scripts

- `npm run dev` - Start development server with hot reload (port 3000)
- `npm run build` - Build frontend for production
- `npm run build:backend` - Compile TypeScript backend utilities
- `npm run preview` - Preview production build (port 4173)
- `npm run server` - Backend API server (port 3001)


## Docker Deployment

**Quick Start:**
```bash
# Local development
docker-compose up -d --build

# Production with published image
cp .env.production .env
docker-compose up -d

# Unraid deployment
cp .env.unraid .env
docker-compose up -d
```

**Detailed Instructions:**
- **[Docker Deployment Guide](DOCKER-DEPLOYMENT.md)** - Complete Docker setup and configuration
- **[Unraid Installation](UNRAID.md)** - Unraid-specific installation and setup
- **[Backup & Restore](BACKUP-RESTORE.md)** - Backup and restore guide

**Environment Templates:**
- `.env.example` - Template with all configuration options
- `.env.production` - Production deployment using DockerHub image
- `.env.unraid` - Unraid-optimized settings

## API Endpoints

**Main Endpoints:**
- `GET /api/models` - Get all model metadata
- `POST /api/save-model` - Save model changes
- `POST /api/scan-models` - Scan models directory
- `GET /api/validate-3mf` - Validate 3MF & STL file integrity
- `POST /api/delete-models` - Delete models and files
- `GET /models/*` - Static model files (3MF, STL, images, etc.)

## File Structure

Each 3MF/STL file gets a corresponding `-munchie.json` metadata file containing extracted information like thumbnails, print settings, and user-defined tags. The system uses MD5 hashing for duplicate detection and preserves user data during rescans.

## User-defined metadata (preserved on regeneration)

When `-munchie.json` file metadata is regenerated (via "Regenerate" action in Bulk Edit drawer), the tool preserves user-defined metadata fields so your manual edits are not lost. The backend reads the existing JSON and merges certain user-managed fields into the newly generated metadata before writing the file back out.

The following fields are preserved and will NOT be overwritten by a regeneration:

- `tags` — array of user tags/categories applied to the model
- `isPrinted` — boolean indicating if the model has been printed
- `printTime` — user-entered or measured print time string
- `filamentUsed` — filament usage string (e.g., grams)
- `category` — user-assigned category name
- `notes` — freeform notes and comments
- `license` — user-specified license information
- `hidden` — whether the model is hidden from normal listings
- `source` — optional source/origin information entered by the user
- `price` — user-defined price or cost value
- `related_files` — array of file paths associated with the model for download

The following fields are computed or extracted from the model file and will be replaced when the munchie JSON is recreated. 

- `hash` — MD5 checksum of the model file (used for duplicate detection)
- `thumbnail` — embedded thumbnail image extracted from the 3MF (stored as a base64 data URL)
- `images` — additional embedded images or auxiliary pictures packaged in the 3MF
- `modelUrl` — the path/URL to the model file under the `models/` directory
- `fileSize` — human-readable file size derived from the model file
- `name` — title parsed from the 3MF metadata (or derived from the filename for STLs)
- `description` — description parsed from 3MF metadata
- `printSettings` — parsed printing profile values (for example: `layerHeight`, `infill`, `nozzle`)
- `designer` — designer/author name parsed from 3MF metadata

If you rely on any other custom or non-standard fields, consider exporting a backup before regenerating munchie files; the regeneration process only guarantees preservation of the explicitly listed user-managed fields.

## Troubleshooting

**Common Issues:**
1. **Models not loading**: Check backend server is running (`npm run server`) and files are in `models/` directory
2. **Preview mode errors**: Ensure backend server is running before starting preview mode
3. **3D viewer issues**: Use `/api/validate-3mf?file=path/to/model.3mf` to check file integrity
4. **Build issues**: Run `npm run build:backend` before building frontend
5. **Docker issues**: Check port 3001 availability and volume mounts

**3MF File Requirements:**
- `3D/3dmodel.model` - Main 3D model data
- `[Content_Types].xml` - Content type definitions

## Recent experimental updates

- Added an "Experimental" tab with an integrated generative suggestion workflow supporting Google Gemini
- AI suggestions for categories, tags, and a description can be applied and saved to the munchie JSON.

These features are experimental — back up your metadata before using them in production.
