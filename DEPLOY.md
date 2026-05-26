# Deploying InventoryPro School OS on a VPS

## Requirements

- Ubuntu 20.04+ / Debian 11+
- Node.js 18+ (20 LTS recommended)
- PostgreSQL 14+
- PM2 (`npm install -g pm2`)

---

## First-time Setup

### 1. Clone the repository

```bash
git clone https://github.com/guglaniarjun/inventorypro-next
cd inventorypro-next
```

### 2. Create your environment file

```bash
cp .env.example .env
nano .env
```

Fill in:

```
DATABASE_URL=postgresql://youruser:yourpassword@localhost:5432/inventorypro
SESSION_SECRET=some-random-string-at-least-32-characters-long
```

### 3. Create the database

```bash
sudo -u postgres psql -c "CREATE USER youruser WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE inventorypro OWNER youruser;"
```

### 4. Install dependencies and generate Prisma client

```bash
npm install
npx prisma generate
```

### 5. Push the database schema

```bash
npx prisma db push
```

### 6. Seed demo data

```bash
npm run db:seed
```

### 7. Build the app

```bash
npm run build
```

### 8. Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

The app runs on **port 3000** by default.

---

## Nginx Reverse Proxy (optional but recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/inventorypro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Updating the App

```bash
cd ~/inventorypro-next
git pull
npm install
npx prisma generate
npx prisma db push   # only if schema changed
npm run build
pm2 restart inventorypro-next
```

---

## Demo Login Credentials

| Role             | Username       | Password  |
|------------------|----------------|-----------|
| Platform Admin   | platformadmin  | admin123  |
| Tenant Admin     | admin          | admin123  |
| Physics Lab      | physicslab     | admin123  |
| Chemistry Lab    | chemistrylab   | admin123  |
| Kitchen          | kitchen        | admin123  |
| Auditor          | auditor        | admin123  |

---

## Useful PM2 Commands

```bash
pm2 status                        # check app status
pm2 logs inventorypro-next        # view live logs
pm2 restart inventorypro-next     # restart
pm2 stop inventorypro-next        # stop
pm2 delete inventorypro-next      # remove from PM2
```
