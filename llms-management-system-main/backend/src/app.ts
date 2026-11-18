import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";
import { requestId } from "./middlewares/requestId.js";
import { sanitize } from "./middlewares/sanitize.js";
import { apiRouter, healthCheckHandler } from "./routes/index.js";

/**
 * Creates and configures the Express application with security, logging,
 * rate limiting, and error handling middleware pipelines.
 */
export function createApp(): Express {
  const app = express();

  // Trust proxy in production for reverse proxies / load balancers
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // 1. Request ID (attaches UUID to req.id and response header)
  app.use(requestId);

  // 2. HTTP Request Logging (Pino)
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id || "unknown",
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    })
  );

  // 3. Helmet: Secure HTTP headers
  app.use(helmet());

  // 4. CORS: Restricted to CLIENT_ORIGIN with credentials enabled
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  // 5. Response compression
  app.use(compression());

  // 6. JSON body parsing with 100kb payload budget
  app.use(express.json({ limit: "100kb" }));

  // 7. Cookie parsing
  app.use(cookieParser());

  // 8. NoSQL injection sanitization
  app.use(sanitize);

  // 9. Global API Rate Limiting (300 req / 15 min)
  app.use(apiLimiter);

  // 10. Public Health check endpoint & API v1 routes (with direct prefix alias for Postman)
  app.get("/health", healthCheckHandler);
  app.use("/api/v1", apiRouter);
  app.use(apiRouter);

  // 11. 404 handler for unmatched routes
  app.use(notFound);

  // 12. Central error handler
  app.use(errorHandler);

  return app;
}
