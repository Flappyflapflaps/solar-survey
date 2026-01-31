# Solar Survey Project

## VPS Connection Details (Hetzner)

```
IP: 91.99.72.158
User: admin (NOT root - root login is disabled)
Port: 22
Auth: SSH key (no password needed)
```

### SSH Commands
```bash
# Connect to VPS
ssh admin@91.99.72.158

# Run single command
ssh admin@91.99.72.158 "command here"

# Run command with sudo
ssh admin@91.99.72.158 "sudo command here"
```

**Note:** SSH may timeout from some networks due to firewall rules. If SSH times out, ask the user to run the commands manually or try from a different network. The web server (port 80) is always accessible.

### Key VPS Paths
- Moltbot server: `/home/admin/moltbot-server/`
- Solar survey agent: `~/solar-survey-agent/`
- PM2 logs: `~/.pm2/logs/`

### PM2 Commands (run on VPS)
```bash
pm2 list                    # Show running processes
pm2 logs moltbot-server     # View server logs
pm2 restart moltbot-server  # Restart the server
```

## Frimble Chat Integration

The Solar Survey app has a chat integration with Frimble (clawdbot) running on the VPS.

### Architecture
1. **Frontend**: `js/components/FrimbleChat.js` - Chat UI component
2. **Vercel Proxy**: `api/chat.js` - HTTPS proxy for production (solves mixed content)
3. **VPS Server**: `moltbot-server/index.js` - Express server bridging to clawdbot CLI
4. **Agent**: `solar-survey` - Dedicated clawdbot agent with restrictions

### API Endpoints
- Production: `https://[vercel-domain]/api/chat` (proxies to VPS)
- VPS Direct: `http://91.99.72.158/api/chat` (via nginx)
- Health check: `http://91.99.72.158/health`

## Git Tags
- `v1.0-frimble-chat` - Backup before enabling Frimble code editing capabilities

## Service Worker
Cache version is in `service-worker.js`. Increment `CACHE_VERSION` when deploying updates.
