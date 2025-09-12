# Docker Deployment Guide

## 🚀 Quick Start

### Local Development
```bash
git clone https://github.com/robsturgill/3d-model-muncher.git
cd 3d-model-muncher
docker-compose up -d --build
```
**Access:** http://localhost:3000

### Production Deployment
```bash
# Download files
wget https://raw.githubusercontent.com/robsturgill/3d-model-muncher/main/docker-compose.yml
wget https://raw.githubusercontent.com/robsturgill/3d-model-muncher/main/.env.production -O .env

# Start
docker-compose up -d
```
**Access:** http://localhost:3000

### Unraid Deployment
```bash
# Create directories
mkdir -p /mnt/user/appdata/3d-model-muncher /mnt/user/3d-models

# Download and start
cd /mnt/user/appdata/3d-model-muncher
wget https://raw.githubusercontent.com/robsturgill/3d-model-muncher/main/docker-compose.yml
wget https://raw.githubusercontent.com/robsturgill/3d-model-muncher/main/.env.unraid -O .env
docker-compose up -d
```
**Access:** http://YOUR_UNRAID_IP:3001

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPOSE_IMAGE` | _(build from source)_ | Set to `robsturgill/3d-model-muncher:latest` for published image |
| `HOST_PORT` | `3000` | Port to expose on host |
| `MODELS_PATH` | `./models` | Path to your 3D models directory |
| `DATA_PATH` | `./data` | Path for application data |
| `PUID` | `1000` | User ID (use `99` for Unraid) |
| `PGID` | `1000` | Group ID (use `100` for Unraid) |
| `TZ` | `UTC` | Timezone (e.g., `America/New_York`) |

### Environment Templates

Copy the appropriate template to `.env`:

- **`.env.example`** - Template with all options documented
- **`.env.production`** - Production deployment using published DockerHub image
- **`.env.unraid`** - Unraid-optimized settings with proper paths and permissions

## 🔧 Platform-Specific Setup

### Windows
```bash
# Use PowerShell or Command Prompt
cp .env.production .env
docker-compose up -d
```

### Linux/macOS
```bash
cp .env.production .env
docker-compose up -d
```

### Unraid
```bash
cp .env.unraid .env
# Edit .env to customize timezone and paths if needed
docker-compose up -d
```

**For Unraid Template Installation:**
- Template URL: `https://raw.githubusercontent.com/robsturgill/3d-model-muncher/main/unraid-template.xml`

## 🏗️ Architecture

The Docker container runs a single Node.js/Express server that:
- **Serves the React frontend** from `/build` directory
- **Provides REST API** at `/api/*` endpoints  
- **Serves 3D models** from `/models` directory
- **Handles client-side routing** for the React SPA

## 📁 Volume Mounts

| Host Path | Container Path | Description |
|-----------|----------------|-------------|
| `./models` | `/app/models` | Your 3D model files (`.3mf` format) |
| `./data` | `/app/data` | Application data and configuration |

## 🔍 Management Commands

```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Update to latest image
docker-compose pull && docker-compose up -d

# Rebuild from source
docker-compose up -d --build

# Access container shell
docker-compose exec 3d-model-muncher sh
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Change HOST_PORT in .env file
echo "HOST_PORT=3002" >> .env
docker-compose up -d
```

### Models Not Loading
- Verify the models directory is properly mounted and contains `.3mf` files
- Check file permissions: `ls -la models/`
- Check container logs: `docker-compose logs`

### Container Won't Start
```bash
# Check detailed logs
docker-compose logs

# Verify environment file
cat .env

# Test with verbose output
docker-compose up
```

### Health Check Failed
The application includes a health check at `/api/health`. If failing:
```bash
# Test health endpoint manually
curl http://localhost:3000/api/health

# Check if the application is fully started
docker-compose logs 3d-model-muncher
```

## 🚢 Publishing to DockerHub

If you want to build and publish your own version:

```bash
# Build and tag
docker build -t yourusername/3d-model-muncher:latest .

# Login and push
docker login
docker push yourusername/3d-model-muncher:latest
```
