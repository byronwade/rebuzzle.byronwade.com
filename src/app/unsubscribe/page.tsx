"use client";

import { CheckCircle2, Mail, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "not-found"
  >("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const errorParam = searchParams.get("error");

    // Handle error cases from API redirects
    if (errorParam) {
      setStatus("error");
      if (errorParam === "not-found") {
        toast({
          title: "Not Found",
          description: "No active subscription found for this email.",
          variant: "destructive",
        });
      } else if (errorParam === "server-error") {
        toast({
          title: "Server Error",
          description: "An error occurred while processing your request.",
          variant: "destructive",
        });
      }
      return;
    }

    if (!emailParam) {
      setStatus("not-found");
      return;
    }

    setEmail(emailParam);

    // Unsubscribe via API
    const unsubscribe = async () => {
      try {
        const response = await fetch("/api/notifications/email/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailParam }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          toast({
            title: "Unsubscribed",
            description: "You've been unsubscribed from email notifications.",
          });
        } else {
          setStatus("error");
          toast({
            title: "Error",
            description:
              data.error || "Failed to unsubscribe. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Unsubscribe error:", error);
        setStatus("error");
        toast({
          title: "Error",
          description: "Failed to unsubscribe. Please try again.",
          variant: "destructive",
        });
      }
    };

    unsubscribe();
  }, [searchParams, toast]);

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div className="flex justify-center">
          <Card className="w-full max-w-md p-8">
            {status === "loading" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100">
                  <Mail className="h-8 w-8 text-purple-600" />
                </div>
                <h1 className="mb-2 font-semibold text-base md:text-lg">
                  Unsubscribing...
                </h1>
                <p className="text-muted-foreground text-sm">
                  Please wait while we process your request.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="mb-2 font-semibold text-base md:text-lg">
                  Successfully Unsubscribed
                </h1>
                <p className="mb-6 text-muted-foreground text-sm">
                  {email && (
                    <>
                      You've been unsubscribed from email notifications for{" "}
                      <strong>{email}</strong>.
                    </>
                  )}
                  {!email &&
                    "You've been unsubscribed from email notifications."}
                </p>
                <p className="mb-6 text-muted-foreground text-sm">
                  You won't receive any more email notifications from Rebuzzle.
                  You can resubscribe at any time from your account settings.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full">
                    <Link href="/">Go to Home</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/settings">Manage Settings</Link>
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="mb-2 font-semibold text-base md:text-lg">
                  Unsubscribe Failed
                </h1>
                <p className="mb-6 text-muted-foreground text-sm">
                  We couldn't process your unsubscribe request. This might be
                  because the link has expired or is invalid.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full">
                    <Link href="/settings">Manage Settings</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/">Go to Home</Link>
                  </Button>
                </div>
              </div>
            )}

            {status === "not-found" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <Mail className="h-8 w-8 text-gray-600" />
                </div>
                <h1 className="mb-2 font-semibold text-base md:text-lg">
                  Invalid Link
                </h1>
                <p className="mb-6 text-muted-foreground text-sm">
                  This unsubscribe link is invalid or missing required
                  information. Please use the unsubscribe link from your email,
                  or manage your preferences in your account settings.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full">
                    <Link href="/settings">Manage Settings</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/">Go to Home</Link>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
