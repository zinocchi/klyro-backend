import 'dotenv/config';
import { z } from 'zod';

/**
 * Schema for every environment variable the app depends on.
 * Fails fast at boot instead of surfacing `undefined` deep inside a request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (value) => /^postgres(ql)?:\/\/.+/.test(value),
      'DATABASE_URL must be a valid postgres connection string',
    ),
  /** Comma-separated list of browser origins allowed by CORS. */
  CORS_ORIGIN: z
    .string()
    .trim()
    .min(1)
    .default('http://localhost:5173,http://localhost:3000,http://localhost:8080'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  // eslint-disable-next-line no-console
  console.error(`[env] Invalid environment configuration:\n${details}`);
  process.exit(1);
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
