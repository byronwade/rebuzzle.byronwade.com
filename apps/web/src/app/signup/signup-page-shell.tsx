"use client";

import { Check, Lock, Mail, User, UserPlus } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { safeInternalRedirect } from "@/lib/safe-internal-redirect";
import { withLoadingFlag } from "@/lib/with-loading-flag";


export function SignupPageShell(props: Record<string, any>) {
  const {
    confirmError,
    confirmPasswordError,
    data,
    emailError,
    emailRegex,
    error,
    errorMessage,
    errors,
    fieldName,
    firstError,
    firstErrorField,
    formData,
    handleBlur,
    handleChange,
    handleSubmit,
    isLoading,
    newErrors,
    nextPath,
    passwordError,
    response,
    router,
    setErrors,
    setFirstErrorField,
    setFormData,
    setIsLoading,
    trimmedValue,
    usernameError,
    validateField
  } = props;
  return (
    <Layout>
      <div className="mx-auto max-w-page px-4 py-14 md:px-6 md:py-20">
        <div className="flex justify-center">
          <Card className="w-full max-w-[400px] p-8" variant="float">
            {/* Header */}
            <div className="mb-7 text-center">
              <h1 className="font-semibold text-2xl tracking-[-0.04em]">Create your account.</h1>
              <p className="mt-2 text-muted-foreground text-sm">
                Keep your streak, points and achievements across devices.
              </p>
            </div>

            {/* Form */}
            <form
              aria-label="Sign up form"
              className="space-y-4"
              noValidate
              onSubmit={handleSubmit}
            >
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
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User
                    aria-hidden="true"
                    className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-subtle"
                  />
                  <Input
                    aria-describedby={errors.username ? "username-error" : "username-help"}
                    aria-invalid={!!errors.username}
                    autoComplete="username"
                    className={
                      errors.username
                        ? "border-destructive/60 pl-10 focus-visible:border-destructive focus-visible:ring-destructive/15"
                        : "pl-10"
                    }
                    id="username"
                    minLength={3}
                    name="username"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Choose a username…"
                    required
                    spellCheck="false"
                    type="text"
                    value={formData.username}
                  />
                </div>
                {errors.username ? (
                  <p className="text-destructive text-xs" id="username-error" role="alert">
                    {errors.username}
                  </p>
                ) : (
                  <p className="text-subtle text-xs" id="username-help">
                    At least 3 characters
                  </p>
                )}
              </div>

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
                    autoComplete="new-password"
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
                    placeholder="Create a password…"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-subtle"
                  />
                  <Input
                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                    aria-invalid={!!errors.confirmPassword}
                    autoComplete="new-password"
                    className={
                      errors.confirmPassword
                        ? "border-destructive/60 pl-10 focus-visible:border-destructive focus-visible:ring-destructive/15"
                        : "pl-10"
                    }
                    id="confirmPassword"
                    minLength={6}
                    name="confirmPassword"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Confirm your password…"
                    required
                    type="password"
                    value={formData.confirmPassword}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs" id="confirmPassword-error" role="alert">
                    {errors.confirmPassword}
                  </p>
                )}
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
                    <span>Creating account…</span>
                  </>
                ) : (
                  <>
                    <UserPlus aria-hidden="true" className="h-4 w-4" data-icon="inline-end" />
                    Create account
                  </>
                )}
              </Button>
            </form>

            {/* Benefits */}
            <div className="mt-6 rounded-lg border border-border bg-accent/50 p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-base text-foreground">
                <Check className="h-5 w-5" />
                What You Get:
              </h2>
              <ul className="space-y-2 text-foreground text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-success" />
                  Track your streak and statistics
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-success" />
                  Compete on the global leaderboard
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-success" />
                  Earn achievements and badges
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-success" />
                  Sync your progress across devices
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-success" />
                  Get daily puzzle notifications
                </li>
              </ul>
            </div>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Already have an account?{" "}
                <Link
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  href="/login"
                >
                  Log in
                </Link>
              </p>
            </div>

            {/* Back Link */}
            <div className="mt-4 text-center">
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

}
