"use client";

import { Lock, LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { safeInternalRedirect } from "@/lib/safe-internal-redirect";
import { safeJsonParse } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [firstErrorField, setFirstErrorField] = useState<string | null>(null);

  const validateField = (name: string, value: string): string | undefined => {
    if (name === "email") {
      if (!value.trim()) {
        return "Email is required";
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return "Please enter a valid email address";
      }
    }
    if (name === "password") {
      if (!value) {
        return "Password is required";
      }
      if (value.length < 6) {
        return "Password must be at least 6 characters";
      }
    }
    return;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const fieldName = e.target.name as "email" | "password";
    const error = validateField(fieldName, e.target.value);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name as "email" | "password";
    const trimmedValue = fieldName === "email" ? e.target.value.trim() : e.target.value;

    setFormData((prev) => ({ ...prev, [fieldName]: trimmedValue }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const emailError = validateField("email", formData.email);
    const passwordError = validateField("password", formData.password);

    const newErrors: { email?: string; password?: string } = {};
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focus first error field
      const firstError = Object.keys(newErrors)[0];
      if (firstError) {
        setFirstErrorField(firstError);
        document.getElementById(firstError)?.focus();
      }
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies in request
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await safeJsonParse<{ success: boolean; error?: string }>(response);

      if (response.ok && data?.success) {
        // Cookie is set by server, refresh auth state immediately
        await refreshAuth();

        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });

        const nextPath = safeInternalRedirect(
          new URLSearchParams(window.location.search).get("next")
        );
        setTimeout(() => {
          router.push(nextPath);
        }, 1000);
      } else {
        const errorMessage = data?.error || "Invalid credentials. Please try again.";
        setErrors({ form: errorMessage });
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
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

  // Focus first error field when it changes
  React.useEffect(() => {
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.focus();
        setFirstErrorField(null);
      }
    }
  }, [firstErrorField]);

  const handleGuestPlay = () => {
    // Set guest mode in localStorage
    localStorage.setItem("guestMode", "true");
    router.push("/");
  };

  return (
    <Layout>
      <div className="mx-auto max-w-page px-4 py-14 md:px-6 md:py-20">
        <div className="flex justify-center">
          <Card className="w-full max-w-[400px] p-8" variant="float">
            {/* Header */}
            <div className="mb-7 text-center">
              <h1 className="mb-2 font-semibold text-2xl tracking-[-0.04em]">Welcome back.</h1>
              <p className="mt-2 text-muted-foreground text-sm">
                Log in to track your progress and compete
              </p>
            </div>

            {/* Form */}
            <form aria-label="Login form" className="space-y-4" noValidate onSubmit={handleSubmit}>
              {/* Form-level error */}
              {errors.form && (
                <div
                  aria-live="polite"
                  className="rounded-md border border-destructive/25 bg-destructive/[0.07] px-3 py-2.5 text-destructive text-sm"
                  role="alert"
                >
                  {errors.form}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-subtle"
                  />
                  <Input
                    aria-describedby={errors.email ? "email-error" : undefined}
                    aria-invalid={!!errors.email}
                    autoComplete="email"
                    className={
                      errors.email
                        ? "border-destructive/60 pl-10 focus-visible:border-destructive focus-visible:ring-destructive/15"
                        : "pl-10"
                    }
                    id="email"
                    inputMode="email"
                    name="email"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="your@email.com…"
                    required
                    spellCheck="false"
                    type="email"
                    value={formData.email}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs" id="email-error" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-subtle"
                  />
                  <Input
                    aria-describedby={errors.password ? "password-error" : "password-help"}
                    aria-invalid={!!errors.password}
                    autoComplete="current-password"
                    className={
                      errors.password
                        ? "border-destructive/60 pl-10 focus-visible:border-destructive focus-visible:ring-destructive/15"
                        : "pl-10"
                    }
                    id="password"
                    minLength={6}
                    name="password"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Enter your password…"
                    required
                    type="password"
                    value={formData.password}
                  />
                </div>
                {errors.password ? (
                  <p className="text-destructive text-xs" id="password-error" role="alert">
                    {errors.password}
                  </p>
                ) : (
                  <p className="text-subtle text-xs" id="password-help">
                    Must be at least 6 characters
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                aria-busy={isLoading}
                className="w-full"
                disabled={isLoading}
                size="lg"
                type="submit"
              >
                {isLoading ? (
                  <>
                    <div
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60"
                    />
                    <span>Logging in…</span>
                  </>
                ) : (
                  <>
                    <LogIn aria-hidden="true" className="h-4 w-4" data-icon="inline-end" />
                    Log in
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <Separator />
              <span className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 bg-card px-3 font-mono text-[11px] text-subtle uppercase tracking-[0.1em]">
                or
              </span>
            </div>

            {/* Guest Play */}
            <Button className="w-full" onClick={handleGuestPlay} size="lg" variant="outline">
              Continue as guest
            </Button>

            {/* Signup Link */}
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  href="/signup"
                >
                  Sign up
                </Link>
              </p>
            </div>

            {/* Back Link */}
            <div className="mt-6 text-center">
              <Link
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="/"
              >
                ← Back to the puzzle
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
