"use client";
import { useState } from "react";
import { exportToCSV } from "@/components/admin/exportUtils";
import { format as formatDateFns } from "date-fns";
import type { User } from "./admin-dashboard-types";
import { AdminUsersTable } from "./admin-users-table";

export function UsersTab({
  users, loading, page, totalPages, onPageChange, onDelete, onSendPasswordReset,
}: {
  users: User[]; loading: boolean; page: number; totalPages: number;
  onPageChange: (page: number) => void; onDelete: (id: string) => void; onSendPasswordReset: (id: string) => void;
}) {

  const [sortField, setSortField] = useState<
    "points" | "streak" | "createdAt" | "lastLogin" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: "points" | "streak" | "createdAt" | "lastLogin") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: number | string | Date = 0;
    let bValue: number | string | Date = 0;

    switch (sortField) {
      case "points":
        aValue = a.stats?.points || 0;
        bValue = b.stats?.points || 0;
        break;
      case "streak":
        aValue = a.stats?.streak || 0;
        bValue = b.stats?.streak || 0;
        break;
      case "createdAt":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "lastLogin":
        aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
        bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
        break;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  const handleExport = () => {
    const exportData = users.map((user) => ({
      Username: user.username,
      Email: user.email,
      Points: user.stats?.points || 0,
      Level: user.stats?.level || 0,
      Wins: user.stats?.wins || 0,
      Streak: user.stats?.streak || 0,
      "Joined Date": formatDateFns(new Date(user.createdAt), "MMM d, yyyy"),
      "Last Login": user.lastLogin ? formatDateFns(new Date(user.lastLogin), "MMM d, yyyy") : "Never",
    }));
    exportToCSV(exportData, `users-export-${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <AdminUsersTable
      loading={loading} page={page} totalPages={totalPages} onPageChange={onPageChange}
      onDelete={onDelete} onSendPasswordReset={onSendPasswordReset}
      sortField={sortField} sortDirection={sortDirection} handleSort={handleSort}
      sortedUsers={sortedUsers} handleExport={handleExport}
    />
  );
}
