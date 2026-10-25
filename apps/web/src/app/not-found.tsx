import { AppLink as Link } from "@/components/AppLink";
import { RebuzzleMark } from "@/components/brand/RebuzzleLogo";
import Layout from "@/components/Layout";
import { StatusPage } from "@/components/StatusPage";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex flex-col items-center">
        <RebuzzleMark className="mt-16 size-12" title="Rebuzzle" />
        <StatusPage
          actions={
            <>
              <Button asChild size="lg">
                <Link href="/">Play today's puzzle</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/blog">Browse the blog</Link>
              </Button>
            </>
          }
          className="min-h-0 pt-6"
          description="That page doesn't exist, or it moved. Today's puzzle is right where you left it."
          eyebrow="404"
          title="Page not found."
        />
      </div>
    </Layout>
  );
}
