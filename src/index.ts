import { app } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './config/prisma.js';

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] Klyro API listening on http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
});

async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[server] ${signal} received, shutting down...`);

  server.close(async () => {
    try {
      await disconnectPrisma();
      process.exit(0);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[server] Error during shutdown:', error);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[server] Unhandled rejection:', reason);
});
