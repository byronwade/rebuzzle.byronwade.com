"use client";
import { ArrowUpDown, Download, Mail, MoreHorizontal, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format as formatDateFns } from "date-fns";

export function AdminUsersTable(props: Record<string, any>) {
  const { loading, page, totalPages, onPageChange, onDelete, onSendPasswordReset, sortField, sortDirection, handleSort, sortedUsers, handleExport } = props;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-xl tracking-tight md:text-2xl">Users Management</h2>
          <p className="mt-1 text-muted-foreground text-sm">View and manage all registered users</p>
        </div>
        <Button onClick={handleExport} size="sm" variant="outline">
          <Download className="mr-2 h-4 w-4" data-icon="inline-start" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <Card>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div className="flex items-center gap-4" key={i}>
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <div className="ml-auto flex gap-2">
                      <Skeleton className="h-9 w-9" />
                      <Skeleton className="h-9 w-9" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : users.length === 0 ? (
        <Card className="border-2 border-dashed p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-semibold text-lg">No users found</h3>
          <p className="text-muted-foreground text-sm">No users have registered yet</p>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Username</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      className="-ml-2 h-8 px-2 hover:bg-muted"
                      onClick={() => handleSort("points")}
                      size="sm"
                      variant="ghost"
                    >
                      Points
                      <ArrowUpDown className="ml-2 h-3 w-3" data-icon="inline-end" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      className="-ml-2 h-8 px-2 hover:bg-muted"
                      onClick={() => handleSort("streak")}
                      size="sm"
                      variant="ghost"
                    >
                      Streak
                      <ArrowUpDown className="ml-2 h-3 w-3" data-icon="inline-end" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold">Level</TableHead>
                  <TableHead className="font-semibold">Wins</TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      className="-ml-2 h-8 px-2 hover:bg-muted"
                      onClick={() => handleSort("lastLogin")}
                      size="sm"
                      variant="ghost"
                    >
                      Last Login
                      <ArrowUpDown className="ml-2 h-3 w-3" data-icon="inline-end" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      className="-ml-2 h-8 px-2 hover:bg-muted"
                      onClick={() => handleSort("createdAt")}
                      size="sm"
                      variant="ghost"
                    >
                      Joined
                      <ArrowUpDown className="ml-2 h-3 w-3" data-icon="inline-end" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-8 text-center text-muted-foreground" colSpan={9}>
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedUsers.map((user) => (
                    <TableRow className="hover:bg-muted/50" key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {user.stats?.points.toLocaleString("en-US") || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          {user.stats?.streak || 0}
                          {user.stats && user.stats.streak > 0 && (
                            <span className="text-neutral-700 dark:text-neutral-300 text-xs dark:text-neutral-500 dark:text-neutral-400">
                              🔥
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
                          {user.stats?.level || 0}
                        </span>
                      </TableCell>
                      <TableCell>{user.stats?.wins.toLocaleString("en-US") || 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.lastLogin ? (
                          formatDateFns(new Date(user.lastLogin), "MMM d, yyyy")
                        ) : (
                          <span className="text-muted-foreground/60">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateFns(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-label="User actions" size="sm" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" data-icon="inline-start" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => onSendPasswordReset(user.id)}>
                              <Mail className="mr-2 h-4 w-4" data-icon="inline-start" />
                              Send Password Reset
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDelete(user.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" data-icon="inline-start" />
                              Delete… User
                            </DropdownMenuItem>
                      </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    onClick={() => page > 1 && onPageChange(page - 1)}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        className="cursor-pointer"
                        isActive={page === pageNum}
                        onClick={() => onPageChange(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 7 && page < totalPages - 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    className={
                      page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                    onClick={() => page < totalPages && onPageChange(page + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
