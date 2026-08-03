"use client";

import { Lock } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { useRouter, useSearchParams } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { AuthFormSkeleton } from "@/components/page-skeletons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { withLoadingFlag } from "@/lib/with-loading-flag";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({
        title: "Invalid Link",
        description: "No reset token provided. Please request a new password reset.",
        variant: "destructive",
      });
      router.push("/forgot-password");
    }
  }, [searchParams, router, toast]);

  const validateField = (
    name: string,
    value: string,
    allData?: typeof formData
  ): string | undefined => {
    if (name === "password") {
      if (!value) {
        return "Password is required";
      }
      if (value.length < 6) {
        return "Password must be at least 6 characters";
      }
    }
    if (name === "confirmPassword") {
      if (!value) {
        return "Please confirm your password";
      }
      if (allData && value !== allData.password) {
        return "Passwords don't match";
      }
    }
    return;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name as keyof typeof formData;
    setFormData((prev) => ({ ...prev, [fieldName]: e.target.value }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }

    // Re-validate confirmPassword if password changes
    if (fieldName === "password" && formData.confirmPassword) {
      const confirmError = validateField("confirmPassword", formData.confirmPassword, {
        ...formData,
        password: e.target.value,
      });
      setErrors((prev) => ({
        ...prev,
        confirmPassword: confirmError,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setErrors({ form: "Invalid reset token" });
      return;
    }

    // Validate all fields
    const passwordError = validateField("password", formData.password);
    const confirmPasswordError = validateField(
      "confirmPassword",
      formData.confirmPassword,
      formData
    );

    const newErrors: { password?: string; confirmPassword?: string } = {};
    if (passwordError) newErrors.password = passwordError;
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await withLoadingFlag(setIsLoading, async () => {
      try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({} as { error?: string }));
        const errorMessage = data.error || "Failed to reset password. Please try again.";
        setErrors({ form: errorMessage });
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        const data = await response.json();

        if (data.success) {
          setSuccess(true);
          toast({
            title: "Password Reset!",
            description: "Your password has been reset successfully.",
          });

          // Redirect to login after 2 seconds
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        } else {
          const errorMessage = data.error || "Failed to reset password. Please try again.";
          setErrors({ form: errorMessage });
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
      } catch (error) {
      console.error("Reset password error:", error);
      const errorMessage = "Failed to connect to server. Please try again.";
      setErrors({ form: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      }
    });
  };

  if (!token) {
    return <AuthFormSkeleton />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-page px-4 py-14 md:px-6 md:py-20">
        <div className="flex justify-center">
          <Card className="w-full max-w-[400px] p-8" variant="float">
            {/* Header */}
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-inset">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <h1 className="font-semibold text-2xl tracking-[-0.04em]">Reset password</h1>
              <p className="mt-2 text-muted-foreground text-sm">
                {success
                  ? "Password reset successful! Redirecting to login..."
                  : "Enter your new password"}
              </p>
            </div>

            {success ? (
              <div className="rounded-lg border border-success/25 bg-success/[0.07] p-4 text-center" role="status">
                <p className="text-foreground text-sm">
                  Your password has been reset successfully. Redirecting to login...
                </p>
              </div>
            ) : (
              <form className="space-y-4" noValidate onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    autoComplete="new-password"
                    autoFocus
                    disabled={isLoading}
                    id="password"
                    minLength={6}
                    name="password"
                    onBlur={(e) => {
                      const error = validateField("password", e.target.value);
                      setErrors((prev) => ({ ...prev, password: error }));
                    }}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    required
                    type="password"
                    value={formData.password}
                  />
                  {errors.password && (
                    <p className="mt-1.5 text-destructive text-xs" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    autoComplete="new-password"
                    disabled={isLoading}
                    id="confirmPassword"
                    minLength={6}
                    name="confirmPassword"
                    onBlur={(e) => {
                      const error = validateField("confirmPassword", e.target.value, formData);
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: error,
                      }));
                    }}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    required
                    type="password"
                    value={formData.confirmPassword}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-destructive text-xs" role="alert">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {errors.form && (
                  <div
                    className="rounded-md border border-destructive/25 bg-destructive/[0.07] px-3 py-2.5"
                    role="alert"
                  >
                    <p className="text-destructive text-sm">{errors.form}</p>
                  </div>
                )}

                <Button className="w-full" disabled={isLoading} type="submit">
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="/login"
              >
                ← Back to Login
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
