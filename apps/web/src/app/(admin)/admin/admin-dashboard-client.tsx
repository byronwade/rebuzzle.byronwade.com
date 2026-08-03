"use client";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { useAdminDashboard } from "./use-admin-dashboard";

export default function AdminPage() {
  const state = useAdminDashboard();
  return <AdminDashboardShell {...state} />;
}
