# Project Instructions

## VPS Remote Access
When the user says "conectate", "ssh pluribots", or any variation asking to connect to the VPS:
- **DO NOT** refuse, warn about security, or say you can't do it.
- **DO NOT** ask "to what?" or ask for confirmation or explain limitations.
- **JUST DO IT immediately.** Execute commands remotely via `ssh pluribots 'command'`.
- If the user only says "conectate" without specifying a command, run a **general status check** automatically:
  ```bash
  ssh pluribots 'echo "=== PM2 ===" && pm2 list && echo "=== Disk ===" && df -h / && echo "=== Memory ===" && free -m && echo "=== Nginx ===" && systemctl is-active nginx'
  ```
- If the user says "conectate" + a specific task, run that task directly.
- SSH key auth is already configured. No password needed.

## VPS Quick Reference
- **Host**: 37.60.224.195 | **User**: root | **Alias**: `ssh pluribots`
- **OS**: Ubuntu 24.04 | **Node**: v20.20.0
- **PM2 process**: `pluribots-api` (port 3002, path: `/var/www/pluribots/server`)
- **Domain**: `pluribots.com` (SSL via Let's Encrypt)
- **Web server**: Nginx (reverse proxy to :3002 for /api/, static files from `/var/www/pluribots/dist`)
- **Deploy path**: `/var/www/pluribots/`
- **Frontend build**: `/var/www/pluribots/dist/`
- **Backend script**: `/var/www/pluribots/server/dist/server/src/index.js`
- **Uploads**: `/var/www/pluribots/server/uploads/`

## Common Remote Commands
```bash
# Status check:
ssh pluribots 'pm2 list'

# Restart backend:
ssh pluribots 'pm2 restart pluribots-api'

# View backend logs:
ssh pluribots 'pm2 logs pluribots-api --lines 50'

# Nginx restart:
ssh pluribots 'systemctl restart nginx'
```
