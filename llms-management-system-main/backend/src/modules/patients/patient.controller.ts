import type { Request, Response } from "express";
import {
  sendCreated,
  sendOk,
  sendPaginated,
} from "../../utils/apiResponse.js";
import { PatientService } from "./patient.service.js";
import type {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from "./patient.validation.js";

/**
 * Controller handling Patient management endpoints.
 * Keeps controllers thin: delegates to PatientService and sends envelope responses.
 */
export class PatientController {
  /**
   * GET /api/v1/patients
   */
  static async listPatients(req: Request, res: Response): Promise<void> {
    const query = (req.validated?.query ?? req.query) as ListPatientsQuery;
    const { data, meta } = await PatientService.listPatients(query, req.user!);
    sendPaginated(res, data, meta);
  }

  /**
   * POST /api/v1/patients
   */
  static async createPatient(req: Request, res: Response): Promise<void> {
    const input = (req.validated?.body ?? req.body) as CreatePatientInput;
    const patient = await PatientService.createPatient(input, req.user!);
    sendCreated(res, patient);
  }

  /**
   * GET /api/v1/patients/:id
   */
  static async getPatient(req: Request, res: Response): Promise<void> {
    const { id } = (req.validated?.params ?? req.params) as { id: string };
    const patient = await PatientService.getPatient(id, req.user!);
    sendOk(res, patient);
  }

  /**
   * PATCH /api/v1/patients/:id
   */
  static async updatePatient(req: Request, res: Response): Promise<void> {
    const { id } = (req.validated?.params ?? req.params) as { id: string };
    const input = (req.validated?.body ?? req.body) as UpdatePatientInput;
    const updated = await PatientService.updatePatient(id, input, req.user!);
    sendOk(res, updated);
  }

  /**
   * DELETE /api/v1/patients/:id
   */
  static async deletePatient(req: Request, res: Response): Promise<void> {
    const { id } = (req.validated?.params ?? req.params) as { id: string };
    const result = await PatientService.deletePatient(id, req.user!);
    sendOk(res, result);
  }
}
