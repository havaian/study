# Nginx Configuration Guide for E-polyclinic.uz

This guide explains the Nginx setup for the E-polyclinic.uz platform.

## Overview

Our setup uses two Nginx instances:

1. **Main Nginx** - Acts as the primary reverse proxy, handling all external traffic
2. **Frontend Nginx** - Internal to the frontend container, just serves the Vue.js app

## Directory Structure

```
project-root/
├── nginx/                     # Main Nginx configs
│   ├── nginx.conf             # Global Nginx settings
│   ├── conf.d/                # Site configs
│   │   └── e-polyclinic.uz.conf     # E-polyclinic.uz domain config
│   └── ssl/                   # SSL certificates
└── frontend/
    └── nginx.conf             # Frontend container Nginx config
```

## How Traffic Flows

1. User requests e-polyclinic.uz
2. Main Nginx receives the request
3. Nginx routes the request:
   - `/api/*` → Backend service
   - `/socket.io/*` → Backend service
   - `/telegram` → Backend service
   - Everything else → Frontend container

## Setup Instructions

### 1. Create Required Directories

```bash
mkdir -p nginx/conf.d nginx/ssl
```

### 2. Copy Configuration Files

```bash
# Copy main Nginx configuration
cp nginx.conf nginx/nginx.conf

# Copy e-polyclinic.uz configuration
cp e-polyclinic.uz.conf nginx/conf.d/e-polyclinic.uz.conf

# Copy frontend Nginx configuration
cp frontend-nginx.conf frontend/nginx.conf
```

### 3. Configure Docker Compose

Make sure your `docker-compose.yml` includes the Nginx service with the correct volume mappings as shown in the updated docker-compose file.

### 4. Start the Services

```bash
docker-compose up -d
```

## SSL Configuration

For production, you should enable SSL:

1. Get SSL certificates for e-polyclinic.uz
2. Place them in `nginx/ssl/`
3. Uncomment the HTTPS server block in `nginx/conf.d/e-polyclinic.uz.conf`
4. Restart Nginx:
   ```bash
   docker-compose restart nginx
   ```

## Troubleshooting

### Check Nginx Logs

```bash
# View main Nginx logs
docker-compose logs nginx

# View frontend Nginx logs
docker-compose logs frontend
```

### Test Nginx Configuration

```bash
docker-compose exec nginx nginx -t
```

### Restart Nginx

```bash
docker-compose restart nginx
```