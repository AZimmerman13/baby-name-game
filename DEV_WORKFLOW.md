# Development Workflow

## Quick Start (with Hot Reload)

Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

Access the app at: **http://localhost**

## How Hot Reload Works

### ✅ Backend (FastAPI) - Hot Reload Enabled
- **Files watched**: `./backend/*`
- **Auto-reloads on**: Any `.py` file change
- **Logs**: `docker logs baby-name-backend-dev -f`

**Changes apply instantly** - just save your Python file!

### ✅ Frontend (React) - Hot Reload Enabled
- **Files watched**: `./frontend/src/*`, `./frontend/public/*`
- **Auto-reloads on**: Any component, page, or style change
- **Logs**: `docker logs baby-name-frontend-dev -f`

**Changes apply instantly** - React dev server auto-refreshes your browser!

## Development Tips

### Making Changes

1. **Edit files locally** in your IDE (VS Code, etc.)
2. **Save the file** - that's it!
3. **Browser auto-refreshes** (frontend) or **API auto-reloads** (backend)

**No need to rebuild Docker images!**

### View Logs

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Just backend
docker logs baby-name-backend-dev -f

# Just frontend
docker logs baby-name-frontend-dev -f
```

### Restart Services

```bash
# Restart everything
docker-compose -f docker-compose.dev.yml restart

# Restart just one service
docker restart baby-name-backend-dev
docker restart baby-name-frontend-dev
```

### Stop Development Environment

```bash
docker-compose -f docker-compose.dev.yml down
```

## When to Rebuild

You only need to rebuild if you:
- Add/remove npm packages (`package.json` changed)
- Add/remove Python packages (`requirements.txt` changed)
- Change Docker configuration

```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d --build
```

## Production vs Development

| Aspect | Development (`docker-compose.dev.yml`) | Production (`docker-compose.yml`) |
|--------|----------------------------------------|-----------------------------------|
| Frontend | React dev server (hot reload) | Static build served by nginx |
| Backend | Uvicorn with `--reload` | Uvicorn without reload |
| Build time | Fast (no frontend build) | Slower (full production build) |
| File watching | ✅ Enabled | ❌ Disabled |
| Optimized | ❌ No | ✅ Yes |

**Your dev changes DO NOT affect production!**
- `Dockerfile` (production) vs `Dockerfile.dev` (development)
- `docker-compose.yml` (production) vs `docker-compose.dev.yml` (development)

## Testing Your Changes

```bash
# Run tests
cd backend && python3 -m pytest

# Check types
cd frontend && npm run type-check

# Build frontend to verify
cd frontend && npm run build
```

## Common Issues

### Frontend not updating?
- Check logs: `docker logs baby-name-frontend-dev`
- Restart: `docker restart baby-name-frontend-dev`
- Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### Backend not reloading?
- Check logs: `docker logs baby-name-backend-dev`
- Verify file saved correctly
- Check for syntax errors in terminal

### Database schema changed?
```bash
# Remove old database to reset
docker exec baby-name-backend-dev rm data/baby_name_game.db
docker restart baby-name-backend-dev
```

## Performance

- **First start**: ~15-20 seconds (installs dependencies)
- **Code changes**: < 1 second (instant hot reload)
- **Package changes**: ~30-60 seconds (rebuilds dependencies)

Enjoy fast iteration! 🚀
