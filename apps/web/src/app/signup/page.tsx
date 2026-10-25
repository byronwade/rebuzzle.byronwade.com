"use client";

import { Check, Loader2, Lock, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import { AuthField, AuthNotice, AuthShell, authFooterLink } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { safeInternalRedirect } from "@/lib/safe-internal-redirect";
import { withLoadingFlag } from "@/lib/with-loading-flag";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});
  const focusField = (id: string | null) => {
    if (id) document.getElementById(id)?.focus();
  };

  const validateField = (
    name: string,
    value: string,
    allData?: typeof formData
  ): string | undefined => {
    if (name === "username") {
      if (!value.trim()) {
        return "Username is required";
      }
      if (value.trim().length < 3) {
        return "Username must be at least 3 characters";
      }
    }
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
    if (name === "confirmPassword") {
      if (!value) {
        return "Please confirm your password";
      }
      if (allData && value !== allData.password) {
        return "Passwords don’t match";
      }
    }
    return;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const fieldName = e.target.name as keyof typeof formData;
    const error = validateField(fieldName, e.target.value, formData);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name as keyof typeof formData;
    const trimmedValue =
      fieldName === "email" || fieldName === "username" ? e.target.value.trim() : e.target.value;

    setFormData((prev) => ({ ...prev, [fieldName]: trimmedValue }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }

    // Re-validate confirmPassword if password changes
    if (fieldName === "password" && formData.confirmPassword) {
      const confirmError = validateField("confirmPassword", formData.confirmPassword, {
        ...formData,
        password: trimmedValue,
      });
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const usernameError = validateField("username", formData.username, formData);
    const emailError = validateField("email", formData.email, formData);
    const passwordError = validateField("password", formData.password, formData);
    const confirmPasswordError = validateField(
      "confirmPassword",
      formData.confirmPassword,
      formData
    );

    const newErrors: typeof errors = {};
    if (usernameError) newErrors.username = usernameError;
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

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
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username.trim(),
            email: formData.email.trim(),
            password: formData.password,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}) as { error?: string });
          const errorMessage = data.error || "Something went wrong. Please try again.";
          setErrors({ form: errorMessage });
          toast({
            title: "Signup failed",
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          const data = await response.json();

          if (data.success) {
            // The signup response already sets the session cookie, so go straight on
            // rather than making the player log in again.
            await refreshAuth();
            toast({
              title: "You're in!",
              description: data.convertedFromGuest
                ? "Your account is ready and today's progress came with you."
                : "Your account is ready.",
            });

            // Store user data temporarily
            localStorage.setItem("username", formData.username.trim());

            router.push(
              safeInternalRedirect(new URLSearchParams(window.location.search).get("next"))
            );
          } else {
            const errorMessage = data.error || "Something went wrong. Please try again.";
            setErrors({ form: errorMessage });
            toast({
              title: "Signup failed",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Signup error:", error);
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

  return (
    <AuthShell
      description="Free, and it keeps your streak, points and achievements on every device."
      footer={
        <p>
          Already have an account?{" "}
          <Link className={authFooterLink} href="/login">
            Log in
          </Link>
        </p>
      }
      title="Create your account."
    >
      <form aria-label="Create account" className="space-y-4" noValidate onSubmit={handleSubmit}>
        {errors.form ? <AuthNotice>{errors.form}</AuthNotice> : null}

        <AuthField
          autoComplete="username"
          error={errors.username}
          help="Shown on the leaderboard. At least 3 characters."
          icon={User}
          id="username"
          label="Username"
          minLength={3}
          name="username"
          onBlur={handleBlur}
          onChange={handleChange}
          required
          spellCheck={false}
          type="text"
          value={formData.username}
        />

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
          autoComplete="new-password"
          error={errors.password}
          help="At least 6 characters."
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

        <AuthField
          autoComplete="new-password"
          error={errors.confirmPassword}
          icon={Lock}
          id="confirmPassword"
          label="Confirm password"
          minLength={6}
          name="confirmPassword"
          onBlur={handleBlur}
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
            <Loader2
              aria-hidden
              className="h-4 w-4 motion-safe:animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          {isLoading ? "Creating account…" : "Create account"}
        </Button>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-border border-t pt-4 text-muted-foreground text-xs">
          {SIGNUP_PERKS.map((perk) => (
            <li className="flex items-center gap-1.5" key={perk}>
              <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-success" />
              {perk}
            </li>
          ))}
        </ul>
      </form>
    </AuthShell>
  );
}

const SIGNUP_PERKS = ["Streak and stats", "Leaderboard rank", "Achievements", "Daily reminders"];
