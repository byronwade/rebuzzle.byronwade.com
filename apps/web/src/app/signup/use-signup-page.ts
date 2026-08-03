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


export function useSignupPage(props: any = {}) {

  const router = useRouter();
  const { toast } = useToast();
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
  const [firstErrorField, setFirstErrorField] = useState<string | null>(null);

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
        return "Passwords don't match";
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
        document.getElementById(firstError)?.focus();
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
        const data = await response.json().catch(() => ({} as { error?: string }));
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
          toast({
            title: "Account created!",
            description: "Your account has been created successfully. Redirecting to login…",
          });

          // Store user data temporarily
          localStorage.setItem("username", formData.username.trim());

          const nextPath = safeInternalRedirect(
            new URLSearchParams(window.location.search).get("next")
          );
          setTimeout(() => {
            router.push(`/login?next=${encodeURIComponent(nextPath)}`);
          }, 1500);
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



  return {
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
  };
}
