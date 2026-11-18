import type { Server } from "node:http";
import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { captureException, initSentry } from "./config/sentry.js";

// Initialize Sentry monitoring
initSentry();

const app = createApp();
let server: Server | null = null;
let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    await connectDB();

    server = app.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (err: unknown) {
    logger.fatal({ err }, "Fatal error during server startup");
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Graceful shutdown initiated");

  // Force shutdown after 10s if connections fail to close in time
  const forceExit = setTimeout(() => {
    logger.error("Shutdown timed out. Forcing process exit.");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          if (err) return reject(err);
          logger.info("HTTP server closed");
          resolve();
        });
      });
    }

    await disconnectDB();
    logger.info("Graceful shutdown completed successfully");
    process.exit(0);
  } catch (err: unknown) {
    logger.error({ err }, "Error occurred during graceful shutdown");
    process.exit(1);
  }
}

// OS process signals
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Global error traps
process.on("unhandledRejection", (reason: unknown) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection detected");
  captureException(reason);
  void shutdown("unhandledRejection");
});

process.on("uncaughtException", (error: Error) => {
  logger.fatal({ err: error }, "Uncaught exception detected");
  captureException(error);
  void shutdown("uncaughtException");
});

void startServer();
