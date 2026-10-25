import { CheckCircle2, Mail, XCircle } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { ContentPageSkeleton } from "@/components/page-skeletons";
import { StatusPage } from "@/components/StatusPage";
import { Button } from "@/components/ui/button";
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

async function UnsubscribePageContent({ searchParams }: { searchParams: SearchParams }) {
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
      {status === "success" ? (
        <StatusPage
          actions={
            <>
              <Button asChild size="lg">
                <Link href="/">Back to the puzzle</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/settings">Manage settings</Link>
              </Button>
            </>
          }
          description={
            email ? (
              <>
                <strong className="font-medium text-foreground">{email}</strong> won’t get Rebuzzle
                notification emails anymore.
              </>
            ) : (
              "You won't get Rebuzzle notification emails anymore."
            )
          }
          eyebrow="Email preferences"
          footnote="Changed your mind? Turn notifications back on any time in settings."
          icon={CheckCircle2}
          title="You're unsubscribed."
          tone="success"
        />
      ) : status === "error" ? (
        <StatusPage
          actions={
            <>
              <Button asChild size="lg">
                <Link href="/settings">Manage settings</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/">Back to the puzzle</Link>
              </Button>
            </>
          }
          description="The link may have expired or been copied incompletely. You can turn emails off directly in settings."
          eyebrow="Email preferences"
          icon={XCircle}
          title="That didn't go through."
          tone="destructive"
        />
      ) : (
        <StatusPage
          actions={
            <Button asChild size="lg">
              <Link href="/settings">Manage settings</Link>
            </Button>
          }
          description="This unsubscribe link is missing an email address. Open the link from your notification email, or manage preferences in settings."
          eyebrow="Email preferences"
          icon={Mail}
          title="Missing email."
        />
      )}
    </Layout>
  );
}

/** Sync shell — stream the request-time body inside Suspense (Cache Components). */
export default function UnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<ContentPageSkeleton />}>
      <UnsubscribePageContent searchParams={searchParams} />
    </Suspense>
  );
}
