# 3D Model Muncher - Unraid Setup Guide

## 🚀 **Quick Setup (Recommended)**

### **Method 1: Using Docker Compose (Easiest)**

1. **SSH into your Unraid server** or use the terminal in the Unraid web interface

2. **Create a project directory:**
   ```bash
   mkdir -p /mnt/user/appdata/3d-model-muncher
   cd /mnt/user/appdata/3d-model-muncher
   ```

3. **Create the docker-compose file:**
   ```bash
   wget https://raw.githubusercontent.com/robsturgill/3d-model-muncher/main/docker-compose.unraid.yml -O docker-compose.yml
   ```
   
   Or manually create `docker-compose.yml` with the Unraid-optimized configuration.

4. **Create your models directory:**
   ```bash
   mkdir -p /mnt/user/3d-models
   ```

5. **Start the container:**
   ```bash
   docker-compose up -d
   ```

6. **Access the app:**
   Open `http://YOUR_UNRAID_IP:3001` in your browser

### **Method 2: Unraid Docker Web Interface**

1. **Go to Docker tab** in Unraid web interface
2. **Click "Add Container"**
3. **Fill in these settings:**

   | Setting | Value |
   |---------|-------|
   | **Name** | `3d-model-muncher` |
   | **Repository** | `your-dockerhub-username/3d-model-muncher:latest` |
   | **Network Type** | `Bridge` |
   | **Console shell command** | `sh` |

4. **Port Mappings:**
   - **Container Port:** `3001`
   - **Host Port:** `3001`
   - **Connection Type:** `TCP`

5. **Volume Mappings:**
   - **Container Path:** `/app/models` → **Host Path:** `/mnt/user/3d-models`
   - **Container Path:** `/app/data` → **Host Path:** `/mnt/user/appdata/3d-model-muncher`

6. **Environment Variables:**
   - `NODE_ENV` = `production`
   - `PUID` = `99`
   - `PGID` = `100`
   - `TZ` = `America/New_York` (your timezone)

## 📁 **Directory Structure on Unraid**

```
/mnt/user/
├── 3d-models/                    # Your 3D model files (.3mf, .stl)
│   ├── miniatures/
│   ├── tools/
│   └── ...
├── appdata/
│   └── 3d-model-muncher/        # App configuration and data
│       ├── config/
│       ├── thumbnails/
│       └── logs/
```

## 🔧 **Configuration**

### **1. Models Directory Setup**
Place your 3D model files in `/mnt/user/3d-models/` or any share you prefer:

```bash
# Example structure
/mnt/user/3d-models/
├── miniatures/
│   ├── dragon.3mf
│   └── warrior.3mf
├── tools/
│   ├── wrench.3mf
│   └── bracket.stl
└── household/
    ├── vase.3mf
    └── hook.3mf
```

### **2. Permissions**
Ensure proper permissions for the app to read/write files:

```bash
chown -R nobody:users /mnt/user/3d-models
chown -R nobody:users /mnt/user/appdata/3d-model-muncher
chmod -R 755 /mnt/user/3d-models
chmod -R 755 /mnt/user/appdata/3d-model-muncher
```

### **3. Network Access**
- **Local Network:** `http://UNRAID-IP:3001`
- **Reverse Proxy:** Set up nginx or Cloudflare tunnel for external access

## 🎯 **Building Your Own Docker Image**

If you want to build the image yourself:

1. **Clone the repository:**
   ```bash
   cd /mnt/user/appdata
   git clone https://github.com/robsturgill/3d-model-muncher.git
   cd 3d-model-muncher
   ```

2. **Build the Docker image:**
   ```bash
   docker build -f Dockerfile.unraid -t 3d-model-muncher:latest .
   ```

3. **Run the container:**
   ```bash
   docker run -d \
     --name 3d-model-muncher \
     -p 3001:3001 \
     -v /mnt/user/3d-models:/app/models \
     -v /mnt/user/appdata/3d-model-muncher:/app/data \
     -e NODE_ENV=production \
     -e PUID=99 \
     -e PGID=100 \
     --restart unless-stopped \
     3d-model-muncher:latest
   ```

## 📊 **Monitoring & Maintenance**

### **Check Container Status**
```bash
docker ps -a | grep 3d-model-muncher
docker logs 3d-model-muncher
```

### **Health Check**
The container includes a health check endpoint:
```bash
curl http://localhost:3001/api/health
```

### **Updates**
```bash
cd /mnt/user/appdata/3d-model-muncher
docker-compose pull
docker-compose up -d
```

## 🔗 **Integration with Unraid**

### **1. Unraid Shares**
- Create dedicated shares for `3d-models` and `3d-model-backups`
- Set appropriate user permissions for Docker containers

### **2. Backup Strategy**
```bash
# Backup script for User Scripts plugin
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "/mnt/user/Backups/3d-model-muncher_$DATE.tar.gz" \
  /mnt/user/appdata/3d-model-muncher \
  /mnt/user/3d-models
```

### **3. Reverse Proxy (nginx)**
If using nginx proxy manager:
```nginx
location / {
    proxy_pass http://UNRAID-IP:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## ⚠️ **Troubleshooting**

### **Common Issues:**

1. **Permission Denied:**
   ```bash
   docker exec -it 3d-model-muncher ls -la /app/models
   # Should show files owned by abc:users
   ```

2. **Port Already in Use:**
   ```bash
   netstat -tulpn | grep :3001
   # Change host port if needed: -p 3002:3001
   ```

3. **Models Not Loading:**
   - Check if models directory is properly mounted
   - Verify file permissions
   - Check container logs: `docker logs 3d-model-muncher`

4. **Container Won't Start:**
   ```bash
   docker logs 3d-model-muncher
   # Check for missing dependencies or configuration errors
   ```

### **Useful Commands:**
```bash
# Restart container
docker restart 3d-model-muncher

# Access container shell
docker exec -it 3d-model-muncher sh

# View real-time logs
docker logs -f 3d-model-muncher

# Remove and recreate container
docker-compose down && docker-compose up -d
```

## 🌐 **External Access**

### **Option 1: Port Forwarding**
- Forward port 3001 on your router to Unraid IP
- Access via `http://your-external-ip:3001`

### **Option 2: Cloudflare Tunnel**
- More secure, no port forwarding needed
- Follow Cloudflare's documentation for setup

### **Option 3: VPN**
- Use WireGuard or OpenVPN server on Unraid
- Access securely from anywhere

## 📱 **Mobile Access**

The application is fully responsive and works great on mobile devices. Add it to your phone's home screen for easy access to your 3D model library!

---

**Happy 3D printing! 🖨️**
