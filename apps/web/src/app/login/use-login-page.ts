"use client";

import { Lock, LogIn, Mail } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
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
import { withLoadingFlag } from "@/lib/with-loading-flag";


export function useLoginPage(props: any = {}) {

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
        focusField(firstError);
        document.getElementById(firstError)?.focus();
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
      }
    });
  };


  const handleGuestPlay = () => {
    // Set guest mode in localStorage
    localStorage.setItem("guestMode", "true");
    router.push("/");
  };


  return {
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
    handleGuestPlay,
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
    validateField
  };
}
