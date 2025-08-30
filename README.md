# 3D Model Muncher

A responsive 3D printing model management application built with React, TypeScript, and Three.js. Organize, search, and preview your 3D printing models with an intuitive interface featuring dark/light theme support and a premium indigo design system.

## Features

- **Model Management**: Organize and categorize your 3D printing models
- **Advanced Search & Filtering**: Search by name, tags, category, print status, and license
- **3D Model Viewer**: Built-in Three.js viewer for .3mf files
- **Configuration Management**: Export, import, and backup your app settings
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Theme Support**: Toggle between light and dark themes
- **Grid/List Views**: Multiple viewing options with adjustable density
- **Print Status Tracking**: Track which models have been printed
- **Drag & Drop**: Reorder categories in settings
- **Model Editing**: Edit model details, tags, and settings
- **Premium UI**: Clean, modern interface with indigo branding


## Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**
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

## Project Structure

```
├── App.tsx                 # Main application component
├── README.md              # This file
├── components/            # React components
│   ├── FilterSidebar.tsx  # Search and filtering sidebar
│   ├── ModelCard.tsx      # Individual model card component
│   ├── ModelDetailsDrawer.tsx # Model details and editing panel
│   ├── ModelGrid.tsx      # Grid/list view for models
│   ├── ModelViewer3D.tsx  # Three.js 3D model viewer
│   ├── SettingsPage.tsx   # Application settings and configuration
│   ├── ThemeProvider.tsx  # Theme context provider
│   ├── ThemeToggle.tsx    # Theme switching component
│   └── ui/               # Reusable UI components (shadcn/ui)
├── config/
│   └── default-config.json # Default configuration template
├── styles/
│   └── globals.css       # Global styles and Tailwind configuration
├── types/
│   ├── category.ts       # Category type definitions
│   ├── config.ts         # Configuration type definitions
│   └── model.ts         # Model type definitions
├── utils/
│   └── configManager.ts  # Configuration management utilities
└── guidelines/
    └── Guidelines.md     # Development guidelines
```

## Usage

### Adding 3D Models

1. Place your `.3mf` files in the `public/models/` directory
2. Update the `mockModels` array in `App.tsx` with your model information
3. Ensure thumbnail images are available (using Unsplash URLs as placeholders)

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


## Performance Notes

- The 3D viewer loads models on-demand when opening the details drawer
- Images are lazy-loaded and optimized
- Configuration is cached in browser storage for fast startup
- The app uses React's built-in performance optimizations

## Troubleshooting

### Common Issues

1. **Three.js models not loading**
   - Ensure `.3mf` files are in the `public/models/` directory
   - Check browser console for loading errors
   - Verify file paths in the model data

2. **Configuration not saving**
   - Check browser storage permissions
   - Verify localStorage is not full
   - Try exporting configuration manually
