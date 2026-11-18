"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useLogin } from "../hooks";
import { loginSchema, type LoginInput } from "../schemas";
import { ApiError } from "@/types/api";
import type { AuthUser } from "@/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

export interface LoginFormProps {
  onSuccess?: (user: AuthUser) => void;
  className?: string;
}

/**
 * Re-render reasoning:
 * 1. Form state is managed via react-hook-form and uncontrolled inputs,
 *    preventing parent re-renders on keystroke changes.
 * 2. Local state is constrained to showPassword toggle and inline server error.
 * 3. The useLogin mutation manages async lifecycle with pending spinner feedback.
 */
export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const loginMutation = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: LoginInput) => {
    setServerError(null);

    const payload: LoginInput = {
      email: values.email.trim().toLowerCase(),
      password: values.password,
    };

    loginMutation.mutate(payload, {
      onSuccess: (data) => {
        setIsRedirecting(true);
        if (onSuccess) {
          onSuccess(data.user);
        } else {
          setUser(data.user);
          toast.success(`Welcome back, ${data.user.name}`);
          router.push("/dashboard");
        }
      },
      onError: (error: ApiError | Error) => {
        setIsRedirecting(false);
        if ("errors" in error && error.errors && error.errors.length > 0) {
          error.errors.forEach((err) => {
            if (err.field === "email" || err.field === "password") {
              form.setError(err.field, {
                type: "server",
                message: err.message,
              });
            }
          });
        }
        setServerError(error.message || "Invalid credentials. Please try again.");
      },
    });
  };

  const isPending = loginMutation.isPending || isRedirecting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-4", className)}
        noValidate
      >
        {serverError && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="size-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={isPending}
                  {...field}
                  onChange={(e) => {
                    if (serverError) setServerError(null);
                    field.onChange(e);
                  }}
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
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isPending}
                    className="pr-10"
                    {...field}
                    onChange={(e) => {
                      if (serverError) setServerError(null);
                      field.onChange(e);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isPending}
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

        <Button
          type="submit"
          className="w-full gap-2 cursor-pointer"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Spinner className="size-4 animate-spin text-current" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
}
