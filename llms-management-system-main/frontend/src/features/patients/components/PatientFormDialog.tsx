"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeAgeFromDob } from "./PatientColumns";
import { useCreatePatient, useUpdatePatient } from "../hooks";
import {
  createPatientSchema,
  type CreatePatientFormValues,
} from "../schemas";
import type { Patient, Gender } from "../types";
import { ApiError } from "@/types/api";

export interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  onSuccess?: (patient: Patient) => void;
}

interface PatientFormContentProps {
  patient?: Patient | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (patient: Patient) => void;
}

function PatientFormContent({
  patient,
  onOpenChange,
  onSuccess,
}: PatientFormContentProps) {
  const isEditing = Boolean(patient);
  const [serverError, setServerError] = useState<string | null>(null);

  const createPatientMutation = useCreatePatient();
  const updatePatientMutation = useUpdatePatient();

  const isPending =
    createPatientMutation.isPending || updatePatientMutation.isPending;

  // Max selectable date for Date of Birth is today
  const todayDateString = new Date().toISOString().split("T")[0];

  const dobFormatted = patient?.dateOfBirth
    ? patient.dateOfBirth.slice(0, 10)
    : "";

  const initialAge = computeAgeFromDob(dobFormatted);
  const [ageValue, setAgeValue] = useState<string>(
    initialAge ? String(initialAge.value) : ""
  );
  const [ageUnit, setAgeUnit] = useState<"years" | "months" | "days">(
    initialAge ? initialAge.unit : "years"
  );

  const form = useForm<CreatePatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      name: patient?.name || "",
      phone: patient?.phone || "",
      gender: patient?.gender || "MALE",
      dateOfBirth: dobFormatted,
      address: patient?.address || "",
    },
  });

  const handleDobChange = (dobStr: string) => {
    if (!dobStr) {
      setAgeValue("");
      return;
    }
    const computed = computeAgeFromDob(dobStr);
    if (computed) {
      setAgeValue(String(computed.value));
      setAgeUnit(computed.unit);
    }
  };

  const updateDobFromAge = (
    valueStr: string,
    unit: "years" | "months" | "days"
  ) => {
    const val = parseInt(valueStr, 10);
    if (isNaN(val) || val < 0) return;

    const today = new Date();
    const targetDate = new Date(today);

    if (unit === "years") {
      targetDate.setFullYear(today.getFullYear() - val);
    } else if (unit === "months") {
      targetDate.setMonth(today.getMonth() - val);
    } else if (unit === "days") {
      targetDate.setDate(today.getDate() - val);
    }

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    form.setValue("dateOfBirth", formattedDate, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleAgeValueChange = (valStr: string) => {
    const cleaned = valStr.replace(/\D/g, "");
    setAgeValue(cleaned);
    if (cleaned) {
      updateDobFromAge(cleaned, ageUnit);
    }
  };

  const handleAgeUnitChange = (unit: "years" | "months" | "days") => {
    setAgeUnit(unit);
    if (ageValue) {
      updateDobFromAge(ageValue, unit);
    }
  };

  React.useEffect(() => {
    if (patient?.dateOfBirth) {
      const dobStr = patient.dateOfBirth.slice(0, 10);
      const computed = computeAgeFromDob(dobStr);
      if (computed) {
        setAgeValue(String(computed.value));
        setAgeUnit(computed.unit);
      }
    }
  }, [patient]);

  const onSubmit = (values: CreatePatientFormValues) => {
    setServerError(null);

    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      gender: values.gender as Gender,
      dateOfBirth: values.dateOfBirth,
      address: values.address?.trim() ? values.address.trim() : undefined,
    };

    if (isEditing && patient) {
      updatePatientMutation.mutate(
        { id: patient.id, data: payload },
        {
          onSuccess: (updatedPatient) => {
            toast.success(`Patient "${updatedPatient.name}" updated successfully`);
            onOpenChange(false);
            onSuccess?.(updatedPatient);
          },
          onError: (error) => {
            handleError(error);
          },
        }
      );
    } else {
      createPatientMutation.mutate(payload, {
        onSuccess: (createdPatient) => {
          toast.success(
            `Patient "${createdPatient.name}" registered successfully`
          );
          onOpenChange(false);
          onSuccess?.(createdPatient);
        },
        onError: (error) => {
          handleError(error);
        },
      });
    }
  };

  const handleError = (error: ApiError) => {
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err) => {
        if (
          err.field &&
          ["name", "phone", "gender", "dateOfBirth", "address"].includes(
            err.field
          )
        ) {
          form.setError(err.field as keyof CreatePatientFormValues, {
            type: "server",
            message: err.message,
          });
        }
      });
    } else if (error.message) {
      setServerError(error.message);
    } else {
      setServerError(
        isEditing ? "Failed to update patient" : "Failed to register patient"
      );
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Edit Patient" : "Register New Patient"}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update patient demographic information and contact details."
            : "Register a new patient into the laboratory records."}
        </DialogDescription>
      </DialogHeader>

      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Desktop Two-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. John Doe"
                        autoComplete="off"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="e.g. 03001234567"
                      autoComplete="off"
                      disabled={isPending}
                      {...field}
                      onChange={(e) => {
                        // Sirf 0 se 9 tak ke digits allow karega
                        const onlyNumbers = e.target.value.replace(/\D/g, "");
                        field.onChange(onlyNumbers);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gender */}
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date of Birth */}
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      max={todayDateString}
                      disabled={isPending}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleDobChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Age */}
            <FormItem>
              <FormLabel>Age</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 25"
                  value={ageValue}
                  disabled={isPending}
                  onChange={(e) => handleAgeValueChange(e.target.value)}
                  className="w-24 text-center font-medium"
                />
                <Select
                  value={ageUnit}
                  disabled={isPending}
                  onValueChange={(val) => {
                    if (val) handleAgeUnitChange(val as "years" | "months" | "days");
                  }}
                >
                  <SelectTrigger className="w-28 font-medium">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="years">Years</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FormItem>

            {/* Address (Optional) */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Address{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        (Optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Street address, city, region"
                        autoComplete="off"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-2 cursor-pointer"
            >
              {isPending && <Spinner className="size-4 animate-spin text-current" />}
              {isPending
                ? (isEditing ? "Saving changes..." : "Registering patient...")
                : (isEditing ? "Save Changes" : "Register Patient")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: PatientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open && (
          <PatientFormContent
            key={patient?.id || "create"}
            patient={patient}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
