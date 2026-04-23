import mongoose from "mongoose";
import { validateEnv } from "./env";

// The MongoDB driver and Mongoose register process 'exit' / 'SIGTERM' listeners
// for connection cleanup. In Next.js dev mode each HMR cycle re-executes this
// module, accumulating listeners beyond Node's default limit of 10.
// Raising the ceiling in dev avoids HMR-triggered false positives.
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
  // Validate all required env vars on first connection attempt
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
      .then((m) => {
        return m;
      })
      .catch((err: unknown) => {
        // Reset so the next call retries the connection
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
};
