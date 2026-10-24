"use client";

import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { AuthField, AuthNotice, AuthShell, authFooterLink } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { withLoadingFlag } from "@/lib/with-loading-flag";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  // The form unmounts on success; move focus to the result so keyboard and
  // screen-reader users land on what changed.
  useEffect(() => {
    if (success) successRef.current?.focus();
  }, [success]);

  const validateEmail = (emailValue: string): string | undefined => {
    if (!emailValue.trim()) {
      return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) {
      return "Please enter a valid email address";
    }
    return;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setError(null);
    await withLoadingFlag(setIsLoading, async () => {
      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}) as { error?: string });
          const errorMessage = data.error || "Failed to send reset email. Please try again.";
          setError(errorMessage);
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
              title: "Email sent!",
              description: "Check your inbox for password reset instructions.",
            });
          } else {
            const errorMessage = data.error || "Failed to send reset email. Please try again.";
            setError(errorMessage);
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Forgot password error:", error);
        const errorMessage = "Failed to connect to server. Please try again.";
        setError(errorMessage);
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
      description={
        success
          ? "If an account uses that email, a reset link is on its way. It expires in an hour."
          : "Enter the email you signed up with and we'll send you a reset link."
      }
      footer={
        <p>
          Remembered it?{" "}
          <Link className={authFooterLink} href="/login">
            Back to log in
          </Link>
        </p>
      }
      title={success ? "Check your inbox." : "Reset your password."}
    >
      {success ? (
        <div className="space-y-4 rounded-lg outline-none" ref={successRef} tabIndex={-1}>
          <AuthNotice tone="success">
            Didn't get it? Check spam, or send it again in a minute.
          </AuthNotice>
          <div className="grid gap-2">
            <Button className="w-full" onClick={() => router.push("/login")}>
              Back to log in
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              variant="outline"
            >
              Use a different email
            </Button>
          </div>
        </div>
      ) : (
        <form aria-label="Reset password" className="space-y-4" noValidate onSubmit={handleSubmit}>
          <AuthField
            autoComplete="email"
            autoFocus
            disabled={isLoading}
            error={error}
            icon={Mail}
            id="email"
            inputMode="email"
            label="Email"
            name="email"
            onBlur={(e) => {
              const emailError = validateEmail(e.target.value);
              setError(emailError || null);
            }}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@example.com"
            required
            spellCheck={false}
            type="email"
            value={email}
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
            {isLoading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
