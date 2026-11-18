import type { Request, Response } from "express";
import { sendOk } from "../../utils/apiResponse.js";
import { clearAuthCookies, COOKIE_NAMES, setAuthCookies } from "../../utils/cookies.js";
import { AuthService } from "./auth.service.js";
import type { LoginInput } from "./auth.validation.js";

/**
 * Controller handling authentication endpoints.
 * Adheres to thin controller principles:
 * - Reads validated input and cookies
 * - Delegates all business logic to AuthService
 * - Sets and clears cookies via utils/cookies.ts
 * - Sends responses using standardized response envelopes
 */
export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    const input = (req.validated?.body ?? req.body) as LoginInput;
    const result = await AuthService.login(input);

    setAuthCookies(res, result.tokens);
    sendOk(res, { user: result.user });
  }

  /**
   * POST /api/v1/auth/refresh
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    const result = await AuthService.refresh(rawRefreshToken);

    setAuthCookies(res, result.tokens);
    sendOk(res, { user: result.user });
  }

  /**
   * POST /api/v1/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    await AuthService.logout(rawRefreshToken);

    clearAuthCookies(res);
    sendOk(res, { message: "Logged out successfully" });
  }

  /**
   * GET /api/v1/auth/me
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    const user = await AuthService.getMe(req.user!.id);
    sendOk(res, { user });
  }
}
