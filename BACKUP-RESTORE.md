# Backup & Restore

## Overview

Protect your model metadata (tags, notes, print status, etc.) with automatic backup and restore functionality for all `*-munchie.json` files. Backups now also include your Collections stored in `data/collections.json`.

## Quick Start

### Creating a Backup
1. Go to **Settings → Backup & Restore**
2. Click **"Create Backup"**
3. A compressed `.gz` file will download automatically

### Restoring from Backup
1. Go to **Settings → Backup & Restore**
2. Choose a restore strategy:
   - **Hash Match** (recommended): Matches files by content, works even if files were moved
   - **Path Match**: Only restores files at original locations (safest)
   - **Force Restore**: Restores all files, creating directories as needed
3. Click **"Restore from File"** and select your backup
4. Collections restore strategy:
   - **Merge** (default): Combine with existing collections by id (backup wins for conflicts; new items get ids if missing)
   - **Replace**: Overwrite existing `data/collections.json` with the backup version

## Common Use Cases

- **Regular Protection**: Create weekly backups before major changes
- **File Reorganization**: Use Hash Match to restore metadata after moving files
- **Disaster Recovery**: Use Force Restore to completely rebuild from backup
- **Conservative Updates**: Use Path Match to only update existing files

## Technical Notes

- Creates compressed `.gz` archives (80-90% size reduction)
- Uses MD5 hashes for reliable file matching
- Supports both `.gz` and `.json` backup formats
- Backs up metadata files and collections; not the actual 3MF/STL model files
- All operations are local - no data sent to external servers
