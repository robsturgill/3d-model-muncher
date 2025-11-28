# Plan: G-code Upload & Parsing with Multi-Filament Support (FINAL)

Support uploading .gcode or .gcode.3mf files to extract print time and per-filament usage, with weight estimation, normalized time format, multi-filament table with color swatches, G-code storage alongside model files, configurable overwrite and storage behaviors, comprehensive unit tests with 80%+ coverage, and updated documentation.

## Steps

### 1. Create `src/utils/gcodeParser.ts`

Create TypeScript utility with interfaces:
- `GcodeFilament { type: string; length: string; weight: string; density?: string; color?: string }`
- `GcodeMetadata { printTime?: string; filaments: GcodeFilament[]; totalFilamentWeight?: string }`

Parse BambuStudio CSV headers:
- `;total filament length [mm] : 1229.28,2893.34`
- `;total filament weight [g] : 3.73,8.77`
- `;filament_type = PLA;PLA;PETG`
- `;filament_density: 1.26,1.26`
- `;filament_colour = #898989;#161616;#0EE2A0`

Parse Cura format:
- `;TIME:53473` (seconds)
- `;Filament used: 22.4m` (meters)

Include functions:
- `normalizeTime(seconds)` - convert to `Xh Ym Zs` format
- `estimateWeightFromLength(lengthMm, diameter=1.75, density=1.24)` - using cylinder volume formula `(π * (d/2)² * length) * density`
- `extractGcodeFrom3MF(buffer)` - using `fflate.unzipSync()` to search for `.gcode` file entry

Map colors to filaments by index (split CSV values, match array positions).

Read first 200 lines only for performance.

### 2. Update `src/types/model.ts`

Add to `Model` interface:
```typescript
gcodeData?: {
  printTime?: string;
  filaments: Array<{
    type: string;
    length: string;
    weight: string;
    density?: string;
    color?: string;
  }>;
  totalFilamentWeight?: string;
  gcodeFilePath?: string;
}
```

Keep legacy `printTime` and `filamentUsed` string fields unchanged for backward compatibility and manual entry.

UI should prefer `gcodeData` values when present.

### 3. Update `src/types/config.ts`

Add to `AppConfig.settings`:
- `gcodeOverwriteBehavior?: 'prompt' | 'overwrite'` (default `'prompt'`)
- `gcodeStorageBehavior?: 'parse-only' | 'save-and-link'` (default `'parse-only'`)

**Behaviors:**
- `gcodeOverwriteBehavior` controls prompting for existing files
- `gcodeStorageBehavior` controls whether G-code file is saved to disk and added to `related_files`

### 4. Add `POST /api/parse-gcode` endpoint in `server.js`

Location: After `/api/upload-models` (~line 1740)

Use `multer.single('file')` accepting `.gcode,.3mf`

**Required in `req.body`:**
- `modelFilePath`
- `storageMode` (`'parse-only'` | `'save-and-link'`)

**Optional in `req.body`:**
- `overwrite` (boolean)
- `gcodeFilePath` (for re-analysis)

**Logic:**
- Detect `.gcode.3mf` by attempting `unzipSync()` and checking for `.gcode` entry
- Call `parseGcode()` from `dist-backend/utils/gcodeParser.js`
- If `storageMode='save-and-link'`:
  - Save G-code to `path.join(path.dirname(modelFilePath), path.basename(modelFilePath, path.extname(modelFilePath)) + '.gcode')`
  - Check existing file
  - Return `{fileExists: true}` without `overwrite=true`
- If `storageMode='parse-only'`: skip saving

**Return:**
```json
{
  "success": true,
  "gcodeData": {
    "printTime": "3h 13m 52s",
    "filaments": [...],
    "totalFilamentWeight": "47.24g",
    "gcodeFilePath": "..."
  },
  "fileExists": false,
  "warnings": []
}
```

### 5. Extend `ModelDetailsDrawer.tsx`

Location: After related files (~line 2950, view mode only)

**Visibility:** Only show section when `currentModel.gcodeData` exists

**UI Components:**
- Hidden input: `<input ref={gcodeInputRef} type="file" accept=".gcode,.3mf" />`
- Primary button: "Upload G-code"
- Secondary button (if `gcodeData.gcodeFilePath` exists): "Re-analyze existing G-code"
- Drag-and-drop zone with `onDrop`/`onDragOver` handlers

**Handler: `handleGcodeUpload()`**
- Read config via `ConfigManager.loadConfig()`
- Create `FormData` with file, `modelFilePath`, and `storageMode`
- Post to `/api/parse-gcode`
- If `fileExists=true` and config `gcodeOverwriteBehavior='prompt'`:
  - Show confirmation `AlertDialog`
  - On confirm, add `overwrite=true` and re-post
- Call `/api/save-model` with `gcodeData`, legacy `printTime`, `filamentUsed`
- If `storageMode='save-and-link'` and `gcodeFilePath`: add to `related_files`
- Show toast
- Refresh via `onModelUpdate()`

**Handler: `handleReanalyze()`**
- Post to `/api/parse-gcode` with `gcodeFilePath` in body (no file upload)
- Same save logic as above

**Display:**
- Read-only single-line summary: `Total: {totalFilamentWeight} | {printTime}` with `ChevronDown` icon
- Expandable `Collapsible` with table when `filaments.length > 1`:
  - Columns: `Color Swatch | Type | Length | Weight`
  - Color swatch: `<div className="w-6 h-6 rounded border" style={{backgroundColor: filament.color || '#888'}} />`
  - Fallback: gray (#888) if no color

### 6. Update `SettingsPage.tsx`

Location: General tab > "Application Settings" card (after default model color, ~line 1920)

Add wrapper: `<div className="space-y-4"><h3>G-code Settings</h3>`

**Controls:**
1. `Switch` for `gcodeOverwriteBehavior`:
   - Label: "Auto-overwrite G-code files"
   - Description: "When enabled, uploading G-code overwrites existing files without prompting"
   - Bind to `localConfig.settings.gcodeOverwriteBehavior`

2. `RadioGroup` for `gcodeStorageBehavior`:
   - Option 1: "Parse only (don't save file)" (`parse-only`, default)
   - Option 2: "Save file and add to related files" (`save-and-link`)
   - Bind to `localConfig.settings.gcodeStorageBehavior`

**Handlers:**
- `handleConfigFieldChange('settings.gcodeOverwriteBehavior', ...)`
- `handleConfigFieldChange('settings.gcodeStorageBehavior', ...)`

### 7. Create minimal test fixtures in `tests/fixtures/gcode/`

**Synthetic fixtures (first 50 lines only, no licensing issues):**
- `bambu-single.gcode` - BambuStudio single-filament with color
- `bambu-multi.gcode` - BambuStudio 4-color multi-filament
- `cura-basic.gcode` - Cura format with TIME and filament length
- `test.gcode.3mf` - minimal 3MF zip with embedded `.gcode`

**Reference file (user owns rights):**
- Use `models/gcode-samples/munchie_PLA_1h35m.gcode` directly in tests

**Note:** Fixtures only need header comments with metadata, no actual G-code commands required.

### 8. Create `tests/gcodeParser.test.ts`

Use Vitest framework.

**Test cases:**
1. BambuStudio multi-filament fixture:
   - Verify 4 filaments with types, weights, colors, total, time

2. Two-color using `munchie_PLA_1h35m.gcode`:
   - Verify 2 filaments
   - Colors: `#898989/#161616`
   - Weights: `25.52/3.36g`
   - Time: `1h 34m 38s`

3. Cura fixture:
   - Verify time conversion from seconds
   - Weight estimation from length
   - No color field

4. `normalizeTime()` edge cases:
   - 0, 59, 60, 3661, 86400 seconds

5. `estimateWeightFromLength()`:
   - Known PLA values with standard diameter/density

6. `extractGcodeFrom3MF()`:
   - Mock buffer with zip structure

7. Edge cases:
   - Empty file
   - Malformed comments
   - Missing fields

8. Color parsing and mapping to filament index

**Target:** 80%+ code coverage

**Run:** `npm run test` or `npm run test:watch`

### 9. Create `tests/server/parseGcodeEndpoint.test.ts`

Mock `multer` and filesystem.

**Test cases:**
1. `storageMode='parse-only'`:
   - Returns parsed data without saving file

2. `storageMode='save-and-link'`:
   - Writes file to disk
   - Returns `gcodeFilePath`

3. `fileExists=true`:
   - File present without `overwrite` flag

4. `overwrite=true`:
   - Replaces existing file

5. Re-analysis via `gcodeFilePath` param:
   - No file upload, reads from disk

6. `.gcode.3mf` extraction:
   - Unzips and extracts embedded G-code

7. Error cases:
   - Missing required params
   - Invalid file
   - Parse failure

8. Color data persistence:
   - Verify colors included in response

**Target:** 80%+ code coverage

### 10. Update `README.md`

**Section 1: Features list (after "Capture 3D previews", line ~9)**

Add bullet:
```markdown
- **G-code Analysis**: Upload .gcode or .gcode.3mf files to automatically extract print time, filament usage, and material colors with multi-material support
```

**Section 2: New "G-code Integration" section (after "File Structure", ~line 86)**

Content:
```markdown
## G-code Integration

Upload G-code files to automatically extract print metadata including time estimates, filament usage, and material colors.

**Supported Formats:**
- Cura (Ultimaker Cura slicer)
- BambuStudio / BambuLab
- PrusaSlicer (future support)

**Features:**
- Multi-filament/multi-color support
- Automatic weight estimation from filament length
- Color swatch display for multi-material prints
- Configurable storage: parse-only or save-and-link
- Overwrite protection with user prompt

**Data Storage:**
Parsed G-code data is stored in the model's `gcodeData` field in the munchie.json file. Legacy `printTime` and `filamentUsed` fields are preserved for backward compatibility and manual entry.

**Configuration:**
- **Parse only** (default): Extracts data without saving G-code file
- **Save and link**: Saves G-code file alongside model and adds to `related_files`
- **Overwrite behavior**: Prompt user (default) or auto-overwrite existing files
```

**Section 3: Update "User-defined metadata" section**

Add `gcodeData` to preserved fields list:
```markdown
- `gcodeData` — parsed G-code metadata (print time, filament usage, colors)
```

**Section 4: Update "API Endpoints" section**

Add:
```markdown
- `POST /api/parse-gcode` - Parse G-code files and extract print metadata including filament colors
```

### 11. Update `tsconfig.json`

Add `"src/utils/gcodeParser.ts"` to `files` array, or ensure `"include": ["src/utils/**/*"]` covers it.

**Verification:**
- Compile: `npm run build:backend`
- Verify output: `dist-backend/utils/gcodeParser.js` exists
- Run tests: `npm run test`
- All tests should pass

## Implementation Ready

All requirements finalized including:
- ✅ Color parsing from `;filament_colour` field
- ✅ Color swatch display in UI table
- ✅ Unit tests with 80%+ coverage target
- ✅ Minimal synthetic fixtures in `tests/fixtures/gcode/`
- ✅ User-owned `munchie_PLA_1h35m.gcode` reference
- ✅ Comprehensive parser logic test cases
- ✅ Color mapping validation
- ✅ API endpoint testing
- ✅ Complete README documentation
