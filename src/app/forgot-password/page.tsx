"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        toast({
          title: "Email sent!",
          description: "Check your inbox for password reset instructions.",
        });
      } else {
        const errorMessage =
          data.error || "Failed to send reset email. Please try again.";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div className="flex justify-center">
          <Card className="w-full max-w-md p-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h1 className="mb-2 font-semibold text-base md:text-lg">
                Forgot Password?
              </h1>
              <p className="text-muted-foreground text-sm">
                {success
                  ? "Check your email for reset instructions"
                  : "Enter your email and we'll send you a reset link"}
              </p>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                  <p className="text-green-800 text-sm dark:text-green-200">
                    If an account exists with this email, a password reset link
                    has been sent. Check your inbox and follow the instructions.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={() => router.push("/login")}
                  >
                    Back to Login
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSuccess(false);
                      setEmail("");
                    }}
                    variant="outline"
                  >
                    Send Another Email
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    autoFocus
                    disabled={isLoading}
                    id="email"
                    name="email"
                    onBlur={(e) => {
                      const emailError = validateEmail(e.target.value);
                      setError(emailError || null);
                    }}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="your@email.com"
                    required
                    type="email"
                    value={email}
                  />
                  {error && (
                    <p className="mt-1 text-red-600 text-sm dark:text-red-400">
                      {error}
                    </p>
                  )}
                </div>

                <Button className="w-full" disabled={isLoading} type="submit">
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                className="text-muted-foreground text-sm hover:text-foreground"
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
