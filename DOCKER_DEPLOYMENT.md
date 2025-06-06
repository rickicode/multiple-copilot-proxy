# Docker Deployment Guide

Complete guide for deploying the Multi-Account Copilot API using Docker.

## 🐳 Quick Start

### Method 1: Docker Compose (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd copilot-api

# Create data directory for persistent storage
mkdir -p data

# Start the service
docker-compose up -d

# View logs
docker-compose logs -f copilot-api
```

### Method 2: Docker Build & Run
```bash
# Build the image
docker build -t copilot-api .

# Run the container
docker run -d \
  --name copilot-api \
  -p 4141:4141 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/static:/app/static:ro \
  copilot-api
```

## 📁 File Structure

### Required Files
```
copilot-api/
├── Dockerfile              # Multi-stage build config
├── docker-compose.yml      # Service orchestration
├── .dockerignore           # Build optimization
├── src/                    # Source code
├── static/                 # Web interface files
│   ├── manager.html        # Account management UI
│   └── test.html          # API testing interface
└── data/                   # Persistent data (auto-created)
    └── accounts.json       # Account storage
```

## 🔧 Configuration

### Environment Variables
```bash
# Production environment
NODE_ENV=production

# Data directory (auto-configured in Docker)
DATA_DIR=/app/data

# Optional: Custom port
PORT=4141
```

### Docker Compose Configuration
```yaml
services:
  copilot-api:
    build: .
    ports:
      - "4141:4141"
    volumes:
      - ./data:/app/data          # Persistent account storage
      - ./static:/app/static:ro   # Custom UI files (optional)
    environment:
      - NODE_ENV=production
      - DATA_DIR=/app/data
    restart: unless-stopped
```

## 🚀 Deployment Options

### Option 1: Standalone Deployment
```bash
# Start the service
docker-compose up -d copilot-api

# Access the manager
open http://localhost:4141/manager
```

### Option 2: With Reverse Proxy (Traefik)
```bash
# Start with Traefik proxy
docker-compose --profile proxy up -d

# Access via proxy
open http://copilot-api.localhost
```

### Option 3: Production with Custom Domain
```yaml
# docker-compose.override.yml
services:
  copilot-api:
    labels:
      - "traefik.http.routers.copilot-api.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.copilot-api.tls.certresolver=letsencrypt"
```

## 📊 Health Monitoring

### Health Check
The container includes built-in health monitoring:
```bash
# Check container health
docker-compose ps

# Manual health check
curl -f http://localhost:4141/manager/api/stats
```

### Logs
```bash
# View real-time logs
docker-compose logs -f copilot-api

# View recent logs
docker-compose logs --tail=100 copilot-api
```

## 💾 Data Persistence

### Account Data
- **Location**: `./data/accounts.json`
- **Mount**: `/app/data` in container
- **Format**: JSON with account configurations

### Backup Strategy
```bash
# Backup accounts
cp data/accounts.json accounts.backup.$(date +%Y%m%d_%H%M%S).json

# Restore accounts
cp accounts.backup.20241206_101500.json data/accounts.json
docker-compose restart copilot-api
```

## 🔒 Security Considerations

### Network Security
```yaml
# Restrict to internal network
services:
  copilot-api:
    networks:
      - internal
    expose:
      - "4141"
    # Remove 'ports' for internal-only access

networks:
  internal:
    internal: true
```

### Firewall Rules
```bash
# Allow only specific IPs
ufw allow from 192.168.1.0/24 to any port 4141

# Or use reverse proxy with SSL
ufw allow 80/tcp
ufw allow 443/tcp
```

## 🔄 Updates & Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

### Scale for High Availability
```yaml
# docker-compose.yml
services:
  copilot-api:
    deploy:
      replicas: 3
    volumes:
      - shared_data:/app/data  # Use shared storage

volumes:
  shared_data:
    driver: nfs  # Or other shared storage
```

## 🐛 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker-compose logs copilot-api

# Common fixes
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Permission Issues
```bash
# Fix data directory permissions
sudo chown -R $(id -u):$(id -g) data/
chmod 755 data/
```

#### Port Conflicts
```bash
# Use different port
docker-compose up -d -e "COPILOT_PORT=4142"

# Or edit docker-compose.yml
ports:
  - "4142:4141"
```

### Debug Mode
```bash
# Run with debug output
docker-compose run --rm copilot-api bun run dist/main.js start --verbose
```

## 📈 Performance Tuning

### Resource Limits
```yaml
services:
  copilot-api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Optimization
```bash
# Multi-stage build reduces image size
docker images copilot-api
# Should be < 100MB

# Use volume for faster rebuilds
docker-compose build --parallel
```

## 🌐 Production Deployment

### Complete Production Setup
```bash
# 1. Setup environment
mkdir -p /opt/copilot-api
cd /opt/copilot-api

# 2. Deploy application
git clone <repo> .
mkdir -p data

# 3. Configure production compose
cat > docker-compose.prod.yml << EOF
version: '3.8'
services:
  copilot-api:
    build: .
    restart: always
    ports:
      - "127.0.0.1:4141:4141"  # Bind to localhost only
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4141/manager/api/stats"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# 4. Start production service
docker-compose -f docker-compose.prod.yml up -d

# 5. Setup systemd service (optional)
sudo systemctl enable docker
sudo systemctl start docker
```

### Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/copilot-api
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:4141;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

This deployment setup provides a robust, scalable multi-account Copilot API service with proper data persistence and monitoring.
