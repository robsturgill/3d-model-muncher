# 3D Model Muncher

A responsive 3D printing model management application built with React, TypeScript, and Three.js. Organize, search, and preview your 3D printing models with an intuitive interface featuring dark/light theme support and a premium indigo design system.

## Technology Stack

**Frontend:**
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type safety and improved developer experience
- **Vite** - Fast build tool and development server
- **Three.js** - 3D model rendering and visualization
- **@react-three/fiber & @react-three/drei** - React bindings for Three.js
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern, accessible UI components
- **Radix UI** - Unstyled, accessible UI primitives
- **Lucide React** - Beautiful, customizable icons

**Backend:**
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **fast-xml-parser** - XML parsing for 3MF metadata
- **fflate** - Fast compression/decompression for ZIP files
- **CORS** - Cross-origin resource sharing

**Development & Deployment:**
- **Docker** - Containerization for easy deployment
- **Docker Compose** - Multi-container orchestration

## Features

- **Model Management**: Organize and categorize your 3D printing models
- **Advanced Search & Filtering**: Search by name, tags, category, print status, and license
- **3D Model Viewer**: Built-in Three.js viewer for .3mf files with automatic thumbnail extraction
- **Automatic Model Scanning**: Scan directories and automatically generate metadata JSON files
- **Hash-based Duplicate Detection**: Identify duplicate models using MD5 file hashing
- **Bulk Editing**: Edit multiple models simultaneously
- **Configuration Management**: Export, import, and backup your app settings
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Theme Support**: Toggle between light and dark themes
- **Grid/List Views**: Multiple viewing options with adjustable density
- **Print Status Tracking**: Track which models have been printed
- **Drag & Drop**: Reorder categories in settings
- **Model Editing**: Edit model details, tags, and settings
- **Premium UI**: Clean, modern interface with indigo branding
- **Docker Support**: Easy deployment with Docker and Docker Compose


## Available Scripts

- `npm run dev` - Start the development server (Vite)
- `npm run build` - Build the frontend for production
- `npm run build:backend` - Compile TypeScript backend utilities
- `npm run preview` - Preview the production build locally

## Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build backend utilities**
   ```bash
   npm run build:backend
   ```

3. **Start the backend server**
   ```bash
   node server.js
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

**Open your browser**
   Navigate to `http://localhost:3000` (or the port shown in your terminal)

## Configuration Management

### Overview

3D Model Muncher includes a comprehensive configuration management system that allows you to:

- **Export Settings**: Download your configuration as a JSON file
- **Import Settings**: Load configuration from a saved JSON file
- **Auto-save**: Automatically save changes to browser storage
- **Reset to Defaults**: Restore original settings
- **Backup & Sync**: Share settings across devices

### Configuration File Structure

The configuration file (`3d-model-muncher-config.json`) contains:

```json
{
  "version": "1.0.0",
  "categories": [
    {
      "id": "miniatures",
      "label": "Miniatures",
      "icon": "Package"
    }
  ],
  "settings": {
    "defaultTheme": "system",
    "defaultView": "grid",
    "defaultGridDensity": 4,
    "autoSave": true,
    "modelDirectory": "./models",
    "exportDirectory": "./exports"
  },
  "filters": {
    "defaultCategory": "all",
    "defaultPrintStatus": "all",
    "defaultLicense": "all"
  },
  "lastModified": "2024-01-01T00:00:00.000Z"
}
```

### Managing Configuration

#### Through the Settings Page

1. Navigate to **Settings** (gear icon in sidebar)
2. Use the **Configuration Management** section to:
   - **Save Config**: Save current settings to browser storage
   - **Export**: Download configuration as JSON file
   - **Import**: Upload a configuration JSON file
   - **Reset**: Restore default settings

#### Manual Configuration

You can also manually edit the configuration file:

1. Export your current configuration
2. Edit the JSON file with your preferred settings
3. Import the modified configuration back into the app

### Configuration Options

#### Application Settings
- **Default Theme**: Light, Dark, or System
- **Default View**: Grid or List view
- **Default Grid Density**: Number of columns (1-6)
- **Auto-save**: Automatically save configuration changes
- **Model Directory**: Path to 3D model files
- **Export Directory**: Path for exported files

#### Default Filters
- **Default Category**: Starting category filter
- **Default Print Status**: Starting print status filter
- **Default License**: Starting license filter

#### Categories
- **Custom Categories**: Define and reorder model categories
- **Drag & Drop**: Reorder categories in the settings page
- **Icon Mapping**: Assign icons to categories

### Storage

- **Browser Storage**: Configuration is automatically saved to `localStorage`
- **Export/Import**: Manual backup and restore via JSON files
- **Cross-Device Sync**: Export from one device, import to another

## Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Docker Deployment

The application includes Docker support for easy deployment:

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

This will:
- Build the application container
- Start the backend server on port 3001
- Serve the built frontend
- Mount the `models/` directory for persistent storage

### Manual Docker Build

```bash
# Build the image
docker build -t 3d-model-muncher .

# Run the container
docker run -p 3001:3001 -v $(pwd)/models:/app/models 3d-model-muncher
```

## Backend API

The Express.js backend provides several API endpoints:

- `GET /api/models` - Retrieve all model metadata
- `POST /api/models/save` - Save model changes
- `POST /api/scan-models` - Trigger model directory scan
- `GET /api/munchie-files` - Get all munchie JSON files and their hashes
- `GET /api/hash-check` - Perform hash verification for all models

### Model Scanning

The backend can automatically scan your model directory and generate JSON metadata files:

1. **Automatic scanning**: Models are scanned when the `/api/models` endpoint is called
2. **Manual scanning**: Use the `/api/scan-models` endpoint to force a rescan
3. **Metadata preservation**: User-added data (tags, print status, notes) is preserved during rescans

## Project Structure

```
├── README.md              # This file
├── package.json           # Project dependencies and scripts
├── server.js              # Express backend server
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose configuration
├── index.html             # Main HTML entry point
├── build/                 # Production build output
├── dist-backend/          # Compiled backend utilities
├── models/                # 3D model files directory
└── src/                   # Source code
    ├── App.tsx            # Main application component
    ├── main.tsx           # Application entry point
    ├── index.css          # Main CSS file
    ├── Attributions.md    # Attribution information
    ├── components/        # React components
    │   ├── FilterSidebar.tsx     # Search and filtering sidebar
    │   ├── ModelCard.tsx         # Individual model card component
    │   ├── ModelDetailsDrawer.tsx # Model details and editing panel
    │   ├── ModelGrid.tsx         # Grid/list view for models
    │   ├── ModelViewer3D.tsx     # Three.js 3D model viewer
    │   ├── SettingsPage.tsx      # Application settings and configuration
    │   ├── ThemeProvider.tsx     # Theme context provider
    │   ├── ThemeToggle.tsx       # Theme switching component
    │   ├── BulkEditDrawer.tsx    # Bulk editing functionality
    │   ├── DemoPage.tsx          # Demo/showcase page
    │   ├── DonationDialog.tsx    # Donation dialog component
    │   ├── ErrorBoundary.tsx     # Error boundary component
    │   ├── ImageWithFallback.tsx # Image component with fallback
    │   ├── ModelMesh.tsx         # 3D model mesh component
    │   └── ui/                   # Reusable UI components (shadcn/ui)
    ├── config/
    │   └── default-config.json   # Default configuration template
    ├── styles/
    │   └── globals.css           # Global styles and Tailwind configuration
    ├── types/
    │   ├── category.ts           # Category type definitions
    │   ├── config.ts             # Configuration type definitions
    │   └── model.ts              # Model type definitions
    └── utils/
        ├── configManager.ts      # Configuration management utilities
        ├── threeMFToJson.ts      # 3MF file parsing and JSON generation
        └── fileManager.ts        # File management utilities
```

## Usage

### Adding 3D Models

1. Place your `.3mf` files in the `models/` directory (or your configured model directory)
2. Use the **Scan Models** feature in the application to automatically generate JSON metadata files
3. The system will automatically create `-munchie.json` files containing extracted metadata from your 3MF files
4. Thumbnails are automatically extracted from 3MF files when available

### Customizing Categories

1. Navigate to Settings (gear icon in sidebar)
2. Use drag-and-drop to reorder categories
3. Categories will automatically sync with the filter sidebar
4. Export your configuration to backup category settings

### Theme Switching

Click the theme toggle button in the top-right corner to switch between light and dark themes.

### Configuration Backup

1. **Export**: Go to Settings → Configuration Management → Export
2. **Import**: Go to Settings → Configuration Management → Import
3. **Share**: Send the exported JSON file to sync settings across devices

### Model File Management

#### 3MF File Processing

The application automatically processes `.3mf` files to extract:

- **Metadata**: Model name, description, creation date, and print settings
- **Thumbnails**: Embedded preview images (plate_1.png or thumbnail.png)
- **File Hash**: MD5 hash for duplicate detection
- **Print Settings**: Layer height, infill percentage, print time estimates
- **Additional Images**: Auxiliary model pictures in WebP format

#### JSON Metadata Files

Each 3MF file gets a corresponding `-munchie.json` file containing:

```json
{
  "id": 1,
  "name": "Model Name",
  "description": "Model description from 3MF metadata",
  "hash": "md5-hash-of-file",
  "thumbnail": "data:image/png;base64,...",
  "tags": ["user-defined", "tags"],
  "category": "user-defined-category",
  "isPrinted": false,
  "notes": "User notes",
  "price": 0,
  "printSettings": {
    "layerHeight": 0.2,
    "infillPercent": 20,
    "printTime": "2h 30m"
  },
  "fileSizeMB": "15.2 MB",
  "createdDate": "2024-01-01T00:00:00.000Z"
}
```

#### Duplicate Detection

The system uses MD5 file hashing to identify duplicate models:

- Hash verification compares stored hashes with actual file hashes
- Identifies when files have been modified since metadata generation
- Groups duplicate files for easy management


## Performance Notes

- The 3D viewer loads models on-demand when opening the details drawer
- Images are lazy-loaded and optimized
- Configuration is cached in browser storage for fast startup
- The app uses React's built-in performance optimizations

## Troubleshooting

### Common Issues

1. **Models not loading**
   - Ensure `.3mf` files are in the `models/` directory
   - Check that the backend server is running (`node server.js`)
   - Verify the backend build completed successfully (`npm run build:backend`)
   - Check browser console for API errors

2. **3D viewer not displaying models**
   - Ensure the model file path is correct in the JSON metadata
   - Check browser console for Three.js loading errors
   - Verify the 3MF file is not corrupted

3. **Configuration not saving**
   - Check browser storage permissions
   - Verify localStorage is not full
   - Try exporting configuration manually
   - Ensure the backend API is accessible

4. **Model scanning not working**
   - Verify backend utilities are built (`npm run build:backend`)
   - Check that the models directory exists and is readable
   - Look for errors in the server console output
   - Ensure file permissions allow reading 3MF files

5. **Docker deployment issues**
   - Ensure Docker and Docker Compose are installed
   - Check that port 3001 is not already in use
   - Verify the models directory is properly mounted
   - Check Docker logs for error messages
