import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { DashboardController } from "./dashboard.controller.js";

export const dashboardRouter = Router();

// All dashboard routes require authentication and "dashboard:read" permission
dashboardRouter.use(authenticate, authorize("dashboard:read"));

// GET /api/v1/dashboard/stats
dashboardRouter.get("/stats", DashboardController.getStats);
