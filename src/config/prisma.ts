import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env, isProduction } from './env.js';

/**
 * Prisma v7 no longer bundles a query engine binary: a driver adapter is required.
 * The `pg.Pool` is created here (not inside the adapter) so the app owns connection
 * pooling and can drain it on shutdown.
 */
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: isProduction ? ['error'] : ['warn', 'error'],
  });

// Reuse the single client across tsx/nodemon reloads in development.
if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

export { pool };

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}
