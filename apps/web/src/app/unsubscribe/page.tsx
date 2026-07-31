import { CheckCircle2, Mail, XCircle } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCollection } from "@/db/mongodb";

type SearchParams = Promise<{
  email?: string;
  userId?: string;
  error?: string;
  success?: string;
}>;

async function disableSubscription(opts: {
  email?: string;
  userId?: string;
}): Promise<"ok" | "error"> {
  try {
    const subscriptionsCollection = getCollection("emailSubscriptions");
    const query: { email?: string; userId?: string } = {};
    if (opts.userId) {
      query.userId = opts.userId;
    } else if (opts.email) {
      query.email = opts.email.toLowerCase().trim();
    } else {
      return "error";
    }

    await subscriptionsCollection.updateOne(query, {
      $set: {
        enabled: false,
        updatedAt: new Date(),
      },
    });
    return "ok";
  } catch (error) {
    console.error("[Unsubscribe] Failed:", error);
    return "error";
  }
}

export default async function UnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;

  let status: "success" | "error" | "not-found" = "not-found";
  const email: string | null = params.email ?? null;

  if (params.error) {
    status = "error";
  } else if (params.success === "true") {
    status = "success";
  } else if (params.email || params.userId) {
    const result = await disableSubscription({
      email: params.email,
      userId: params.userId,
    });
    status = result === "ok" ? "success" : "error";
  }

  return (
    <Layout>
      <div className="mx-auto max-w-page px-4 py-14 md:px-6 md:py-20">
        <div className="flex justify-center">
          <Card className="w-full max-w-[400px] p-8" variant="float">
            {status === "success" && (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-inset">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <h1 className="font-semibold text-2xl tracking-[-0.04em]">Unsubscribed</h1>
                <p className="mt-3 text-muted-foreground text-sm leading-6">
                  {email ? (
                    <>
                      You&apos;ve been unsubscribed from email notifications for{" "}
                      <strong>{email}</strong>.
                    </>
                  ) : (
                    "You've been unsubscribed from email notifications."
                  )}
                </p>
                <p className="mt-3 text-muted-foreground text-sm leading-6">
                  You won&apos;t receive any more email notifications from Rebuzzle. You can
                  resubscribe at any time from your account settings.
                </p>
                <div className="mt-7 flex flex-col gap-2">
                  <Button asChild className="w-full">
                    <Link href="/">Back to the puzzle</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/settings">Manage settings</Link>
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-inset">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <h1 className="font-semibold text-2xl tracking-[-0.04em]">
                  Unsubscribe didn&apos;t go through
                </h1>
                <p className="mt-3 text-muted-foreground text-sm leading-6">
                  We couldn&apos;t process your unsubscribe request. This might be because the link
                  has expired or is invalid.
                </p>
                <div className="mt-7 flex flex-col gap-2">
                  <Button asChild className="w-full">
                    <Link href="/settings">Manage settings</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/">Back to the puzzle</Link>
                  </Button>
                </div>
              </div>
            )}

            {status === "not-found" && (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-inset">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <h1 className="font-semibold text-2xl tracking-[-0.04em]">Missing email</h1>
                <p className="mt-3 text-muted-foreground text-sm leading-6">
                  This unsubscribe link is missing an email address. Open the link from your
                  notification email, or manage preferences in settings.
                </p>
                <div className="mt-7">
                  <Button asChild className="w-full">
                    <Link href="/settings">Manage settings</Link>
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
