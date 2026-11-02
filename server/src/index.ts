import { app } from './app.js';
import { config } from './config/index.js';
import { initDatabaseConnection, pool } from './db/index.js';

async function bootstrap() {
  console.log(`[Server] Starting San Roque CHC REST API server in ${config.nodeEnv} mode...`);

  // Attempt database connection
  await initDatabaseConnection();

  const server = app.listen(config.port, () => {
    console.log(`[Server] REST API listening on http://localhost:${config.port}`);
    console.log(`[Server] Health check: http://localhost:${config.port}/api/v1/health`);
  });

  // Graceful shutdown handling
  const handleShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      try {
        await pool.end();
        console.log('[Server] Database connection pool closed.');
      } catch (err) {
        console.error('[Server] Error closing pool:', err);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

