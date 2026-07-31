import AdminHeader from "@/components/AdminHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="relative z-10">{children}</main>
      <footer className="border-border border-t bg-card/50 text-center text-muted-foreground text-sm">
        <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
          <p>Rebuzzle Admin Dashboard</p>
        </div>
      </footer>
    </div>
  );
}
