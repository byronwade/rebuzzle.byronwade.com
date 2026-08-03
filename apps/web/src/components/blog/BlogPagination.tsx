import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  basePath?: string;
  className?: string;
}

export function BlogPagination({
  currentPage,
  totalPages,
  basePath = "/blog/page",
  className,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const showPages = 5; // Number of page buttons to show

    if (totalPages <= showPages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust range if at edges
      if (currentPage <= 3) {
        end = showPages - 1;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - showPages + 2;
      }

      // Add ellipsis before middle pages if needed
      if (start > 2) {
        pages.push("ellipsis");
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis after middle pages if needed
      if (end < totalPages - 1) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  const getPageUrl = (page: number) => {
    if (page === 1) return "/blog";
    return `${basePath}/${page}`;
  };

  return (
    <nav
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label="Pagination"
    >
      {/* Previous button */}
      {currentPage > 1 ? (
        <Button
          aria-label="Previous page"
          asChild
          className="h-9 w-9"
          size="icon"
          variant="ghost"
        >
          <Link href={getPageUrl(currentPage - 1)}>
            <ChevronLeft className="size-4" data-icon="inline-start" />
          </Link>
        </Button>
      ) : (
        <Button
          aria-label="Previous page"
          className="h-9 w-9"
          disabled
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="size-4" data-icon="inline-start" />
        </Button>
      )}

      {/* Page numbers */}
      {pages.map((page, index) => {
        if (page === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground"
            >
              <MoreHorizontal className="size-4" />
            </span>
          );
        }

        const isActive = page === currentPage;
        if (isActive) {
          return (
            <Button
              aria-current="page"
              aria-label={`Page ${page}`}
              className="h-9 w-9"
              key={page}
              size="icon"
              variant="default"
            >
              <span>{page}</span>
            </Button>
          );
        }

        return (
          <Button asChild className="h-9 w-9" key={page} size="icon" variant="ghost">
            <Link aria-label={`Page ${page}`} href={getPageUrl(page)}>
              {page}
            </Link>
          </Button>
        );
      })}

      {/* Next button */}
      {currentPage < totalPages ? (
        <Button aria-label="Next page" asChild className="h-9 w-9" size="icon" variant="ghost">
          <Link href={getPageUrl(currentPage + 1)}>
            <ChevronRight className="size-4" data-icon="inline-start" />
          </Link>
        </Button>
      ) : (
        <Button aria-label="Next page" className="h-9 w-9" disabled size="icon" variant="ghost">
          <ChevronRight className="size-4" data-icon="inline-start" />
        </Button>
      )}
    </nav>
  );
}
