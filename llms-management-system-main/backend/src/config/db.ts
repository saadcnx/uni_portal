import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

let isEventListenersAttached = false;

function attachEventListeners(): void {
  if (isEventListenersAttached) return;

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected successfully");
  });

  mongoose.connection.on("error", (err) => {
    logger.error({ err }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  isEventListenersAttached = true;
}

export async function connectDB(): Promise<typeof mongoose> {
  const isProd = env.NODE_ENV === "production";

  attachEventListeners();

  const conn = await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
    autoIndex: !isProd,
  });

  return conn;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}
