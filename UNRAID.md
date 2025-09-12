# Unraid Installation Guide

## 🚀 Quick Installation

### Method 1: One-Command Setup (Easiest)
```bash
# SSH into Unraid and run:
mkdir -p /mnt/user/appdata/3d-model-muncher /mnt/user/3d-models
cd /mnt/user/appdata/3d-model-muncher
wget https://raw.githubusercontent.com/robsturgill/3d-model-muncher/main/docker-compose.yml
wget https://raw.githubusercontent.com/robsturgill/3d-model-muncher/main/.env.unraid -O .env
docker-compose up -d
```

**Access:** `http://YOUR_UNRAID_IP:3001`

### Method 2: Unraid Template (GUI)
1. **Install Community Applications** plugin (if not installed)
2. **Add Template:** Go to Apps → Settings → Template repositories
   - Add: `https://github.com/robsturgill/3d-model-muncher`
3. **Install:** Search for "3D Model Muncher" and click Install

### Method 3: Manual Docker Setup
1. Go to **Docker** tab in Unraid web interface
2. Click **Add Container**
3. Fill in settings:

| Setting | Value |
|---------|-------|
| **Name** | `3d-model-muncher` |
| **Repository** | `robsturgill/3d-model-muncher:latest` |
| **Network** | `Bridge` |
| **Port** | `3001:3001` |

4. **Add Volume Paths:**
   - **Models:** `/mnt/user/3d-models` → `/app/models`
   - **Data:** `/mnt/user/appdata/3d-model-muncher` → `/app/data`

5. **Add Environment Variables:**
   - `PUID=99`
   - `PGID=100`
   - `TZ=America/New_York` (change to your timezone)

## 📂 Directory Structure

```
/mnt/user/
├── 3d-models/                     # Your .3mf files go here
│   ├── miniatures/
│   ├── terrain/
│   └── vehicles/
└── appdata/3d-model-muncher/      # App configuration and data
    ├── docker-compose.yml
    └── .env
```

## ⚙️ Configuration

The `.env.unraid` file contains optimized settings:
```bash
COMPOSE_IMAGE=robsturgill/3d-model-muncher:latest
HOST_PORT=3001
MODELS_PATH=/mnt/user/3d-models
DATA_PATH=/mnt/user/appdata/3d-model-muncher
PUID=99
PGID=100
TZ=America/New_York
```

**Customize as needed:**
- Change `TZ` to your timezone
- Modify paths if you use different share names

## 🔧 Management

### Useful Commands
```bash
# Check status
docker ps | grep 3d-model-muncher

# View logs
docker logs 3d-model-muncher

# Restart
docker restart 3d-model-muncher

# Update to latest version
cd /mnt/user/appdata/3d-model-muncher
docker-compose pull && docker-compose up -d
```

### File Permissions
If you have permission issues:
```bash
chown -R nobody:users /mnt/user/3d-models
chown -R nobody:users /mnt/user/appdata/3d-model-muncher
chmod -R 755 /mnt/user/3d-models
```

## 🔧 Troubleshooting

**Container won't start:**
```bash
docker logs 3d-model-muncher
```

**Models not showing:**
- Check that `.3mf` files are in `/mnt/user/3d-models`
- Verify volume mounts in container settings

**Permission errors:**
- Ensure PUID=99 and PGID=100 are set
- Check file ownership with `ls -la /mnt/user/3d-models`

**Web interface not accessible:**
- Verify port 3001 is mapped correctly
- Check Unraid firewall settings
- Try accessing from Unraid server directly: `curl http://localhost:3001`

---

**Need help?** Check the [main documentation](DOCKER-DEPLOYMENT.md) or open an issue on GitHub.

**Happy 3D printing! 🖨️**