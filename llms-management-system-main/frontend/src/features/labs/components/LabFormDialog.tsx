"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
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
import { useCreateLab, useUpdateLab } from "../hooks";
import {
  createLabSchema,
  updateLabSchema,
  type CreateLabFormValues,
  type UpdateLabFormValues,
} from "../schemas";
import type { Lab } from "../types";
import { ApiError } from "@/types/api";

export interface LabFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lab?: Lab | null;
  onSuccess?: (lab: Lab) => void;
}

interface CreateLabFormProps {
  onOpenChange: (open: boolean) => void;
  onSuccess?: (lab: Lab) => void;
}

function CreateLabForm({ onOpenChange, onSuccess }: CreateLabFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const createLabMutation = useCreateLab({ meta: { silent: true } });

  const form = useForm<CreateLabFormValues>({
    resolver: zodResolver(createLabSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      admin: {
        name: "",
        email: "",
        password: "",
      },
    },
  });

  const onSubmit = (values: CreateLabFormValues) => {
    setServerError(null);

    createLabMutation.mutate(
      {
        name: values.name.trim(),
        contactEmail: values.contactEmail.trim().toLowerCase(),
        contactPhone: values.contactPhone?.trim() || undefined,
        admin: {
          name: values.admin.name.trim(),
          email: values.admin.email.trim().toLowerCase(),
          password: values.admin.password,
        },
      },
      {
        onSuccess: (data) => {
          toast.success(`Lab "${data.tenant.name}" created successfully`);
          form.reset();
          onOpenChange(false);
          onSuccess?.(data.tenant);
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            // Map 409 conflict to admin.email field
            if (error.statusCode === 409) {
              form.setError("admin.email", {
                type: "server",
                message:
                  error.errors?.[0]?.message ||
                  "A user with this email address already exists",
              });
              return;
            }

            // Map field-specific validation errors from backend
            if (error.errors && error.errors.length > 0) {
              let hasMappedFieldError = false;
              error.errors.forEach((err) => {
                if (err.field === "admin.email" || err.field === "email") {
                  form.setError("admin.email", {
                    type: "server",
                    message: err.message,
                  });
                  hasMappedFieldError = true;
                } else if (err.field === "admin.name") {
                  form.setError("admin.name", {
                    type: "server",
                    message: err.message,
                  });
                  hasMappedFieldError = true;
                } else if (err.field === "admin.password") {
                  form.setError("admin.password", {
                    type: "server",
                    message: err.message,
                  });
                  hasMappedFieldError = true;
                } else if (err.field === "name") {
                  form.setError("name", {
                    type: "server",
                    message: err.message,
                  });
                  hasMappedFieldError = true;
                } else if (err.field === "contactEmail") {
                  form.setError("contactEmail", {
                    type: "server",
                    message: err.message,
                  });
                  hasMappedFieldError = true;
                } else if (err.field === "contactPhone") {
                  form.setError("contactPhone", {
                    type: "server",
                    message: err.message,
                  });
                  hasMappedFieldError = true;
                }
              });

              if (hasMappedFieldError) {
                return;
              }
            }
          }

          setServerError(
            error.message || "Failed to create lab. Please check the form and try again."
          );
        },
      }
    );
  };

  const isPending = createLabMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">
              {serverError}
            </AlertDescription>
          </Alert>
        )}

        {/* Laboratory Tenant Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-1 sm:col-span-2">
                <FormLabel>Lab Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Metro Health Diagnostics"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="contact@lab.com"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>
                  Phone <span className="text-muted-foreground text-xs">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="+1 555-0100"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Primary Lab Admin Account Section */}
          <div className="col-span-1 sm:col-span-2 pt-3 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground">
              Lab Administrator Account
            </h4>
            <p className="text-xs text-muted-foreground">
              Initial admin user credentials to manage this lab.
            </p>
          </div>

          <FormField
            control={form.control}
            name="admin.name"
            render={({ field }) => (
              <FormItem className="col-span-1 sm:col-span-2">
                <FormLabel>Admin Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Dr. John Doe"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="admin.email"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Admin Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="admin@lab.com"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="admin.password"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Admin Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      disabled={isPending}
                      className="pr-9"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Spinner className="size-4 animate-spin text-current" />}
            Create Lab
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

interface EditLabFormProps {
  lab: Lab;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (lab: Lab) => void;
}

function EditLabForm({ lab, onOpenChange, onSuccess }: EditLabFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const updateLabMutation = useUpdateLab({ meta: { silent: true } });

  const form = useForm<UpdateLabFormValues>({
    resolver: zodResolver(updateLabSchema),
    defaultValues: {
      name: lab.name,
      contactEmail: lab.contactEmail || "",
      contactPhone: lab.contactPhone || "",
      status: lab.status,
    },
  });

  const onSubmit = (values: UpdateLabFormValues) => {
    setServerError(null);

    updateLabMutation.mutate(
      {
        id: lab.id,
        data: {
          name: values.name.trim(),
          contactEmail: values.contactEmail.trim().toLowerCase(),
          contactPhone: values.contactPhone?.trim() || undefined,
          status: values.status,
        },
      },
      {
        onSuccess: (updatedLab) => {
          toast.success(`Lab "${updatedLab.name}" updated successfully`);
          onOpenChange(false);
          onSuccess?.(updatedLab);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.errors) {
            let hasMappedFieldError = false;
            error.errors.forEach((err) => {
              if (err.field === "name") {
                form.setError("name", {
                  type: "server",
                  message: err.message,
                });
                hasMappedFieldError = true;
              } else if (err.field === "contactEmail") {
                form.setError("contactEmail", {
                  type: "server",
                  message: err.message,
                });
                hasMappedFieldError = true;
              } else if (err.field === "contactPhone") {
                form.setError("contactPhone", {
                  type: "server",
                  message: err.message,
                });
                hasMappedFieldError = true;
              } else if (err.field === "status") {
                form.setError("status", {
                  type: "server",
                  message: err.message,
                });
                hasMappedFieldError = true;
              }
            });

            if (hasMappedFieldError) {
              return;
            }
          }

          setServerError(
            error.message || "Failed to update lab. Please check the form and try again."
          );
        },
      }
    );
  };

  const isPending = updateLabMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">
              {serverError}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-1 sm:col-span-2">
                <FormLabel>Lab Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Metro Health Diagnostics"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="contact@lab.com"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>
                  Phone <span className="text-muted-foreground text-xs">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="+1 555-0100"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="col-span-1 sm:col-span-2">
                <FormLabel>Status</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Spinner className="size-4 animate-spin text-current" />}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

/**
 * Re-render reasoning:
 * 1. LabFormDialog handles both create and edit flows through a unified modal boundary.
 * 2. Uncontrolled form state inside react-hook-form keeps keystrokes local,
 *    preventing parent page or table re-renders.
 * 3. Mutations invalidate only `queryKeys.labs.all` on success.
 */
export function LabFormDialog({
  open,
  onOpenChange,
  lab,
  onSuccess,
}: LabFormDialogProps) {
  const isEdit = Boolean(lab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Laboratory" : "Create Laboratory"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update laboratory contact and organization details."
              : "Register a new laboratory tenant and set up its primary Lab Admin account."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && lab ? (
          <EditLabForm
            key={lab.id}
            lab={lab}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : (
          <CreateLabForm
            key="create"
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
