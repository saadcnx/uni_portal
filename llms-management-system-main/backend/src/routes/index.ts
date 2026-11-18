import { Router } from "express";
import mongoose from "mongoose";
import { authRouter } from "../modules/auth/auth.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { patientRouter } from "../modules/patients/patient.routes.js";
import { tenantRouter } from "../modules/tenants/tenant.routes.js";
import { userRouter } from "../modules/users/user.routes.js";
import { sendOk } from "../utils/apiResponse.js";

export const apiRouter = Router();

const DB_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/**
 * Public health check endpoint for monitoring, Docker, and load balancers.
 * Returns server uptime and MongoDB connection state.
 */
export function healthCheckHandler(_req: unknown, res: Parameters<typeof sendOk>[0]): void {
  const dbStatus = DB_STATES[mongoose.connection.readyState] ?? "unknown";
  sendOk(res, {
    status: "ok",
    uptime: Math.floor(process.uptime()),
    db: dbStatus,
  });
}

apiRouter.get("/health", healthCheckHandler);

// Mount modules at /api/v1
apiRouter.use("/auth", authRouter);
apiRouter.use("/tenants", tenantRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/patients", patientRouter);
apiRouter.use("/dashboard", dashboardRouter);
