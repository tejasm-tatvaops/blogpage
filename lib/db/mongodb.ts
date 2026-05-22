import dns from "node:dns";
import mongoose from "mongoose";
import { validateEnv } from "@/lib/env";

/**
 * mongodb+srv:// resolves hostnames via DNS SRV. On some Windows networks the
 * default resolver (often the router at a link-local IPv6 address) returns
 * ECONNREFUSED for SRV while system tools still work. Use public DNS as fallback.
 */
function configureDnsForMongoSrv(): void {
  const custom = process.env.MONGODB_DNS_SERVERS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (custom?.length) {
    dns.setServers(custom);
    return;
  }

  if (process.platform === "win32" && process.env.MONGODB_URI?.startsWith("mongodb+srv://")) {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  }
}

configureDnsForMongoSrv();

if (process.getMaxListeners() <= 50) {
  process.setMaxListeners(100);
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache: MongooseCache = globalWithMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cache;

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  validateEnv();

  if (cache.conn) {
    return cache.conn;
  }

  const uri = process.env.MONGODB_URI!;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5_000,
        socketTimeoutMS: 30_000,
        connectTimeoutMS: 10_000,
        retryWrites: true,
      })
      .then((m) => m)
      .catch((err: unknown) => {
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
};
