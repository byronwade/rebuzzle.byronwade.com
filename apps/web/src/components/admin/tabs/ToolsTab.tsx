"use client";

import { BlogPostGenerator } from "@/components/admin/tools/BlogPostGenerator";
import { BulkBlogPostGenerator } from "@/components/admin/tools/BulkBlogPostGenerator";
import { BulkPuzzleGenerator } from "@/components/admin/tools/BulkPuzzleGenerator";
import { DateRangePuzzleGenerator } from "@/components/admin/tools/DateRangePuzzleGenerator";
import { PuzzleGenerator } from "@/components/admin/tools/PuzzleGenerator";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ToolsTab({
  onPuzzleSaved,
  onBlogPostSaved,
}: {
  onPuzzleSaved?: () => void;
  onBlogPostSaved?: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="border-b pb-4">
        <h2 className="font-semibold text-xl tracking-tight md:text-2xl">Generation Tools</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Generate puzzles and blog posts with AI-powered tools
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="mb-4 font-semibold text-lg">Puzzle Generation</h3>
          <Tabs className="w-full" defaultValue="single">
            <TabsList>
              <TabsTrigger value="single">Single Puzzle</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Generation</TabsTrigger>
              <TabsTrigger value="date-range">Date Range</TabsTrigger>
            </TabsList>
            <TabsContent className="mt-6" value="single">
              <PuzzleGenerator onPuzzleSaved={onPuzzleSaved} />
            </TabsContent>
            <TabsContent className="mt-6" value="bulk">
              <BulkPuzzleGenerator onPuzzlesSaved={onPuzzleSaved} />
            </TabsContent>
            <TabsContent className="mt-6" value="date-range">
              <DateRangePuzzleGenerator onPuzzlesSaved={onPuzzleSaved} />
            </TabsContent>
          </Tabs>
        </div>

        <Separator />

        <div>
          <h3 className="mb-4 font-semibold text-lg">Blog Post Generation</h3>
          <Tabs className="w-full" defaultValue="single">
            <TabsList>
              <TabsTrigger value="single">Single Blog Post</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Generation</TabsTrigger>
            </TabsList>
            <TabsContent className="mt-6" value="single">
              <BlogPostGenerator onBlogPostSaved={onBlogPostSaved} />
            </TabsContent>
            <TabsContent className="mt-6" value="bulk">
              <BulkBlogPostGenerator onBlogPostsSaved={onBlogPostSaved} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
