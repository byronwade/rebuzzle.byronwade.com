"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
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
    } catch (error) {
      console.error("Reset password error:", error);
      const errorMessage = "Failed to connect to server. Please try again.";
      setErrors({ form: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
          <div className="flex justify-center">
            <Card className="w-full max-w-md p-8">
              <p className="text-center text-muted-foreground">Loading...</p>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div className="flex justify-center">
          <Card className="w-full max-w-md p-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-700 to-neutral-800">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h1 className="mb-2 font-semibold text-base md:text-lg">Reset Password</h1>
              <p className="text-muted-foreground text-sm">
                {success
                  ? "Password reset successful! Redirecting to login..."
                  : "Enter your new password"}
              </p>
            </div>

            {success ? (
              <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                <p className="text-green-800 text-sm dark:text-green-200">
                  Your password has been reset successfully. Redirecting to login...
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    autoFocus
                    disabled={isLoading}
                    id="password"
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
                    <p className="mt-1 text-red-600 text-sm dark:text-red-400">{errors.password}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    disabled={isLoading}
                    id="confirmPassword"
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
                    <p className="mt-1 text-red-600 text-sm dark:text-red-400">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {errors.form && (
                  <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                    <p className="text-red-600 text-sm dark:text-red-400">{errors.form}</p>
                  </div>
                )}

                <Button className="w-full" disabled={isLoading} type="submit">
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link className="text-muted-foreground text-sm hover:text-foreground" href="/login">
                ← Back to Login
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
