"use client";

import { FileText, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { type BlogPostDraft, BlogPostPreview } from "./BlogPostPreview";
import { fail } from "@/lib/fail";

interface BlogPostGeneratorProps {
  onBlogPostSaved?: () => void;
}

export function BlogPostGenerator({ onBlogPostSaved }: BlogPostGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<BlogPostDraft | null>(null);
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
    }
    setSearching(false);

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
        fail(data.error || "Failed to generate blog post");
      }

      setGeneratedPost(data.blogPost);
      toast({
        title: "Blog Post Generated",
        description: "Review the blog post below and open a draft PR when ready.",
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
    setLoading(false);

  };

  const handleSave = async (blogPost: BlogPostDraft) => {
    try {
      const blogPostData = {
        title: blogPost.title,
        slug: blogPost.slug,
        content: blogPost.content,
        excerpt: blogPost.excerpt || "",
        puzzleId: blogPost.puzzleId || "",
        sections: blogPost.sections,
        seoMetadata: blogPost.seoMetadata,
      };

      const response = await fetch("/api/admin/blogs/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blogPostData),
      });

      const data = await response.json();

      if (!data.success) {
        fail(data.details || data.error || "Failed to open blog pull request");
      }

      const proposal = data.proposal as {
        pullRequestNumber?: number;
        pullRequestUrl?: string;
      };

      toast({
        title: proposal.pullRequestNumber ? "Draft PR Opened" : "Proposal Already Exists",
        description: proposal.pullRequestNumber
          ? `Pull request #${proposal.pullRequestNumber} is ready for editorial review.`
          : "This puzzle already has a blog proposal.",
      });

      if (proposal.pullRequestUrl) {
        window.open(proposal.pullRequestUrl, "_blank", "noopener,noreferrer");
      }

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
        title: "Pull Request Failed",
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
          <CardDescription>Generate a blog post for a specific puzzle</CardDescription>
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
                    <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-end" />
                  ) : (
                    <Search className="h-4 w-4" data-icon="inline-end" />
                  )}
                </Button>
              </div>
            </div>

            {puzzles.length > 0 && (
              <div>
                <Label>Select Puzzle</Label>
                <Select onValueChange={setSelectedPuzzleId} value={selectedPuzzleId}>
                  <SelectTrigger aria-label="Blog generation option">
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
                  <Loader2 data-icon="inline-start" className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText data-icon="inline-start" className="mr-2 h-4 w-4" />
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
