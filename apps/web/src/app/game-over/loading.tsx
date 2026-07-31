import Layout from "@/components/Layout";

export default function GameOverLoading() {
  return (
    <Layout>
      <div className="flex items-center justify-center py-20">
        <div
          aria-label="Loading results"
          className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"
          role="status"
        />
      </div>
    </Layout>
  );
}
