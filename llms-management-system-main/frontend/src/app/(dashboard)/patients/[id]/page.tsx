import * as React from "react";
import type { Metadata } from "next";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { ROLES } from "@/constants/roles";
import { PatientDetails } from "@/features/patients/components/PatientDetails";

export const metadata: Metadata = {
  title: "Patient Details | LMS",
  description: "View and manage patient demographics and registration details",
};

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({
  params,
}: PatientDetailPageProps) {
  const { id } = await params;

  return (
    <RoleGuard
      allowedRoles={[ROLES.LAB_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]}
    >
      <PatientDetails patientId={id} />
    </RoleGuard>
  );
}
