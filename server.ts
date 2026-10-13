import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDatabase, saveDatabase, getDb } from './server/db/database';
import { closeAllScoringSseClients } from './server/routes/scoring';
import authRoutes from './server/routes/auth';
import systemRoutes from './server/routes/system';
import uploadRoutes from './server/routes/uploads';
import tournamentRoutes from './server/routes/tournaments';
import groupRoutes from './server/routes/groups';
import teamRoutes from './server/routes/teams';
import playerRoutes from './server/routes/players';
import matchRoutes from './server/routes/matches';
import scoringRoutes from './server/routes/scoring';
import broadcastRoutes from './server/routes/broadcast';
import graphicsRoutes from './server/routes/graphics';
import customSportsRoutes from './server/routes/customSports';
import auctionRoutes from './server/routes/auctions';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Reverse Proxy Support: trust front-end proxy (Nginx, Caddy, Cloudflare, etc.)
  app.set('trust proxy', 1);

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Malformed JSON payload.' });
    }
    next(err);
  });
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Security Headers (OBS/vMix browser source friendly: nosniff, strict referrer)
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Security: Block direct public access to internal database files and sensitive system files
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const normalizedPath = decodeURIComponent(req.path).toLowerCase();
      if (
        normalizedPath.startsWith('/data') ||
        normalizedPath.startsWith('/server') ||
        normalizedPath.startsWith('/scripts') ||
        normalizedPath.startsWith('/backups') ||
        normalizedPath.includes('.env') ||
        normalizedPath.includes('.tmp') ||
        normalizedPath === '/package.json' ||
        normalizedPath === '/package-lock.json' ||
        normalizedPath === '/metadata.json' ||
        normalizedPath === '/tsconfig.json'
      ) {
        return res.status(403).json({ error: 'Access denied: Cannot access internal system resources.' });
      }
    } catch {
      return res.status(400).json({ error: 'Bad Request' });
    }
    next();
  });

  // Initialize Database & Default Admin
  await initDatabase();

  // API Routes FIRST
  app.use('/api/auth', authRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/tournaments', tournamentRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/players', playerRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/custom-sports', customSportsRoutes);
  app.use('/api/matches/:id/scoring', scoringRoutes);
  app.use('/api/matches/:id/broadcast', broadcastRoutes);
  app.use('/api/broadcast', broadcastRoutes);
  app.use('/api/graphics', graphicsRoutes);
  app.use('/api/auctions', auctionRoutes);

  // Health check endpoint with readiness verification
  app.get('/api/health', (req, res) => {
    try {
      const db = getDb();
      const isReady = Boolean(db && db.system_config);
      res.json({
        status: 'ok',
        ready: isReady,
        service: 'SportsPulse Core Engine',
        version: '1.0.0',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: 'degraded',
        ready: false,
        service: 'SportsPulse Core Engine',
        version: '1.0.0',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Serve uploads directory
  const uploadDir = path.resolve(process.cwd(), process.env.STORAGE_PATH || 'uploads');
  app.use('/uploads', express.static(uploadDir));

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // Handle 404 for unhandled API requests in production before SPA fallback
    app.all('/api/*', (req, res) => {
      res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found.` });
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global structured error boundary
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[ServerError]', err);
    if (res.headersSent) {
      return next(err);
    }
    const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      error: err.message || 'Internal server error occurred.',
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SportsPulse Core Engine running at http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown handling for SIGTERM and SIGINT
  let isShuttingDown = false;
  const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);

    // 1. Close SSE connections
    try {
      closeAllScoringSseClients();
    } catch {}

    // 2. Flush pending database writes
    try {
      saveDatabase();
      console.log('[Server] Database state successfully flushed to disk.');
    } catch (err) {
      console.error('[Server] Error flushing database to disk during shutdown:', err);
    }

    // 3. Close HTTP server
    server.close((err) => {
      if (err) {
        console.error('[Server] Error during HTTP server close:', err);
        process.exit(1);
      }
      console.log('[Server] HTTP server closed gracefully.');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long (5s)
    setTimeout(() => {
      console.warn('[Server] Forcing process exit after timeout.');
      process.exit(0);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
