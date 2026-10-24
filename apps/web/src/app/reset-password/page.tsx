"use client";

import { Loader2, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { AuthField, AuthNotice, AuthShell, authFooterLink } from "@/components/auth/AuthShell";
import { AuthFormSkeleton } from "@/components/page-skeletons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { withLoadingFlag } from "@/lib/with-loading-flag";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const token = searchParams.get("token");
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
    if (token) return;
    toast({
      title: "Invalid Link",
      description: "No reset token provided. Please request a new password reset.",
      variant: "destructive",
    });
    window.location.assign("/forgot-password");
  }, [token, toast]);

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
          const data = await response.json().catch(() => ({}) as { error?: string });
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
    <AuthShell
      description={
        success
          ? "Taking you to log in with your new password…"
          : "Pick something you haven't used here before."
      }
      footer={
        <p>
          <Link className={authFooterLink} href="/login">
            Back to log in
          </Link>
        </p>
      }
      title={success ? "Password updated." : "Choose a new password."}
    >
      {success ? (
        <AuthNotice tone="success">Your password has been reset.</AuthNotice>
      ) : (
        <form
          aria-label="Choose a new password"
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit}
        >
          {errors.form ? <AuthNotice>{errors.form}</AuthNotice> : null}
          <AuthField
            autoComplete="new-password"
            autoFocus
            disabled={isLoading}
            error={errors.password}
            help="At least 6 characters."
            icon={Lock}
            id="password"
            label="New password"
            minLength={6}
            name="password"
            onBlur={(e) => {
              const error = validateField("password", e.target.value);
              setErrors((prev) => ({ ...prev, password: error }));
            }}
            onChange={handleChange}
            required
            type="password"
            value={formData.password}
          />
          <AuthField
            autoComplete="new-password"
            disabled={isLoading}
            error={errors.confirmPassword}
            icon={Lock}
            id="confirmPassword"
            label="Confirm new password"
            minLength={6}
            name="confirmPassword"
            onBlur={(e) => {
              const error = validateField("confirmPassword", e.target.value, formData);
              setErrors((prev) => ({ ...prev, confirmPassword: error }));
            }}
            onChange={handleChange}
            required
            type="password"
            value={formData.confirmPassword}
          />
          <Button
            aria-busy={isLoading}
            className="w-full"
            disabled={isLoading}
            size="lg"
            type="submit"
          >
            {isLoading ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" data-icon="inline-start" />
            ) : null}
            {isLoading ? "Saving…" : "Save new password"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
