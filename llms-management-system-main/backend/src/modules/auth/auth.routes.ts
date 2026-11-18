import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { loginLimiter } from "../../middlewares/rateLimiter.js";
import { validate } from "../../middlewares/validate.js";
import { AuthController } from "./auth.controller.js";
import { loginSchema } from "./auth.validation.js";

export const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  AuthController.login
);

// POST /api/v1/auth/refresh
authRouter.post("/refresh", AuthController.refresh);

// POST /api/v1/auth/logout
authRouter.post("/logout", AuthController.logout);

// GET /api/v1/auth/me
authRouter.get("/me", authenticate, AuthController.getMe);
