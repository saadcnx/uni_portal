import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { TenantController } from "./tenant.controller.js";
import {
  createTenantSchema,
  listTenantsSchema,
  tenantParamsSchema,
  updateTenantSchema,
} from "./tenant.validation.js";

export const tenantRouter = Router();

// All tenant routes require authentication and "tenant:manage" permission (SUPER_ADMIN only)
tenantRouter.use(authenticate, authorize("tenant:manage"));

// GET /api/v1/tenants
tenantRouter.get(
  "/",
  validate(listTenantsSchema),
  TenantController.listTenants
);

// POST /api/v1/tenants
tenantRouter.post(
  "/",
  validate(createTenantSchema),
  TenantController.createTenant
);

// GET /api/v1/tenants/:id
tenantRouter.get(
  "/:id",
  validate(tenantParamsSchema),
  TenantController.getTenant
);

// PATCH /api/v1/tenants/:id
tenantRouter.patch(
  "/:id",
  validate(updateTenantSchema),
  TenantController.updateTenant
);
