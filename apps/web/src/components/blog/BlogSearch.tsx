"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BlogSearchProps {
  className?: string;
  showTypeFilter?: boolean;
}

const PUZZLE_TYPES = [
  { id: "all", name: "All Types" },
  { id: "rebus", name: "Rebus" },
  { id: "logic-grid", name: "Logic Grid" },
  { id: "cryptic-crossword", name: "Cryptic" },
  { id: "number-sequence", name: "Sequence" },
  { id: "pattern-recognition", name: "Pattern" },
  { id: "caesar-cipher", name: "Cipher" },
  { id: "trivia", name: "Trivia" },
];

export function BlogSearch({ className, showTypeFilter = true }: BlogSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [puzzleType, setPuzzleType] = useState(searchParams.get("type") || "all");

  const handleSearch = useCallback(() => {
    if (!query.trim() && puzzleType === "all") {
      router.push("/blog");
      return;
    }

    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (puzzleType !== "all") {
      params.set("type", puzzleType);
    }

    startTransition(() => {
      router.push(`/blog/search?${params.toString()}`);
    });
  }, [query, puzzleType, router]);

  const handleClear = useCallback(() => {
    setQuery("");
    setPuzzleType("all");
    router.push("/blog");
  }, [router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className={className}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search puzzles, solutions, tips..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-9"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setQuery("")}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>

        {showTypeFilter && (
          <Select value={puzzleType} onValueChange={setPuzzleType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {PUZZLE_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button onClick={handleSearch} disabled={isPending}>
          {isPending ? "Searching..." : "Search"}
        </Button>
      </div>

      {(query || puzzleType !== "all") && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Filters active</span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={handleClear}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
