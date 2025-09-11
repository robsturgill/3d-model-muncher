# Fix for Preview Mode Model Loading Issue

## Problem
When running `npm run preview` (Vite preview mode), the frontend was trying to load 3MF model files directly from the Vite server at `http://localhost:4173/models/...`, but the files are served by the backend API server running on port 3001. This caused "Cannot find relationship file `rels`" errors.

## Root Cause
- **Dev Mode**: Frontend runs on `http://localhost:3000`, directly accesses backend on `http://localhost:3001`
- **Preview Mode**: Frontend runs on `http://localhost:4173`, but hardcoded `localhost:3001` URLs don't work with Vite preview server
- **Model URLs**: Generated as `/models/...` but Vite preview server didn't know how to proxy these to the backend

## Solution
### 1. Added Vite Proxy Configuration
Updated `vite.config.ts` to proxy both `/api` and `/models` requests to the backend server:

```typescript
server: {
  port: 3000,
  open: true,
  proxy: {
    '/api': 'http://localhost:3001',
    '/models': 'http://localhost:3001'
  }
},
preview: {
  port: 4173,
  proxy: {
    '/api': 'http://localhost:3001',
    '/models': 'http://localhost:3001'
  }
}
```

### 2. Updated Frontend API Calls
Changed all hardcoded `http://localhost:3001` URLs to relative URLs so they work with the proxy:

**Files Updated:**
- `src/App.tsx` - Model loading and scanning
- `src/components/ModelDetailsDrawer.tsx` - Model saving
- `src/components/BulkEditDrawer.tsx` - Bulk model saving  
- `src/components/SettingsPage.tsx` - Model loading, scanning, hash checking, deletion

**Changes:**
- `http://localhost:3001/api/models` → `/api/models`
- `http://localhost:3001/api/scan-models` → `/api/scan-models`
- `http://localhost:3001/api/save-model` → `/api/save-model`
- etc.

## Testing

### ✅ Development Mode (`npm run dev`)
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001` 
- Proxy: Direct API calls work via Vite proxy

### ✅ Preview Mode (`npm run preview` + `npm run server:preview`)
- Frontend: `http://localhost:4173`
- Backend: `http://localhost:3001`
- Proxy: Both `/api/*` and `/models/*` requests proxied correctly

### ✅ Production Mode (Docker/Unraid)
- Frontend: Served by backend server
- Backend: Same server on port 3001
- Models: Direct static file serving from mounted volume

## Benefits

1. **Consistent Behavior**: All modes now work the same way
2. **No Model Copying**: Still maintains single source of truth
3. **Easy Testing**: Preview mode now works exactly like production
4. **Docker Ready**: No changes needed for Docker/Unraid deployment
5. **Development Friendly**: Dev mode works seamlessly with proxy

## Migration Notes

- **No breaking changes** for existing users
- **No Docker changes** needed - volume mappings remain the same
- **Faster development** - Preview mode now works correctly for testing production builds

## Files Modified

1. `vite.config.ts` - Added proxy configuration
2. `src/App.tsx` - Updated API calls to use relative URLs
3. `src/components/ModelDetailsDrawer.tsx` - Updated API calls
4. `src/components/BulkEditDrawer.tsx` - Updated API calls  
5. `src/components/SettingsPage.tsx` - Updated API calls

## Test Commands

```bash
# Development mode (hot reload, source maps, etc.)
npm run dev & npm run server

# Preview mode (test production build)
npm run build
npm run preview & npm run server

# Single backend server works for both modes
# Access dev at http://localhost:3000
# Access preview at http://localhost:4173
```
