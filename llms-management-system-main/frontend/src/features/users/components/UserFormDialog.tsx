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
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { ROLES, type Role } from "@/constants/roles";
import { useAuthStore } from "@/stores/auth.store";
import { useLabs } from "@/features/labs/hooks";
import { useCreateUser, useUpdateUser } from "../hooks";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from "../schemas";
import type { User, UserScope, UpdateUserInput } from "../types";
import { ApiError } from "@/types/api";

export interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  scope?: UserScope;
  onSuccess?: (user: User) => void;
}

interface CreateUserFormProps {
  scope: UserScope;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (user: User) => void;
}

function CreateUserForm({
  scope,
  onOpenChange,
  onSuccess,
}: CreateUserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isSuperAdminScope = scope === "all";

  // Super Admin loads laboratories for organization assignment
  const { data: labsData, isLoading: isLoadingLabs } = useLabs(
    { limit: 100 },
    { enabled: isSuperAdminScope }
  );
  const labs = labsData?.data ?? [];

  const createUserMutation = useCreateUser({ meta: { silent: true } });

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: isSuperAdminScope ? ROLES.LAB_ADMIN : ROLES.DOCTOR,
      tenantId: "",
    },
  });

  const onSubmit = (values: CreateUserFormValues) => {
    setServerError(null);

    // Enforce tenant selection for Super Admin
    if (isSuperAdminScope && (!values.tenantId || !values.tenantId.trim())) {
      form.setError("tenantId", {
        type: "manual",
        message: "Please select a laboratory",
      });
      return;
    }

    createUserMutation.mutate(
      {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role as Role,
        tenantId: isSuperAdminScope ? values.tenantId?.trim() : undefined,
      },
      {
        onSuccess: (createdUser) => {
          toast.success(
            scope === "lab"
              ? `Staff member "${createdUser.name}" created successfully`
              : `User "${createdUser.name}" created successfully`
          );
          form.reset();
          onOpenChange(false);
          onSuccess?.(createdUser);
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            // Map 409 duplicate email error
            if (error.statusCode === 409) {
              form.setError("email", {
                type: "server",
                message:
                  error.errors?.[0]?.message ||
                  "A user with this email address already exists",
              });
              return;
            }

            // Map server field errors
            if (error.errors && error.errors.length > 0) {
              let hasMappedFieldError = false;
              error.errors.forEach((err) => {
                if (
                  err.field === "name" ||
                  err.field === "email" ||
                  err.field === "password" ||
                  err.field === "role" ||
                  err.field === "tenantId"
                ) {
                  form.setError(err.field, {
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
            error.message ||
              "Failed to create user. Please check the form and try again."
          );
        },
      }
    );
  };

  const isPending = createUserMutation.isPending;

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
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Dr. Jane Smith"
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
            name="email"
            render={({ field }) => (
              <FormItem className="col-span-1 sm:col-span-2">
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jane@lab.com"
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
            name="password"
            render={({ field }) => (
              <FormItem className="col-span-1 sm:col-span-2">
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters with letter & number"
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
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className={isSuperAdminScope ? "col-span-1" : "col-span-1 sm:col-span-2"}>
                <FormLabel>Role</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isSuperAdminScope ? (
                      <>
                        <SelectItem value={ROLES.LAB_ADMIN}>Lab Admin</SelectItem>
                        <SelectItem value={ROLES.DOCTOR}>Doctor</SelectItem>
                        <SelectItem value={ROLES.RECEPTIONIST}>
                          Receptionist
                        </SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value={ROLES.DOCTOR}>Doctor</SelectItem>
                        <SelectItem value={ROLES.RECEPTIONIST}>
                          Receptionist
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {isSuperAdminScope && (
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel>Laboratory</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={isPending || isLoadingLabs}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select laboratory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {labs.map((lab) => (
                        <SelectItem key={lab.id} value={lab.id}>
                          {lab.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
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
            {isPending && (
              <Spinner className="size-4 animate-spin text-current" />
            )}
            {scope === "lab" ? "Add Staff" : "Create User"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

interface EditUserFormProps {
  user: User;
  scope: UserScope;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (user: User) => void;
}

function EditUserForm({
  user,
  scope,
  onOpenChange,
  onSuccess,
}: EditUserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const currentUserId = useAuthStore((state) => state.user?.id);
  const isSelf = Boolean(currentUserId && currentUserId === user.id);
  const isSuperAdminScope = scope === "all";

  const updateUserMutation = useUpdateUser({ meta: { silent: true } });

  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      password: "",
    },
  });

  const onSubmit = (values: UpdateUserFormValues) => {
    setServerError(null);

    const updateData: UpdateUserInput = {
      name: values.name.trim(),
      role: isSelf ? undefined : (values.role as Role),
      isActive: isSelf ? undefined : values.isActive,
    };

    if (values.password && values.password.trim()) {
      updateData.password = values.password;
    }

    updateUserMutation.mutate(
      {
        id: user.id,
        data: updateData,
      },
      {
        onSuccess: (updatedUser) => {
          toast.success(
            scope === "lab"
              ? `Staff member "${updatedUser.name}" updated successfully`
              : `User "${updatedUser.name}" updated successfully`
          );
          onOpenChange(false);
          onSuccess?.(updatedUser);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.errors) {
            let hasMappedFieldError = false;
            error.errors.forEach((err) => {
              if (
                err.field === "name" ||
                err.field === "role" ||
                err.field === "isActive" ||
                err.field === "password"
              ) {
                form.setError(err.field as keyof UpdateUserFormValues, {
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
            error.message ||
              "Failed to update user. Please check the form and try again."
          );
        },
      }
    );
  };

  const isPending = updateUserMutation.isPending;

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
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Dr. Jane Smith"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="col-span-1 sm:col-span-2">
            <FormLabel className="text-muted-foreground">Email Address</FormLabel>
            <Input value={user.email} disabled className="bg-muted/50 cursor-not-allowed" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Email addresses cannot be modified.
            </p>
          </div>

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="col-span-1 sm:col-span-2">
                <FormLabel>Role</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending || isSelf}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isSuperAdminScope ? (
                      <>
                        {user.role === ROLES.SUPER_ADMIN && (
                          <SelectItem value={ROLES.SUPER_ADMIN}>
                            Super Admin
                          </SelectItem>
                        )}
                        <SelectItem value={ROLES.LAB_ADMIN}>Lab Admin</SelectItem>
                        <SelectItem value={ROLES.DOCTOR}>Doctor</SelectItem>
                        <SelectItem value={ROLES.RECEPTIONIST}>
                          Receptionist
                        </SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value={ROLES.DOCTOR}>Doctor</SelectItem>
                        <SelectItem value={ROLES.RECEPTIONIST}>
                          Receptionist
                        </SelectItem>
                        {user.role === ROLES.LAB_ADMIN && (
                          <SelectItem value={ROLES.LAB_ADMIN}>
                            Lab Admin
                          </SelectItem>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {isSelf && (
                  <FormDescription className="text-xs text-muted-foreground">
                    You cannot change your own role.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="col-span-1 sm:col-span-2 flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-xs">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm font-medium">
                    Active Status
                  </FormLabel>
                  <FormDescription className="text-xs">
                    {isSelf
                      ? "You cannot deactivate your own account."
                      : "Permit this user to sign in to the platform."}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isPending || isSelf}
                    aria-label="Toggle user active status"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="col-span-1 sm:col-span-2">
                <FormLabel>
                  Reset Password{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Leave blank to keep existing password"
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
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription className="text-xs">
                  Leave blank to retain current password. If providing a new one,
                  it must be at least 8 characters with a letter and a number.
                </FormDescription>
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
            {isPending && (
              <Spinner className="size-4 animate-spin text-current" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

/**
 * Re-render reasoning:
 * 1. UserFormDialog isolates uncontrolled form state inside react-hook-form.
 * 2. Keystrokes remain local to inputs and don't re-render parent page or tables.
 * 3. Enforces API constraints per role:
 *    - Lab Admin: can only create DOCTOR or RECEPTIONIST; tenant is automatic.
 *    - Super Admin: selects lab via useLabs and can pick LAB_ADMIN.
 *    - Self protection: current user cannot change own role or deactivate own account.
 */
export function UserFormDialog({
  open,
  onOpenChange,
  user,
  scope = "all",
  onSuccess,
}: UserFormDialogProps) {
  const isEdit = Boolean(user);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? scope === "lab"
                ? "Edit Staff Member"
                : "Edit User"
              : scope === "lab"
              ? "Add Staff Member"
              : "Create User"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update user profile, assigned role, active status, or reset password."
              : scope === "lab"
              ? "Register a new doctor or receptionist account for your laboratory."
              : "Register a new user account and assign them to a laboratory."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && user ? (
          <EditUserForm
            key={user.id}
            user={user}
            scope={scope}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : (
          <CreateUserForm
            key="create"
            scope={scope}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
