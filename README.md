# 3D Model Muncher

A responsive 3D printing model management application built with React, TypeScript, and Three.js. Organize, search, and preview your 3D printing models with an intuitive interface featuring dark/light theme support.

**Tech Stack:** React 18, TypeScript, Vite, Three.js, Express.js, Docker

## Architecture

**Client-Server Architecture:**
- **Frontend**: React app with Three.js 3D viewer
- **Backend**: Express.js API for file operations and 3MF parsing
- **File Storage**: Automatic JSON metadata generation from 3MF parsing with full portability

**Single Source of Truth:**
- **All Modes**: Files served directly from source `models/` directory
- **Docker/Unraid Friendly**: Easy volume mapping to shared storage

## Features

- **3D Model Viewer**: Built-in Three.js viewer for .3mf files with automatic thumbnails
- **Model Management**: Organize, categorize, and track print status
- **Advanced Search & Filtering**: Search by name, tags, category, print status, and license
- **Automatic Scanning**: Auto-generate metadata JSON files from 3MF files
- **Duplicate Detection**: MD5 hash-based duplicate identification
- **Bulk Editing**: Edit multiple models simultaneously
- **Backup & Restore**: Protect your metadata with compressed backups and flexible restore options
- **Configuration Management**: Export/import app settings
- **Responsive Design**: Works on desktop and mobile with dark/light themes
- **Docker Support**: Easy deployment with Docker Compose


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

## Configuration

The app includes configuration management through the Settings page:
- **Export/Import**: Save and restore settings as JSON files
- **Categories**: Customize and reorder model categories
- **Themes**: Light, dark, or system theme
- **View Options**: Grid/list views with adjustable density
- **Auto-save**: Model data stored in individual `-munchie.json` files alongside each 3MF model

## Usage

1. **Add Models**: Place `.3mf` files in the `models/` directory
2. **Scan Models**: Use the scan feature to generate JSON metadata files
3. **Browse & Search**: Filter by category, tags, print status, or license
4. **3D Preview**: Click models to view in the built-in Three.js viewer
5. **Manage**: Edit details, track print status, bulk edit multiple models

## Docker Deployment

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Manual Docker build
docker build -t 3d-model-muncher .
docker run -p 3001:3001 \
  -v /path/to/your/models:/app/models \
  -v /path/to/your/data:/app/data \
  3d-model-muncher

# For Unraid: Map your shares directly
# Container Path: /app/models -> Host Path: /mnt/user/3d-models
# Container Path: /app/data -> Host Path: /mnt/user/appdata/3d-model-muncher
```

## API Endpoints

**Main Endpoints:**
- `GET /api/models` - Get all model metadata
- `POST /api/save-model` - Save model changes
- `POST /api/scan-models` - Scan models directory
- `GET /api/validate-3mf` - Validate 3MF file integrity
- `POST /api/delete-models` - Delete models and files
- `GET /models/*` - Static model files (3MF, images, etc.)

## File Structure

Each 3MF file gets a corresponding `-munchie.json` metadata file containing extracted information like thumbnails, print settings, and user-defined tags. The system uses MD5 hashing for duplicate detection and preserves user data during rescans.

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
