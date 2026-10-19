import express from 'express';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/routes.ts';
import { getDb } from './src/server/db.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize database schema and seeds
  try {
    await getDb();
    console.log('✓ PostgreSQL (PGlite) database initialized successfully with FidelityFul schema and seeds.');
  } catch (err) {
    console.error('Database initialization warning:', err);
  }

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'FidelityFul Backend',
      venue: 'Fulano Restobar (Madrid)',
      engine: 'Node.js + PostgreSQL',
      timestamp: new Date().toISOString(),
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: process.cwd() });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ FidelityFul Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
