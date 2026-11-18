import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { PatientController } from "./patient.controller.js";
import {
  createPatientSchema,
  listPatientsSchema,
  patientParamsSchema,
  updatePatientSchema,
} from "./patient.validation.js";

export const patientRouter = Router();

// All patient routes require authentication
patientRouter.use(authenticate);

// GET /api/v1/patients (LAB_ADMIN, DOCTOR, RECEPTIONIST)
patientRouter.get(
  "/",
  authorize("patient:read"),
  validate(listPatientsSchema),
  PatientController.listPatients
);

// POST /api/v1/patients (LAB_ADMIN, RECEPTIONIST)
patientRouter.post(
  "/",
  authorize("patient:create"),
  validate(createPatientSchema),
  PatientController.createPatient
);

// GET /api/v1/patients/:id (LAB_ADMIN, DOCTOR, RECEPTIONIST)
patientRouter.get(
  "/:id",
  authorize("patient:read"),
  validate(patientParamsSchema),
  PatientController.getPatient
);

// PATCH /api/v1/patients/:id (LAB_ADMIN, RECEPTIONIST)
patientRouter.patch(
  "/:id",
  authorize("patient:update"),
  validate(updatePatientSchema),
  PatientController.updatePatient
);

// DELETE /api/v1/patients/:id (LAB_ADMIN only)
patientRouter.delete(
  "/:id",
  authorize("patient:delete"),
  validate(patientParamsSchema),
  PatientController.deletePatient
);
