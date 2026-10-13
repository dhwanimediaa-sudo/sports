# SportsPulse — Production Operations & Tournament Day Checklist

This operational checklist is designed for broadcast directors, tournament organizers, and system operators running competitive multi-sport events on SportsPulse.

---

## 1. Pre-Deployment (Infrastructure & Release Verification)

- [ ] **Pre-Deployment Backup**:
  ```bash
  npx tsx scripts/backup_production.ts
  ```
  Ensure latest backup snapshot exists before initiating code or environment changes.
- [ ] **Environment Configuration**:
  Verify `.env` contains valid `PORT`, `NODE_ENV=production`, `STORAGE_PATH`, and secure randomized `JWT_SECRET`. Confirm no secrets are exposed in client bundles.
- [ ] **Production Build**:
  ```bash
  npm run build
  ```
  Confirm `dist/server.cjs` and `dist/index.html` compile cleanly.
- [ ] **Service Status & Supervision**:
  ```bash
  sudo systemctl status sportspulse
  ```
  Ensure systemd service is active (running) with auto-restart policy enabled (`Restart=always`).
- [ ] **Health & Readiness Probe**:
  ```bash
  curl -s http://127.0.0.1:3000/api/health
  ```
  Confirm response returns `"status": "ok"` and `"ready": true`.
- [ ] **Disk Space Verification**:
  ```bash
  df -h /var/www/sportspulse
  ```
  Ensure at least 5GB free storage remains on the hosting partition.

---

## 2. Pre-Tournament (Preparation & Tournament Verification)

- [ ] **User Provisioning & Sport Access**:
  - Super Admin logs in via `/login`.
  - Organizers created with explicit sports permissions (e.g. Cricket, Football, Kabaddi).
  - Verify unauthorized sports are strictly restricted.
- [ ] **Tournament & League Structure**:
  - Format configured (League, Knockout, Group + Knockout).
  - Groups created and teams assigned to appropriate pools.
  - Fixtures generated or manually scheduled.
- [ ] **Team & Player Rosters**:
  - Teams created with primary/secondary branding colors.
  - Squad rosters loaded and verified against official tournament team sheets.
- [ ] **Media Assets Check**:
  Confirm team badges, sponsor overlays, and player headshots are uploaded to `uploads/`.
- [ ] **Network & Reverse Proxy**:
  Verify SSL certificate validity and confirm Nginx/Caddy is actively forwarding SSE without buffering (`X-Accel-Buffering: no`).

---

## 3. Pre-Match (Fixture & Graphics Setup)

- [ ] **Match Fixture Confirmation**:
  - Open match details in the Tournament Management portal.
  - Verify Team A, Team B, venue, scheduled start time, and sport type.
- [ ] **Playing XI & Starting Lineups**:
  - Select active Playing XI / Starting Squads for both teams.
  - Designate Captain and Wicketkeeper / Goalkeeper / Libero.
- [ ] **Graphics Preset Assignment**:
  - Open Graphics Studio (`/graphics`).
  - Cue the sport-specific Scorebug or Lower Third to Preview bus.
- [ ] **Public Broadcast Feed Connection**:
  - Copy the single public broadcast canvas URL:
    ```text
    https://yourdomain.com/broadcast/match/:matchId
    ```
  - Open OBS Studio or vMix:
    - Add **Browser Source**.
    - Set URL to the broadcast canvas URL.
    - Set Resolution to **1920 × 1080**.
    - Check **Shutdown source when not visible**.
    - Ensure background transparency is enabled.
- [ ] **Initial Sync Check**:
  - Confirm the preview canvas displays team names, colors, and 0-0 starting score.

---

## 4. During Match (Live Scoring & Production Switching)

- [ ] **Match Start**:
  - Cricket: Select opening batsman, non-striker, and opening bowler.
  - Football / Hockey / Basketball: Start match clock.
  - Volleyball / Table Tennis / Badminton: Confirm first server.
  - Kabaddi: Confirm first raiding team.
  - Status automatically transitions from `SCHEDULED` to `LIVE` upon first scoring action.
- [ ] **Real-Time Graphics Control**:
  - Use `TAKE LIVE` to push cued Preview graphics to the on-air Program channel.
  - Use `HOLD` to lock graphics on air during extended play.
  - Use `CLEAR` to gently dismiss active overlays.
  - Use `KILL ALL` emergency button if any overlay becomes stuck.
- [ ] **Event Overlay Alerts**:
  - High-impact events (Cricket FOUR, SIX, WICKET; Football GOAL; Kabaddi SUPER RAID; Basketball 3PT) trigger automatic milestone cards.
- [ ] **Live Connection Monitoring**:
  - The scoring console maintains a persistent SSE connection (`/scoring/stream`).
  - If a connection blips, automatic reconnect activates with exponential backoff (1s → 2s → 4s → 8s → 15s).

---

## 5. After Match (Completion, Reports & Standings)

- [ ] **Match Finalization**:
  - Click **End Match** / **Complete Match** in the Scoring Console.
  - Confirm winner, winning margin, and Player of the Match award.
  - Verify match status transitions to `COMPLETED`.
- [ ] **Immutability Lock Verification**:
  - Confirm that further scoring buttons are disabled and mutations are rejected with HTTP 400.
- [ ] **Official Match Report**:
  - Open **Match Report** tab.
  - Verify complete deterministic scorecard, timeline events, and player statistics.
  - Download or export PDF / share public match report URL.
- [ ] **Tournament Standings & Points Table**:
  - Navigate to Tournament Standings.
  - Confirm points table, net run rate / goal difference, and qualification markers updated automatically.
- [ ] **Post-Match Backup**:
  ```bash
  npx tsx scripts/backup_production.ts
  ```

---

## 6. End of Tournament (Championship Awards & Archival)

- [ ] **Award Presentations & Bracket Completion**:
  - Verify final playoff/knockout brackets are updated.
  - Review automated statistical leaders (Orange Cap / Golden Boot, MVP, Best Defender).
  - Open Presentation Mode for championship trophy and award distribution.
- [ ] **Final Archive Backup**:
  ```bash
  npx tsx scripts/backup_production.ts
  tar -czf tournament_final_archive.tar.gz backups/ data/ uploads/
  ```
- [ ] **Public Viewers & Cache Flushing**:
  - Clear any CDN / edge caches if applicable.
  - Leave completed tournament reports available via public spectator URLs.

---

## 7. Incident Response (Triage, Recovery & Rollback)

- [ ] **Service Restart**:
  ```bash
  sudo systemctl restart sportspulse
  ```
- [ ] **Health & Readiness Check**:
  ```bash
  curl -s http://127.0.0.1:3000/api/health
  ```
  Ensure `"status": "ok"` and `"ready": true`.
- [ ] **Live Diagnostics via Journalctl**:
  ```bash
  journalctl -u sportspulse -n 100 --no-pager
  ```
- [ ] **Database Restoration from Snapshot**:
  ```bash
  sudo systemctl stop sportspulse
  cp backups/sportspulse_backup_TARGET/db.json data/db.json
  sudo systemctl start sportspulse
  ```
- [ ] **Emergency Code Rollback**:
  ```bash
  git checkout PREVIOUS_STABLE_COMMIT_HASH
  npm ci
  npm run build
  sudo systemctl restart sportspulse
  ```
