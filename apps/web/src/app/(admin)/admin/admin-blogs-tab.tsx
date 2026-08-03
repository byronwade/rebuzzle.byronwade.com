"use client";
import { BookOpen, Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { EditBlogDialog } from "@/components/admin/EditBlogDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format as formatDateFns } from "date-fns";
import type { BlogPost } from "./admin-dashboard-types";

export function BlogsTab({
  blogs,
  loading,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  onSave,
  editingBlog,
  onCancelEdit,
  creatingBlog,
  onCreateNew,
}: {
  blogs: BlogPost[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (blog: BlogPost) => void;
  onDelete: (id: string) => void;
  onSave: (blog: BlogPost) => void;
  editingBlog: BlogPost | null;
  onCancelEdit: () => void;
  creatingBlog: boolean;
  onCreateNew: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-xl tracking-tight md:text-2xl">
            Blog Posts Management
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage blog posts and content for your platform
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" data-icon="inline-start" />
          Create Blog Post
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card className="p-5" key={i}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <Card className="border-2 border-dashed p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-semibold text-lg">No blog posts found</h3>
          <p className="mb-6 text-muted-foreground text-sm">
            Get started by creating your first blog post
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" data-icon="inline-start" />
            Create Blog Post
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {blogs.map((blog) => (
              <Card
                className="border p-5 transition-shadow hover:shadow-md"
                key={blog.id || blog.slug}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="mb-1 font-semibold text-base">{blog.title}</h3>
                    {blog.excerpt && (
                      <p className="line-clamp-2 text-muted-foreground text-sm">{blog.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                      <span className="font-mono">{blog.slug}</span>
                      <span>•</span>
                      <span>Published: {formatDateFns(new Date(blog.publishedAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-label="Blog post actions" size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" data-icon="inline-start" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => onEdit(blog)}>
                        <Edit className="mr-2 h-4 w-4" data-icon="inline-start" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(blog.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" data-icon="inline-start" />
                        Delete…
                      </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>

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

      <EditBlogDialog
        blog={editingBlog as any}
        isCreating={creatingBlog}
        onOpenChange={(open) => {
          if (!open) {
            onCancelEdit();
          }
        }}
        onSave={onSave as any}
        open={!!editingBlog}
      />
    </div>
  );
}
