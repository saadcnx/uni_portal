import type { Request, Response } from "express";
import { sendOk } from "../../utils/apiResponse.js";
import { DashboardService } from "./dashboard.service.js";

/**
 * Controller handling Dashboard statistics endpoints.
 * Sets Cache-Control header and forwards to DashboardService.
 */
export class DashboardController {
  /**
   * GET /api/v1/dashboard/stats
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    res.setHeader("Cache-Control", "private, max-age=30");
    const { days } = req.query;
    const stats = await DashboardService.getStats(req.user!, days as string | undefined);
    sendOk(res, stats);
  }
}
