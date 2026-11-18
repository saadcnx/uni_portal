import type { Request, Response } from "express";
import { sendCreated, sendOk, sendPaginated } from "../../utils/apiResponse.js";
import { TenantService } from "./tenant.service.js";
import type { CreateTenantInput, ListTenantsQuery, UpdateTenantInput } from "./tenant.validation.js";

/**
 * Controller handling Tenant management endpoints.
 * Keeps controllers thin: delegates to TenantService and sends envelope responses.
 */
export class TenantController {
  /**
   * POST /api/v1/tenants
   */
  static async createTenant(req: Request, res: Response): Promise<void> {
    const input = (req.validated?.body ?? req.body) as CreateTenantInput;
    const result = await TenantService.createTenant(input);
    sendCreated(res, result);
  }

  /**
   * GET /api/v1/tenants
   */
  static async listTenants(req: Request, res: Response): Promise<void> {
    const query = (req.validated?.query ?? req.query) as ListTenantsQuery;
    const { data, meta } = await TenantService.listTenants(query);
    sendPaginated(res, data, meta);
  }

  /**
   * GET /api/v1/tenants/:id
   */
  static async getTenant(req: Request, res: Response): Promise<void> {
    const { id } = (req.validated?.params ?? req.params) as { id: string };
    const tenant = await TenantService.getTenant(id);
    sendOk(res, tenant);
  }

  /**
   * PATCH /api/v1/tenants/:id
   */
  static async updateTenant(req: Request, res: Response): Promise<void> {
    const { id } = (req.validated?.params ?? req.params) as { id: string };
    const input = (req.validated?.body ?? req.body) as UpdateTenantInput;
    const updated = await TenantService.updateTenant(id, input);
    sendOk(res, updated);
  }
}
