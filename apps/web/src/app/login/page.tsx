"use client";

import { Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import { AuthField, AuthNotice, AuthShell, authFooterLink } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { safeInternalRedirect } from "@/lib/safe-internal-redirect";
import { safeJsonParse } from "@/lib/utils";
import { withLoadingFlag } from "@/lib/with-loading-flag";

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
  const focusField = (id: string | null) => {
    if (id) document.getElementById(id)?.focus();
  };

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
        focusField(firstError);
      }
      return;
    }

    setErrors({});

    await withLoadingFlag(setIsLoading, async () => {
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
            description: "You’ve successfully logged in.",
          });

          router.push(
            safeInternalRedirect(new URLSearchParams(window.location.search).get("next"))
          );
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
      }
    });
  };

  const handleGuestPlay = () => {
    // Set guest mode in localStorage
    localStorage.setItem("guestMode", "true");
    router.push("/");
  };

  return (
    <AuthShell
      description="Keep your streak, points and achievements on every device."
      footer={
        <>
          <p>
            New to Rebuzzle?{" "}
            <Link className={authFooterLink} href="/signup">
              Create an account
            </Link>
          </p>
          <p>
            <button
              className="inline-flex min-h-11 items-center rounded-md px-3 text-muted-foreground transition-colors hover:text-foreground focus-ring sm:min-h-9"
              onClick={handleGuestPlay}
              type="button"
            >
              Or keep playing as a guest
            </button>
          </p>
        </>
      }
      title="Welcome back."
    >
      <form aria-label="Log in" className="space-y-4" noValidate onSubmit={handleSubmit}>
        {errors.form ? <AuthNotice>{errors.form}</AuthNotice> : null}

        <AuthField
          autoComplete="email"
          error={errors.email}
          icon={Mail}
          id="email"
          inputMode="email"
          label="Email"
          name="email"
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder="you@example.com"
          required
          spellCheck={false}
          type="email"
          value={formData.email}
        />

        <AuthField
          aside={
            <Link
              className="relative rounded text-muted-foreground text-xs transition-colors after:absolute after:-inset-x-2 after:-top-4 after:-bottom-1.5 after:content-[''] hover:text-foreground focus-ring"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
          }
          autoComplete="current-password"
          error={errors.password}
          icon={Lock}
          id="password"
          label="Password"
          minLength={6}
          name="password"
          onBlur={handleBlur}
          onChange={handleChange}
          required
          type="password"
          value={formData.password}
        />

        <Button
          aria-busy={isLoading}
          className="w-full"
          disabled={isLoading}
          size="lg"
          type="submit"
        >
          {isLoading ? (
            <Loader2
              aria-hidden
              className="h-4 w-4 motion-safe:animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          {isLoading ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthShell>
  );
}
