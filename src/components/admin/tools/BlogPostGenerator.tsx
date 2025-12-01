"use client";

import { FileText, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BlogPostPreview } from "./BlogPostPreview";

interface BlogPostGeneratorProps {
  onBlogPostSaved?: () => void;
}

export function BlogPostGenerator({ onBlogPostSaved }: BlogPostGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<any>(null);
  const [puzzleId, setPuzzleId] = useState("");
  const [puzzleSearch, setPuzzleSearch] = useState("");
  const [puzzles, setPuzzles] = useState<any[]>([]);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState("");

  const handleSearchPuzzles = async () => {
    if (!puzzleSearch.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `/api/admin/puzzles?search=${encodeURIComponent(puzzleSearch)}&limit=10`
      );
      const data = await response.json();

      if (data.success) {
        setPuzzles(data.puzzles || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleGenerate = async () => {
    const targetPuzzleId = selectedPuzzleId || puzzleId;

    if (!targetPuzzleId) {
      toast({
        title: "Puzzle Required",
        description: "Please select or enter a puzzle ID.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setGeneratedPost(null);

    try {
      const response = await fetch("/api/admin/blogs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzleId: targetPuzzleId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate blog post");
      }

      setGeneratedPost(data.blogPost);
      toast({
        title: "Blog Post Generated",
        description: "Review the blog post below and save when ready.",
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

  const handleSave = async (blogPost: any) => {
    try {
      const blogPostData = {
        title: blogPost.title,
        slug: blogPost.slug,
        content: blogPost.content,
        excerpt: blogPost.excerpt || "",
        authorId: "ai-system",
        puzzleId: blogPost.puzzleId || "",
        publishedAt: blogPost.publishedAt || new Date().toISOString(),
      };

      const response = await fetch("/api/admin/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blogPostData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save blog post");
      }

      toast({
        title: "Blog Post Saved",
        description: "The blog post has been saved to the database.",
      });

      setGeneratedPost(null);
      setPuzzleId("");
      setSelectedPuzzleId("");
      setPuzzleSearch("");

      if (onBlogPostSaved) {
        onBlogPostSaved();
      }
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Blog Post</CardTitle>
          <CardDescription>
            Generate a blog post for a specific puzzle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="puzzle-search">Search Puzzles</Label>
              <div className="flex gap-2">
                <Input
                  id="puzzle-search"
                  onChange={(e) => setPuzzleSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchPuzzles();
                    }
                  }}
                  placeholder="Search by puzzle text, answer, or explanation..."
                  value={puzzleSearch}
                />
                <Button
                  disabled={searching || !puzzleSearch.trim()}
                  onClick={handleSearchPuzzles}
                  variant="outline"
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {puzzles.length > 0 && (
              <div>
                <Label>Select Puzzle</Label>
                <Select
                  onValueChange={setSelectedPuzzleId}
                  value={selectedPuzzleId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a puzzle" />
                  </SelectTrigger>
                  <SelectContent>
                    {puzzles.map((puzzle) => (
                      <SelectItem key={puzzle.id} value={puzzle.id}>
                        {puzzle.answer} - {puzzle.puzzle?.substring(0, 50)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or enter puzzle ID directly
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="puzzle-id">Puzzle ID</Label>
              <Input
                id="puzzle-id"
                onChange={(e) => setPuzzleId(e.target.value)}
                placeholder="Enter puzzle ID"
                value={puzzleId}
              />
            </div>

            <Button
              className="w-full"
              disabled={loading || !(selectedPuzzleId || puzzleId)}
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
                  Generate Blog Post
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedPost && (
        <BlogPostPreview
          blogPost={generatedPost}
          onCancel={() => setGeneratedPost(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
