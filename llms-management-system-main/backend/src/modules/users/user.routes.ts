import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { UserController } from "./user.controller.js";
import {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  userParamsSchema,
} from "./user.validation.js";

export const userRouter = Router();

// All user routes require authentication and "user:manage" permission (SUPER_ADMIN and LAB_ADMIN)
userRouter.use(authenticate, authorize("user:manage"));

// GET /api/v1/users
userRouter.get(
  "/",
  validate(listUsersSchema),
  UserController.listUsers
);

// POST /api/v1/users
userRouter.post(
  "/",
  validate(createUserSchema),
  UserController.createUser
);

// GET /api/v1/users/:id
userRouter.get(
  "/:id",
  validate(userParamsSchema),
  UserController.getUser
);

// PATCH /api/v1/users/:id
userRouter.patch(
  "/:id",
  validate(updateUserSchema),
  UserController.updateUser
);
