"use client";
import { Edit, MoreHorizontal, Plus, Puzzle as PuzzleIcon, Trash2 } from "lucide-react";
import { EditPuzzleDialog } from "@/components/admin/EditPuzzleDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format as formatDateFns } from "date-fns";
import type { Puzzle } from "./admin-dashboard-types";

export function PuzzlesTab({
  puzzles,
  loading,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  onSave,
  editingPuzzle,
  onCancelEdit,
  creatingPuzzle,
  onCreateNew,
}: {
  puzzles: Puzzle[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (puzzle: Puzzle) => void;
  onDelete: (id: string) => void;
  onSave: (puzzle: Puzzle) => void;
  editingPuzzle: Puzzle | null;
  onCancelEdit: () => void;
  creatingPuzzle: boolean;
  onCreateNew: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-xl tracking-tight md:text-2xl">Puzzles Management</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Create, edit, and manage puzzles in your collection
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" data-icon="inline-start" />
          Create Puzzle
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card className="p-5" key={i}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
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
      ) : puzzles.length === 0 ? (
        <Card className="border-2 border-dashed p-12 text-center">
          <PuzzleIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-semibold text-lg">No puzzles found</h3>
          <p className="mb-6 text-muted-foreground text-sm">
            Get started by creating your first puzzle
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" data-icon="inline-start" />
            Create Puzzle
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {puzzles.map((puzzle) => (
              <Card className="border p-5 transition-shadow hover:shadow-md" key={puzzle.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-base">{puzzle.puzzle}</h3>
                          {puzzle.puzzleType && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary text-xs">
                              {puzzle.puzzleType}
                            </span>
                          )}
                          {!puzzle.active && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Answer: <strong className="text-foreground">{puzzle.answer}</strong>
                        </p>
                        {puzzle.explanation && (
                          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                            {puzzle.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                      <span>Published: {formatDateFns(new Date(puzzle.publishedAt), "MMM d, yyyy")}</span>
                      {puzzle.difficulty && (
                        <span className="capitalize">Difficulty: {puzzle.difficulty}</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-label="Puzzle actions" size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" data-icon="inline-start" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => onEdit(puzzle)}>
                        <Edit className="mr-2 h-4 w-4" data-icon="inline-start" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(puzzle.id)}
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

      <EditPuzzleDialog
        isCreating={creatingPuzzle}
        onOpenChange={(open) => {
          if (!open) {
            onCancelEdit();
          }
        }}
        onSave={onSave as any}
        open={!!editingPuzzle}
        puzzle={editingPuzzle as any}
      />
    </div>
  );
}
