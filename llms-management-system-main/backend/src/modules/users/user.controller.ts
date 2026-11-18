import type { Request, Response } from "express";
import {
  sendCreated,
  sendOk,
  sendPaginated,
} from "../../utils/apiResponse.js";
import { UserService } from "./user.service.js";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from "./user.validation.js";

/**
 * Controller handling User management endpoints.
 * Keeps controllers thin: delegates to UserService and sends envelope responses.
 */
export class UserController {
  /**
   * GET /api/v1/users
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    const query = (req.validated?.query ?? req.query) as ListUsersQuery;
    const { data, meta } = await UserService.listUsers(query, req.user!);
    sendPaginated(res, data, meta);
  }

  /**
   * POST /api/v1/users
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    const input = (req.validated?.body ?? req.body) as CreateUserInput;
    const user = await UserService.createUser(input, req.user!);
    sendCreated(res, user);
  }

  /**
   * GET /api/v1/users/:id
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    const { id } = (req.validated?.params ?? req.params) as { id: string };
    const user = await UserService.getUser(id, req.user!);
    sendOk(res, user);
  }

  /**
   * PATCH /api/v1/users/:id
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    const { id } = (req.validated?.params ?? req.params) as { id: string };
    const input = (req.validated?.body ?? req.body) as UpdateUserInput;
    const updated = await UserService.updateUser(id, input, req.user!);
    sendOk(res, updated);
  }
}
