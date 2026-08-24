# 🚀 Ubuntu 24.04 LTS Deployment Guide

This guide provides step-by-step instructions to deploy the TaskTracker project on an Ubuntu 24.04 LTS server.

---

## 📌 Deployment Overview

- **Server IP**: `160.187.169.41`
- **Frontend URL**: `https://160.187.169.41/Dr.Meghana`
- **Backend API URL**: `https://160.187.169.41/megha/api`
- **Backend Base URL**: `https://160.187.169.41/megha`
- **Image Uploads Path**: `/megha/uploads/` (Stored locally on server disk, **Cloudinary disabled**)
- **Source Maps**: **Disabled** (`sourcemap: false`)

---

## 1. System Requirements & Preparation

Run the following commands on your Ubuntu 24.04 LTS server:

```bash
# Update package repositories
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS and Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git build-essential

# Install PM2 globally to keep backend running continuously
sudo npm install -g pm2
```

Verify Node.js installation:
```bash
node -v   # Should output v20.x.x
npm -v    # Should output v10.x.x
```

---

## 2. Directory Structure Setup

Create directories for hosting the frontend build and backend code:

```bash
# Create directory for frontend dist build
sudo mkdir -p /var/www/dr-meghana/dist

# Create directory for backend code
sudo mkdir -p /var/www/megha-backend

# Assign ownership to current user
sudo chown -R $USER:$USER /var/www/dr-meghana
sudo chown -R $USER:$USER /var/www/megha-backend
```

---

## 3. Backend Deployment (`/megha`)

### Step 3.1: Copy Backend Files
Copy the backend project files to `/var/www/megha-backend`.

### Step 3.2: Install Dependencies
```bash
cd /var/www/megha-backend
npm install --production
```

### Step 3.3: Configure `.env` File
Create or update `/var/www/megha-backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://jashwanthannavarapu99_db_user:42974297@cluster2.fytx2uj.mongodb.net/test?appName=Cluster2
ADMIN_PIN=9999
FRONTEND_URL=https://160.187.169.41/Dr.Meghana
BACKEND_URL=https://160.187.169.41/megha
USE_CLOUDINARY=false
ADMIN_PHONE_NUMBER=+918374994997
```

### Step 3.4: Setup Local Uploads Directory
Create the `uploads/` directory on the server disk and set appropriate permissions:

```bash
mkdir -p /var/www/megha-backend/uploads
chmod -R 777 /var/www/megha-backend/uploads
```

### Step 3.5: Start Backend Process with PM2
```bash
cd /var/www/megha-backend
pm2 start server.js --name "megha-backend"
pm2 save
pm2 startup
```

Check process status:
```bash
pm2 status
```

---

## 4. Frontend Deployment (`/Dr.Meghana`)

### Step 4.1: Build Frontend Locally or on Server
Inside the `frontend` folder:

```bash
cd /path/to/frontend

# Ensure production environment variables
npm run build
```

The build output will be generated inside `frontend/dist`.

### Step 4.2: Copy Dist Files to Web Server Path
```bash
# Copy all contents of frontend/dist to /var/www/dr-meghana/dist
cp -r /path/to/frontend/dist/* /var/www/dr-meghana/dist/
```

Set permissions:
```bash
sudo chown -R www-data:www-data /var/www/dr-meghana
sudo chmod -R 755 /var/www/dr-meghana
```

---

## 5. Nginx Reverse Proxy Configuration

### Step 5.1: Copy Nginx Configuration
Create `/etc/nginx/sites-available/dr-meghana`:

```bash
sudo nano /etc/nginx/sites-available/dr-meghana
```

Paste the following configuration (also available in [`nginx.conf`](file:///c:/Users/banda/Desktop/Tasktracker/nginx.conf)):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 160.187.169.41;

    client_max_body_size 50M;

    # 1. FRONTEND (/Dr.Meghana)
    location /Dr.Meghana/ {
        alias /var/www/dr-meghana/dist/;
        index index.html;
        try_files $uri $uri/ /Dr.Meghana/index.html;

        location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }
    }

    location = /Dr.Meghana {
        return 301 /Dr.Meghana/;
    }

    # 2. BACKEND (/megha)
    location /megha/ {
        proxy_pass http://127.0.0.1:5000/megha/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Default redirect to /Dr.Meghana/
    location = / {
        return 301 /Dr.Meghana/;
    }
}
```

### Step 5.2: Enable Site & Restart Nginx
```bash
# Enable site configuration
sudo ln -sf /etc/nginx/sites-available/dr-meghana /etc/nginx/sites-enabled/

# Remove default nginx site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 6. Verification Checklist

1. **Frontend**: Open browser to `https://160.187.169.41/Dr.Meghana` (or `http://160.187.169.41/Dr.Meghana`).
2. **Backend Health Check**: Open `https://160.187.169.41/megha/api/health` -> Should return JSON status `"ONLINE"`.
3. **Local Uploads**: Upload a task image from frontend -> Image should save to `/var/www/megha-backend/uploads/` and display correctly via `https://160.187.169.41/megha/uploads/<filename>`.
4. **Source Maps**: Verify no `.map` files exist in `/var/www/dr-meghana/dist/assets/`.
