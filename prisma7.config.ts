import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Pakai DIRECT_URL (port 5432) supaya Prisma Migrate tidak nyangkut di pooler Supabase
    url: env("DIRECT_URL"),
  },
});
