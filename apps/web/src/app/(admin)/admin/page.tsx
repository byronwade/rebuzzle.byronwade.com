import AdminDashboardClient from "./admin-dashboard-client";

/**
 * Admin dashboard is a large interactive SPA (tabs, CRUD dialogs, charts).
 * Access is gated client-side via /api/admin/check after AuthProvider mounts;
 * converting to a server page would require splitting every tab into RSC islands.
 */
export default function AdminPage() {
  return <AdminDashboardClient />;
}
