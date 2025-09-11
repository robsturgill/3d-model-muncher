# Backup & Restore Documentation

## Overview

The 3D Model Muncher now includes a comprehensive backup and restore system for your model metadata files (the `*-munchie.json` files). This feature helps protect your custom tags, print settings, notes, and other metadata by creating compressed backup archives.

## Features

### 📦 Backup Creation
- **Automatic Compression**: Creates gzipped archives of all munchie.json files
- **Metadata Preservation**: Backs up all model metadata including tags, print status, notes, categories
- **Path Information**: Stores original file paths for accurate restoration
- **Hash-Based Identification**: Uses MD5 hashes for reliable file matching during restoration

### 🔄 Restore Strategies

#### 1. Hash Match (Recommended)
- **How it works**: Compares the 3MF file hash stored in backup metadata with current 3MF file hashes, then restores to the corresponding munchie.json file
- **Best for**: When files might have been moved, renamed, or reorganized since backup
- **Safety**: High - matches based on actual file content, ensuring metadata goes to the correct model

#### 2. Path Match
- **How it works**: Only restores files that exist at their original backup locations
- **Best for**: When you want to be conservative and only update existing files
- **Safety**: Highest - never creates new files, only updates existing ones

#### 3. Force Restore
- **How it works**: Restores all files to their original paths, creating directories if needed
- **Best for**: Complete restoration after data loss or when reorganizing
- **Safety**: Medium - can create new files and overwrite existing ones

## Usage

### Creating a Backup

1. Navigate to **Settings → Backup & Restore**
2. Click **"Create Backup"**
3. The system will:
   - Scan all directories for `*-munchie.json` files
   - Compress them into a `.gz` archive
   - Automatically download the backup file
   - Filename format: `munchie-backup-YYYY-MM-DD-HH-MM-SS.gz`

### Restoring from Backup

1. Navigate to **Settings → Backup & Restore**
2. Choose your **Restore Strategy** from the dropdown
3. Click **"Restore from File"**
4. Select your backup file (`.gz` or `.json`)
5. Review the restore results in the status message

## File Handling

### Backup File Structure
```json
{
  "timestamp": "2025-01-15T18:53:00.000Z",
  "version": "1.0.0",
  "files": [
    {
      "relativePath": "folder/model-munchie.json",
      "originalPath": "folder/model-munchie.json",
      "content": { /* full model metadata */ },
      "hash": "abc123...",
      "size": 1234
    }
  ]
}
```

### Supported File Types
- **`.gz` files**: Compressed backup archives (recommended)
- **`.json` files**: Plain JSON backup files (for manual editing)

## Scenarios & Recommendations

### Regular Backups
- **Frequency**: Weekly or before major organization changes
- **Strategy**: Hash Match
- **Purpose**: Ongoing protection of metadata

### After File Reorganization
- **When**: After moving/renaming model files
- **Strategy**: Hash Match
- **Purpose**: Restore metadata to reorganized files

### Disaster Recovery
- **When**: After data loss or corruption
- **Strategy**: Force Restore
- **Purpose**: Complete restoration of all metadata

### Selective Updates
- **When**: Only want to update existing files
- **Strategy**: Path Match
- **Purpose**: Conservative restoration without creating new files

## Technical Details

### Hash-Based Matching
- Uses MD5 hashes of the original 3MF files stored in the munchie.json metadata
- During restore, finds current 3MF files with matching hashes and restores metadata to their corresponding munchie.json files
- Enables restoration even when munchie.json files are moved/renamed, as long as the 3MF file hash matches
- Fallback to path matching when hash not available or no matching 3MF file found

### Compression
- Uses gzip compression for efficient storage
- Typical compression ratio: 80-90% size reduction
- Maintains full metadata fidelity

### Path Handling
- Normalizes path separators (forward slashes)
- Preserves directory structure
- Creates directories as needed (Force Restore mode)

## Troubleshooting

### Common Issues

**"No matching file found"**
- The file has been moved and its hash changed
- Try using "Force Restore" if you want to recreate the file

**"Hash mismatch"**
- The 3MF file content has changed since backup (re-sliced, edited, etc.)
- The backup metadata belongs to an older version of the file
- Consider this expected behavior when models have been modified

**"Permission denied"**
- Check that the models directory is writable
- Ensure no other processes are using the files

### Best Practices

1. **Regular Backups**: Create backups before major changes
2. **Test Restores**: Occasionally test your restore process
3. **Strategy Selection**: Choose the right restore strategy for your situation
4. **Version Control**: Keep multiple backup versions for different time periods
5. **Documentation**: Note any significant file reorganizations

## API Endpoints

For developers or advanced users:

- `POST /api/backup-munchie-files` - Create backup
- `POST /api/restore-munchie-files` - Restore from JSON
- `POST /api/restore-munchie-files/upload` - Restore from uploaded file

## Security Notes

- Backups are created locally and stored on your device
- No data is transmitted to external servers
- File paths are preserved exactly as they exist in your models directory
- Only `*-munchie.json` files are included in backups (no 3MF files)
