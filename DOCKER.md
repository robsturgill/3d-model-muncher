# Docker Setup and Deployment Guide

## Architecture

The Docker container runs a single Node.js/Express server that:

1. **Serves the React frontend** from the `/build` directory (static files)
2. **Provides REST API endpoints** at `/api/*` for backend functionality
3. **Serves 3D model files** from the `/models` directory
4. **Handles client-side routing** by serving `index.html` for non-API routes

This is a **single-container solution** that combines both frontend and backend, making deployment simple and efficient.

## Quick Start with Docker

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [DockerHub account](https://hub.docker.com/) (for publishing)

### Local Development

#### Using Docker Compose (Recommended)
```bash
# Build and run the application
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# Stop the application
docker-compose down
```

#### Using Docker Commands
```bash
# Build the image
docker build -t 3d-model-muncher .

# Run the container
docker run -p 3000:3001 -v "$(pwd)/models:/app/models" 3d-model-muncher

# Run in detached mode
docker run -d -p 3000:3001 -v "$(pwd)/models:/app/models" --name 3d-model-muncher 3d-model-muncher
```

### Access the Application
- Open your browser and navigate to: http://localhost:3000
- The application serves both the frontend React app and backend API from a single container
- Your 3D models from the `models` folder will be accessible in the application
- The backend API is available at: http://localhost:3000/api/*

### Production Deployment

#### Using Pre-built Image from DockerHub
```bash
# Pull and run the latest version
docker run -p 3000:3001 -v "$(pwd)/models:/app/models" yourusername/3d-model-muncher:latest

# Using docker-compose with pre-built image
docker-compose -f docker-compose.prod.yml up -d
```

### Publishing to DockerHub

1. **Login to DockerHub:**
   ```bash
   docker login
   ```

2. **Tag your image:**
   ```bash
   docker tag 3d-model-muncher yourusername/3d-model-muncher:latest
   docker tag 3d-model-muncher yourusername/3d-model-muncher:v0.1.0
   ```

3. **Push to DockerHub:**
   ```bash
   docker push yourusername/3d-model-muncher:latest
   docker push yourusername/3d-model-muncher:v0.1.0
   ```

### Automated Publishing with GitHub Actions

The repository includes a GitHub Actions workflow that automatically builds and publishes Docker images to DockerHub when you push to the main branch or create tags.

#### Setup GitHub Secrets

In your GitHub repository settings, add these secrets:
- `DOCKERHUB_USERNAME`: Your DockerHub username
- `DOCKERHUB_TOKEN`: Your DockerHub access token (create one in DockerHub settings)

#### Triggering Builds

- **Push to main branch**: Creates a `latest` tag
- **Create a git tag**: Creates versioned tags (e.g., `git tag v1.0.0 && git push origin v1.0.0`)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3001` | Port for the server to listen on |

### Volume Mounts

| Host Path | Container Path | Description |
|-----------|----------------|-------------|
| `./models` | `/app/models` | Directory containing your 3D model files |
| `./config` | `/app/config` | Optional: Persistent configuration files |

### Health Check

The application includes a health check endpoint at `/api/health` that can be used to monitor the container status.

### Troubleshooting

#### Common Issues

1. **Port already in use:**
   ```bash
   # Change the host port
   docker run -p 3001:3001 -v "$(pwd)/models:/app/models" 3d-model-muncher
   ```

2. **Models not appearing:**
   - Ensure the models directory exists and contains `.3mf` files
   - Check volume mount path is correct
   - Verify file permissions

3. **Container won't start:**
   ```bash
   # Check logs
   docker logs 3d-model-muncher
   
   # Run interactively for debugging
   docker run -it 3d-model-muncher /bin/sh
   ```

4. **Frontend not loading (shows API only):**
   - Ensure the build directory exists in the container
   - Check that `npm run build` completed successfully during image build
   - Verify the server.js serves static files from the build directory

5. **API endpoints not working:**
   - Check that the backend utilities were compiled correctly
   - Ensure TypeScript files were built to dist-backend directory

### Multi-platform Support

The Docker image is built for multiple architectures:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, including Apple Silicon)

This ensures compatibility across different deployment environments.