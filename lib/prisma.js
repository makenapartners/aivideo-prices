// Uses Prisma's Neon driver adapter instead of Prisma's native Rust query
// engine binary. This sidesteps a well-known deployment problem where
// serverless bundlers (Netlify, Vercel, etc.) fail to include the native
// engine file, which crashes every query with an opaque "query engine
// could not be found" error. The driver adapter connects via Neon's own
// JS/WebSocket driver instead, so there's no binary to bundle at all.
const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis;

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };
