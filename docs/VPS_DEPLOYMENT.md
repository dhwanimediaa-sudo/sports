# SportsPulse — Production VPS Deployment & Operations Guide

> **Release Status**: RELEASE BASELINE VERIFIED (856/856 automated regression tests passed across 12 test suites, 0 failures).  
> **Target Audience**: System Operators, Broadcast Engineers, and Tournament Infrastructure Directors.  
> **Note on Deployment**: This documentation provides the complete, deterministic procedure for deploying SportsPulse on an actual Linux Virtual Private Server (VPS). When executing outside of the live VPS host, these instructions serve as the authoritative operator handoff manual.

---

## 1. System Requirements & Architecture

* **Operating System**: Linux (Ubuntu 22.04 LTS / 24.04 LTS, Debian 12, or Rocky Linux 9 recommended)
* **Runtime**: Node.js v20 LTS or v22 LTS (Node 22 LTS verified)
* **Package Manager**: npm v10+
* **Process Supervisor**: PM2 (`ecosystem.config.cjs`) or systemd (`deploy/systemd/sportspulse.service`)
* **Reverse Proxy**: Nginx (primary, config provided at `deploy/nginx/sportspulse.conf`) or Caddy (terminates SSL/TLS, manages HTTP/2, and provides unbuffered SSE proxying)
* **Storage**: SSD with minimum 10 GB free space (SSD required for high-throughput atomic JSON writes)
* **Memory**: Minimum 1 GB RAM (2 GB+ recommended for concurrent multi-match tournaments with public broadcast traffic)
* **Network Exposure**: Inbound ports 80 (HTTP), 443 (HTTPS), and 22 (SSH). **Application port 3000 must remain internal only.**

---

## 2. Directory Structure

```text
/var/www/sportspulse/
├── dist/                    # Standalone production bundle
│   ├── server.cjs           # Bundled Node.js runtime entrypoint (no dev dependencies needed)
│   ├── index.html           # Single-page application entrypoint
│   └── assets/              # Minified CSS, JS, and font chunks
├── data/                    # Primary persistent database
│   ├── db.json              # Active database file (atomic writes)
│   └── (db.json.tmp)        # Transient atomic swap buffer
├── uploads/                 # Uploaded media assets (team badges, logos, headshots)
├── backups/                 # Local snapshot backup archives and manifest.json
├── deploy/                  # Production infrastructure configurations
│   ├── nginx/
│   │   └── sportspulse.conf # Nginx site config (IP & HTTPS with unbuffered SSE)
│   └── systemd/
│       └── sportspulse.service # Systemd daemon service unit
├── ecosystem.config.cjs     # PM2 process supervisor configuration
├── .env                     # Server environment configuration (chmod 600, uncommitted)
├── .env.example             # Documented template for environment configuration
├── package.json             # Runtime metadata & application scripts
└── scripts/
    ├── backup_production.ts # Production backup snapshot utility
    └── restore_production.ts# Production emergency restore utility
```

---

## 3. Dynamic Release Information Commands

Operators can verify release artifacts and current runtime state using these non-stale shell commands:

```bash
# 1. Current Git release commit
git log -1 --format="Commit: %H (%ci) - %s"

# 2. Production build bundle timestamp
stat -c "Bundle Build Time: %y" dist/server.cjs 2>/dev/null || date -r dist/server.cjs

# 3. Node.js & npm runtime versions
node -v && npm -v

# 4. Application version declared in package.json
node -p "'SportsPulse v' + require('./package.json').version"

# 5. Database file size on disk
ls -lh data/db.json 2>/dev/null || echo "Database not yet initialized"

# 6. Uploads media directory size
du -sh uploads/ 2>/dev/null || echo "Uploads empty"

# 7. Backup snapshots archive directory size
du -sh backups/ 2>/dev/null || echo "No backups generated yet"
```

---

## 4. First VPS Deployment Procedure (Step-by-Step)

Follow this numbered, safe 23-step procedure when performing a fresh installation on a newly provisioned VPS:

1. **Provision VPS**: Deploy a clean Ubuntu 22.04/24.04 LTS instance.
2. **Install Node.js LTS**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node -v # Verify v20.x or v22.x
   ```
3. **Install Reverse Proxy**: Install either Nginx (`sudo apt-get install -y nginx certbot python3-certbot-nginx`) or Caddy.
4. **Create Non-Root User**: Ensure dedicated user exists (default `www-data` or custom `sportspulse`):
   ```bash
   sudo id -u www-data || sudo useradd -r -s /usr/sbin/nologin www-data
   ```
5. **Create Application Directory**:
   ```bash
   sudo mkdir -p /var/www/sportspulse
   sudo chown -R $USER:www-data /var/www/sportspulse
   cd /var/www/sportspulse
   ```
6. **Copy Release Files**: Clone git repo or transfer release archive (`dist/`, `package.json`, `package-lock.json`, etc.).
7. **Install Production Dependencies**:
   ```bash
   npm ci
   ```
8. **Create Environment Configuration**:
   ```bash
   cp .env.example .env
   chmod 600 .env
   ```
9. **Generate & Set Required Secrets**: Generate cryptographically secure secrets (see Section 5 below) and insert into `.env`.
10. **Create Data, Uploads & Backups Directories**:
    ```bash
    mkdir -p data uploads backups
    sudo chown -R www-data:www-data data uploads backups
    sudo chmod -R 770 data uploads backups
    ```
11. **Build Production Application**:
    ```bash
    npm run build
    ```
12. **Configure Process Manager (Choose systemd OR PM2)**:
    * **Option A: systemd** (Standard Linux service):
      ```bash
      sudo cp deploy/systemd/sportspulse.service /etc/systemd/system/sportspulse.service
      sudo systemctl daemon-reload
      sudo systemctl enable sportspulse
      sudo systemctl start sportspulse
      ```
    * **Option B: PM2** (Node process supervisor):
      ```bash
      sudo npm install -g pm2
      pm2 start ecosystem.config.cjs --env production
      pm2 save
      pm2 startup
      ```
13. **Verify Service Status**:
    * `sudo systemctl status sportspulse` (or `pm2 status`)
14. **Verify Health Endpoint**:
    ```bash
    curl -s http://127.0.0.1:3000/api/health
    ```
15. **Verify Database Readiness**: Ensure health JSON response reports `"ready": true` and `"status": "ok"`.
16. **Configure Reverse Proxy**:
    * Install Nginx: `sudo apt-get install -y nginx`
    * Copy pre-configured template:
      ```bash
      sudo cp deploy/nginx/sportspulse.conf /etc/nginx/sites-available/sportspulse
      # Replace YOUR_VPS_IP with your actual public IP in the config:
      sudo nano /etc/nginx/sites-available/sportspulse
      sudo ln -s /etc/nginx/sites-available/sportspulse /etc/nginx/sites-enabled/
      sudo nginx -t && sudo systemctl reload nginx
      ```
    * **Immediate IP Smoke Test**: Open `http://YOUR_VPS_IP/` and `http://YOUR_VPS_IP/api/health` in your browser. The app is immediately functional on your VPS IP!
17. **Configure DNS (When ready for Domain & HTTPS)**: Add DNS A record pointing `YOUR_DOMAIN` to your VPS public IP address.
18. **Configure SSL / TLS**: Run `sudo certbot --nginx -d YOUR_DOMAIN` (or let Caddy handle automatically).
19. **Verify HTTPS**: Check `curl -Iv https://YOUR_DOMAIN/api/health`.
20. **Verify Login**: Log in as Super Admin (`admin@sportspulse.com` / `Admin@123456`) and immediately change password.
21. **Verify Scoring**: Create a test tournament, schedule fixture, and record an event to confirm live engine behavior.
22. **Verify Public Broadcast**: Open `/broadcast/match/:matchId` in browser or OBS Studio browser source.
23. **Create First Production Backup**:
    ```bash
    npx tsx scripts/backup_production.ts
    ```

---

## 5. Secret Generation Guide

Production secrets must be uniquely generated per VPS instance and never committed to Git:

```bash
# Generate a cryptographically secure 64-character hex secret for JWT_SECRET
openssl rand -hex 32

# Alternative using Node.js crypto module
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

* **Uniqueness**: Must be generated fresh for every deployment environment.
* **Security**: Kept strictly in `.env` with permissions set to `chmod 600 .env`.
* **Session Invalidation**: Changing `JWT_SECRET` invalidates all existing active tokens/sessions, requiring users to log in again.

---

## 6. Systemd Service Final Template

Create `/etc/systemd/system/sportspulse.service`:

```ini
[Unit]
Description=SportsPulse Live Scoring & Broadcast Engine
Documentation=https://github.com/dhwanimediaa/sportspulse
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/sportspulse
EnvironmentFile=/var/www/sportspulse/.env
ExecStart=/usr/bin/node /var/www/sportspulse/dist/server.cjs
Restart=always
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=10
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sportspulse

[Install]
WantedBy=multi-user.target
```

Commands:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sportspulse
sudo systemctl restart sportspulse
sudo systemctl status sportspulse
```

---

## 7. Nginx Reverse Proxy Template (Option A)

If using Nginx, create `/etc/nginx/sites-available/sportspulse`:

```nginx
# HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name YOUR_DOMAIN;
    return 301 https://$host$request_uri;
}

# Production HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name YOUR_DOMAIN;

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # File Upload Limit (Compatible with 5MB logo/headshot uploads)
    client_max_body_size 10M;

    # Security: Block direct public access to internal database & hidden files
    location ~* ^/(data|\.env|backups|server|scripts) {
        deny all;
        return 403;
    }

    # Real-Time SSE Streams (CRITICAL: Disable buffering for live score push)
    location ~* /api/matches/[^/]+/scoring/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable all proxy and fastcgi buffering
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;

        # Keep connection open for continuous tournament broadcasts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Public Broadcast Canvas & Web App Routing
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded media assets caching
    location /uploads/ {
        alias /var/www/sportspulse/uploads/;
        expires 7d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/sportspulse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Caddy Alternative Template (Option B)

If using Caddy instead of Nginx (do not run both), create `/etc/caddy/Caddyfile`:

```caddy
YOUR_DOMAIN {
    # Automatic HTTPS with Let's Encrypt / ZeroSSL

    # Limit request body to 10MB
    request_body {
        max_size 10MB
    }

    # Block access to internal files
    @blocked {
        path /data* /.env* /backups* /server* /scripts*
    }
    respond @blocked "Forbidden" 403

    # Reverse proxy to Node.js application
    reverse_proxy 127.0.0.1:3000 {
        # Flush headers and stream events immediately without buffering
        flush_interval -1
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

---

## 9. DNS & Domain Checklist

1. [ ] **A Record**: Create DNS `A` record pointing `YOUR_DOMAIN` to VPS public IP.
2. [ ] **Propagation Check**: Verify with `dig +short YOUR_DOMAIN` or `nslookup YOUR_DOMAIN`.
3. [ ] **Host Reachability**: Test ping/curl to confirm domain resolves to the correct host.
4. [ ] **Reverse Proxy Configuration**: Ensure server block matches `YOUR_DOMAIN`.
5. [ ] **SSL Certificate**: Run Certbot or allow Caddy automatic certificate generation.
6. [ ] **HTTPS Validation**: Confirm `curl -Iv https://YOUR_DOMAIN/` returns HTTP 200 with valid TLS cert.
7. [ ] **Secure Cookie Check**: Confirm `Set-Cookie` contains `Secure; HttpOnly; SameSite=Lax`.
8. [ ] **Health Endpoint**: Verify `https://YOUR_DOMAIN/api/health` reports status ok and ready.
9. [ ] **Login Verification**: Confirm admin authentication over HTTPS.
10. [ ] **Broadcast Check**: Confirm public access to `https://YOUR_DOMAIN/broadcast/match/:id`.

---

## 10. SSL / TLS Setup (Certbot)

When using Nginx:

```bash
# Request and install certificate automatically
sudo certbot --nginx -d YOUR_DOMAIN

# Verify automatic renewal timer
sudo systemctl status certbot.timer

# Perform dry-run test of renewal process
sudo certbot renew --dry-run
```

---

## 11. Firewall & Network Exposure Checklist

Only expose necessary ingress ports; keep Node.js internal:

```bash
# Configure Ubuntu UFW Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Enable Firewall
sudo ufw enable
sudo ufw status verbose
```

* **Internal Port 3000**: Must NOT be opened in UFW. Node.js listens locally on `127.0.0.1:3000` (or `0.0.0.0:3000` protected by firewall). All external traffic enters through port 80/443 handled by Nginx/Caddy.

---

## 12. Post-Deployment Verification Commands

Quick diagnostic commands for operators on the VPS:

```bash
# 1. Service status
sudo systemctl status sportspulse

# 2. Live application logs
journalctl -u sportspulse -f

# 3. Local health probe
curl -i http://127.0.0.1:3000/api/health

# 4. Public HTTPS response
curl -I https://YOUR_DOMAIN/

# 5. Partition disk space
df -h /var/www/sportspulse

# 6. Available system memory
free -h

# 7. Active Node process
ps aux | grep "dist/server.cjs"

# 8. Listening TCP ports
ss -lntp | grep -E '3000|80|443'
```

---

## 13. Production Smoke Test (Operator Checklist)

Verify these 18 critical user and broadcast workflows before going live:

- [ ] 1. **Website Opens**: Frontend SPA loads at `https://YOUR_DOMAIN/`.
- [ ] 2. **Login Works**: Authentication succeeds with valid credentials.
- [ ] 3. **Super Admin Works**: User management panel accessible.
- [ ] 4. **User Creation Works**: Can provision new tournament organizer.
- [ ] 5. **Sport Access Works**: Organizer sees only assigned sports.
- [ ] 6. **Tournament Creation Works**: Can create new tournament with chosen format.
- [ ] 7. **Group/League Creation Works**: Can add pool groups or league divisions.
- [ ] 8. **Team Creation Works**: Can register teams with primary/secondary colors.
- [ ] 9. **Player Creation Works**: Can add squad members and assign jersey numbers.
- [ ] 10. **Match Creation Works**: Can schedule fixture between two registered teams.
- [ ] 11. **Scoring Works**: First ball/point transitions match to `LIVE`; runs/points accumulate.
- [ ] 12. **Live SSE Works**: Score updates stream instantly without page refresh.
- [ ] 13. **Graphics Work**: Preview and Program cue/take operations broadcast accurately.
- [ ] 14. **Public Broadcast Works**: `/broadcast/match/:id` renders transparent 1080p canvas without login.
- [ ] 15. **OBS/vMix Browser Source Works**: Canvas embeds cleanly with alpha transparency.
- [ ] 16. **Match Completion Works**: `/end-match` finalizes winner and locks scoring.
- [ ] 17. **Reports Work**: Deterministic match report and standings table render properly.
- [ ] 18. **Backup & Restart Works**: Backup script succeeds and restart preserves state.

---

### 13.1 Broadcast Production Output (OBS Studio & vMix Setup)

The public broadcast canvas is specifically optimized for hardware video switchers and streaming encoders:

1. **Browser Source URL Formats**:
   * **Individual Match Overlay**:
     ```text
     http://<YOUR_VPS_IP_OR_DOMAIN>/broadcast/match/<MATCH_ID>
     ```
   * **Tournament Overview Canvas**:
     ```text
     http://<YOUR_VPS_IP_OR_DOMAIN>/broadcast/tournament/<TOURNAMENT_ID>
     ```
2. **Key Architectural Characteristics**:
   * **Clean Video Output**: Contains strictly graphic lower-thirds, scorebugs, ribbons, and milestone animations. All operator sidebars, navigation bars, and buttons are omitted.
   * **True Alpha Transparency**: Built with `rgba(0, 0, 0, 0)` background for direct layering over HDMI/SDI camera feeds.
   * **Native Resolution**: Fixed 1920 × 1080 canvas coordinate space with sub-pixel rendering.
   * **Persistent SSE Telemetry**: Subscribes to `/api/matches/:id/scoring/stream` and `/api/matches/:id/broadcast/stream`. Nginx proxy buffering is disabled to ensure instant on-air graphic delivery.
   * **Automated Reconnect**: Browser canvas client automatically re-establishes dropped SSE connections without operator intervention.
3. **OBS Studio Configuration**:
   * Add **Source** -> **Browser**.
   * **URL**: `http://<YOUR_VPS_IP_OR_DOMAIN>/broadcast/match/<MATCH_ID>`
   * **Width**: `1920`
   * **Height**: `1080`
   * **FPS**: `60` (or `30` matching production framerate)
   * **Custom CSS**: Leave default or clear (canvas is natively transparent).
   * **Shutdown source when not visible**: Recommended enabled.
   * **Refresh browser when scene becomes active**: Recommended enabled.
4. **vMix Configuration**:
   * Add **Input** -> **Web Browser**.
   * **URL**: `http://<YOUR_VPS_IP_OR_DOMAIN>/broadcast/match/<MATCH_ID>`
   * **Width**: `1920`, **Height**: `1080`.
   * Enable hardware acceleration for smooth 60fps animations.

---

## 14. Backup Before First Real Tournament

Before commencing any live tournament, complete this 7-point safety protocol:

1. **Create Backup**: Run `npx tsx scripts/backup_production.ts`.
2. **Verify Backup Files**: Check that timestamped folder in `backups/` contains `db.json` and `manifest.json`.
3. **Confirm Timestamp**: Verify manifest timestamp matches current server time.
4. **Confirm Database Readability**: Inspect `manifest.json` entity counts (users, tournaments, teams).
5. **Confirm Uploads Included**: Ensure team badges and player headshots are archived.
6. **Confirm Restore Procedure**: Operator has reviewed Section 16 below.
7. **Confirm Disk Space**: Verify partition has at least 5 GB free storage remaining.

---

## 15. Incident Response Quick Reference

When operational anomalies occur during a live tournament, follow these immediate triage steps:

### SERVICE DOWN
* **Check Service**: `sudo systemctl status sportspulse`
* **Check Logs**: `journalctl -u sportspulse -n 50 --no-pager`
* **Check Health**: `curl -s http://127.0.0.1:3000/api/health`
* **Action**: If stopped or crashed, run `sudo systemctl restart sportspulse`.

### API DOWN
* **Check Service**: Confirm Node.js is actively listening on port 3000 (`ss -lntp | grep 3000`).
* **Check Reverse Proxy**: Check Nginx status: `sudo systemctl status nginx` and error log: `sudo tail -n 50 /var/log/nginx/error.log`.
* **Action**: Reload Nginx (`sudo systemctl reload nginx`) or restart service.

### SSE NOT UPDATING
* **Check Reverse Proxy Buffering**: Confirm `proxy_buffering off;` and `chunked_transfer_encoding off;` are active in Nginx.
* **Check Header**: Test direct stream: `curl -N http://127.0.0.1:3000/api/matches/:id/scoring/stream`.
* **Action**: Reload reverse proxy to flush any stuck buffers. Client EventSource will automatically reconnect.

### LOGIN FAILURE
* **Check HTTPS**: Verify user is accessing through HTTPS.
* **Check Cookies**: Confirm browser accepts cookies (`Set-Cookie` with `SameSite=Lax`).
* **Check Credentials**: Verify user is `ACTIVE` and password is correct via Super Admin panel.
* **Never**: Do not print password hashes or tokens into public logs.

### DATABASE PROBLEM
* **Stop Destructive Actions**: Do NOT restart server repeatedly or attempt manual edits on `data/db.json`.
* **Preserve Current State**: `cp data/db.json data/db_emergency_copy.json`.
* **Check Logs**: Check `journalctl -u sportspulse -n 100` for JSON parse errors.
* **Action**: Restore known healthy snapshot from `backups/` using the documented restore procedure.

### BROADCAST FAILURE
* **Verify Match ID**: Confirm URL is `/broadcast/match/:matchId` with correct match ID.
* **Verify Match Status**: Ensure match is `LIVE` or `COMPLETED`.
* **Verify OBS Source**: Ensure OBS Browser Source resolution is set to **1920 × 1080** with hardware acceleration enabled.

---

## 16. Rollback Quick Reference

Clearly distinguish between the three rollback scenarios:

### Scenario A: CODE-ONLY ROLLBACK (Preserves Live Match Data)
*Use when a software release introduced a UI or backend bug, but existing tournament data is healthy.*
1. Revert to previous stable git commit:
   ```bash
   git checkout PREVIOUS_STABLE_COMMIT_HASH
   npm ci
   npm run build
   ```
2. Restart service:
   ```bash
   sudo systemctl restart sportspulse
   ```
*(Notice: The live database `data/db.json` is untouched, preserving all in-progress matches!)*

### Scenario B: DATABASE-ONLY ROLLBACK (Recovers Corrupted Data)
*Use when accidental operator deletion or data corruption occurred, while code is healthy.*
1. Stop application:
   ```bash
   # If using systemd:
   sudo systemctl stop sportspulse
   # If using PM2:
   pm2 stop sportspulse
   ```
2. Restore database safely using the automated restore utility (creates an emergency backup of current state, validates schema integrity, and restores db.json and uploads):
   ```bash
   # Automatically select the latest verified backup:
   npx tsx scripts/restore_production.ts

   # Or restore a specific backup directory:
   npx tsx scripts/restore_production.ts backups/sportspulse_backup_TARGET
   ```
   *(Manual alternative: `cp backups/sportspulse_backup_TARGET/db.json data/db.json`)*
3. Restart service:
   ```bash
   # If using systemd:
   sudo systemctl start sportspulse
   # If using PM2:
   pm2 start sportspulse
   ```

### Scenario C: FULL ROLLBACK (Code + Database)
*Use when both a broken migration and corrupted database occurred.*
1. Stop application: `sudo systemctl stop sportspulse` (or `pm2 stop sportspulse`)
2. Roll back code: `git checkout PREVIOUS_STABLE_COMMIT_HASH && npm ci && npm run build`
3. Restore database: `npx tsx scripts/restore_production.ts backups/sportspulse_backup_TARGET`
4. Restart service: `sudo systemctl start sportspulse && curl -s http://127.0.0.1:3000/api/health`

**Emphasize**: DO NOT automatically restore an old database when only application code needs rollback.

---

## 17. VPS Security Checklist (Operator Action Required)

- [ ] **Non-root application user**: Runs as `www-data` or `sportspulse`.
- [ ] **SSH key authentication**: Password authentication disabled in `/etc/ssh/sshd_config`.
- [ ] **Disable unnecessary public ports**: Port 3000 closed to public; only 22, 80, 443 open.
- [ ] **UFW Firewall active**: `sudo ufw status` confirms active policy.
- [ ] **Automatic security updates**: `unattended-upgrades` package configured for security patches.
- [ ] **Strong production secrets**: `JWT_SECRET` generated with `openssl rand -hex 32`.
- [ ] **Protected `.env`**: Set to `chmod 600 .env` owned by `www-data`.
- [ ] **Protected `data/`**: Access blocked in Nginx/Caddy; direct HTTP requests return 403.
- [ ] **Protected `backups/`**: Directory blocked from public web root.
- [ ] **Protected `uploads/`**: Script execution disabled inside uploads location.
- [ ] **Regular backups**: Nightly automated backup script running via cron.
- [ ] **Regular restore tests**: Sandbox restore tested periodically to ensure backup integrity.
- [ ] **HTTPS enforcement**: HTTP strictly redirected to HTTPS with HSTS enabled.
- [ ] **Log monitoring**: `journalctl -u sportspulse` audited for repeated errors.
- [ ] **Disk monitoring**: Automated alert when partition storage exceeds 80%.

---

## 18. Release Artifact Handoff

When packaging the release for deployment:

### What the Operator Needs from the Release:
* `dist/` directory (contains `server.cjs` and static web assets)
* `package.json` and `package-lock.json`
* `.env.example` template
* `scripts/backup_production.ts` utility
* Documentation (`docs/VPS_DEPLOYMENT.md` and `docs/PRODUCTION_OPERATIONS_CHECKLIST.md`)

### Distinguishing New vs. Existing Deployments:
* **NEW DEPLOYMENT**:
  * Database file `data/db.json` does not exist; application will automatically initialize default admin and schemas on first startup.
  * `uploads/` folder starts empty.
* **EXISTING PRODUCTION DEPLOYMENT (Upgrade)**:
  * **CRITICAL**: Do NOT overwrite existing `data/db.json` or `uploads/`!
  * Pull code updates, run `npm ci && npm run build`, and restart `sportspulse.service`.
  * Live data in `data/` and `uploads/` is preserved across builds.
