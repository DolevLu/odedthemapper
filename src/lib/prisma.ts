import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Supabase's pooler only allows ~15 client connections in total, but Prisma's
// default is (cpus * 2 + 1) connections PER serverless instance — a handful
// of concurrent instances (or one page firing a dozen parallel queries)
// exhausts it and every further request fails with "max clients reached",
// which reaches users as Next's "This page couldn't load" error or a
// multi-second stall while the request queues for a free connection.
// Capping each instance and letting waiters queue a bit longer keeps the
// total under the pooler's ceiling. Explicit values in the env var win.
function pooledUrl(): string | undefined {
  const raw = process.env.POSTGRES_PRISMA_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "6");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "30");
    return url.toString();
  } catch {
    return raw;
  }
}

const url = pooledUrl();

export const prisma = globalForPrisma.prisma ?? new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
