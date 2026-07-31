"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { FileText, Loader2, Save } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface BulkBlogPostGeneratorProps {
  onBlogPostsSaved?: () => void;
}

export function BulkBlogPostGenerator({ onBlogPostsSaved }: BulkBlogPostGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"without-blogs" | "date-range" | "puzzle-ids">("without-blogs");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [puzzleIds, setPuzzleIds] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedPosts([]);
    setSelectedPosts(new Set());

    try {
      const body: any = { mode };

      if (mode === "date-range") {
        body.startDate = startDate;
        body.endDate = endDate;
      } else if (mode === "puzzle-ids") {
        body.puzzleIds = puzzleIds
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0);
      }

      const response = await fetch("/api/admin/blogs/generate-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate blog posts");
      }

      setGeneratedPosts(data.blogPosts);
      // Select all by default
      setSelectedPosts(new Set(data.blogPosts.map((_: any, i: number) => i)));

      toast({
        title: "Blog Posts Generated",
        description: `Generated ${data.blogPosts.length} blog posts. ${data.metadata?.failed || 0} failed.`,
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPosts(newSelected);
  };

  const handleSaveSelected = async () => {
    const postsToSave = Array.from(selectedPosts).map((index) => generatedPosts[index]);

    if (postsToSave.length === 0) {
      toast({
        title: "No Posts Selected",
        description: "Please select at least one blog post to save.",
        variant: "destructive",
      });
      return;
    }

    let saved = 0;
    let failed = 0;

    for (const post of postsToSave) {
      try {
        const blogPostData = {
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt || "",
          authorId: "ai-system",
          puzzleId: post.puzzleId || "",
          publishedAt: post.publishedAt || new Date().toISOString(),
        };

        const response = await fetch("/api/admin/blogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(blogPostData),
        });

        const data = await response.json();
        if (data.success) {
          saved++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error("Save error:", error);
        failed++;
      }
    }

    toast({
      title: "Bulk Save Complete",
      description: `Saved ${saved} blog posts. ${failed} failed.`,
    });

    if (saved > 0 && onBlogPostsSaved) {
      onBlogPostsSaved();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Blog Post Generation</CardTitle>
          <CardDescription>Generate blog posts for multiple puzzles at once</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Generation Mode</Label>
              <RadioGroup
                className="mt-2"
                onValueChange={(value) =>
                  setMode(value as "without-blogs" | "date-range" | "puzzle-ids")
                }
                value={mode}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="without-blogs" value="without-blogs" />
                  <Label className="cursor-pointer font-normal" htmlFor="without-blogs">
                    Generate for puzzles without blog posts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="date-range" value="date-range" />
                  <Label className="cursor-pointer font-normal" htmlFor="date-range">
                    Generate for puzzles in date range
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="puzzle-ids" value="puzzle-ids" />
                  <Label className="cursor-pointer font-normal" htmlFor="puzzle-ids">
                    Generate for specific puzzle IDs
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {mode === "date-range" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    onChange={(e) => setStartDate(e.target.value)}
                    type="date"
                    value={startDate}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    onChange={(e) => setEndDate(e.target.value)}
                    type="date"
                    value={endDate}
                  />
                </div>
              </div>
            )}

            {mode === "puzzle-ids" && (
              <div>
                <Label htmlFor="puzzle-ids">Puzzle IDs (comma-separated)</Label>
                <Input
                  id="puzzle-ids"
                  onChange={(e) => setPuzzleIds(e.target.value)}
                  placeholder="puzzle-id-1, puzzle-id-2, puzzle-id-3"
                  value={puzzleIds}
                />
              </div>
            )}

            <Button
              className="w-full"
              disabled={
                loading ||
                (mode === "date-range" && !(startDate && endDate)) ||
                (mode === "puzzle-ids" && !puzzleIds.trim())
              }
              onClick={handleGenerate}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Blog Posts
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedPosts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Blog Posts</CardTitle>
                <CardDescription>
                  {selectedPosts.size} of {generatedPosts.length} selected
                </CardDescription>
              </div>
              <Button disabled={selectedPosts.size === 0} onClick={handleSaveSelected}>
                <Save className="mr-2 h-4 w-4" />
                Save Selected ({selectedPosts.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {generatedPosts.length > 0 && (
              <VirtualizedBlogPostList
                generatedPosts={generatedPosts}
                selectedPosts={selectedPosts}
                toggleSelection={toggleSelection}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Virtualized list component for better performance with large lists
function VirtualizedBlogPostList({
  generatedPosts,
  selectedPosts,
  toggleSelection,
}: {
  generatedPosts: any[];
  selectedPosts: Set<number>;
  toggleSelection: (index: number) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: generatedPosts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height per item
    overscan: 5, // Render 5 extra items outside viewport
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto" style={{ contain: "strict" }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const post = generatedPosts[virtualItem.index];
          const index = virtualItem.index;

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="flex items-start gap-4 rounded-lg border p-4">
                <Checkbox
                  checked={selectedPosts.has(index)}
                  className="mt-1"
                  onCheckedChange={() => toggleSelection(index)}
                />
                <div className="flex-1">
                  <div className="mb-2 font-medium">{post.title}</div>
                  <div className="line-clamp-2 text-muted-foreground text-sm">{post.excerpt}</div>
                  {post.puzzleId && (
                    <div className="mt-2 text-muted-foreground text-xs">
                      Puzzle ID: {post.puzzleId}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
