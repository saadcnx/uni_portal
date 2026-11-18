"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { useAuthStore } from "@/stores/auth.store";
import type { AuthUser } from "@/types/user";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const handleLoginSuccess = (user: AuthUser) => {
    setUser(user);
    toast.success(`Welcome back, ${user.name}`);
    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm border-border bg-card shadow-none">
        <CardHeader className="flex flex-col items-center gap-2 text-center pb-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <FlaskConical className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
              Sign In
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your credentials to access the laboratory dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <LoginForm onSuccess={handleLoginSuccess} />
        </CardContent>
      </Card>
    </main>
  );
}
