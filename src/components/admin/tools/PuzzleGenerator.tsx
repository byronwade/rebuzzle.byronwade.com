"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { listPuzzleTypes } from "@/ai/config/puzzle-types";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { PuzzlePreview } from "./PuzzlePreview";

interface PuzzleGeneratorProps {
  onPuzzleSaved?: () => void;
}

export function PuzzleGenerator({ onPuzzleSaved }: PuzzleGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedPuzzle, setGeneratedPuzzle] = useState<any>(null);
  const [formData, setFormData] = useState({
    puzzleType: "rebus",
    difficulty: 7,
    category: "",
    theme: "",
    targetDate: "",
  });

  const puzzleTypes = listPuzzleTypes();

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedPuzzle(null);

    try {
      const response = await fetch("/api/admin/puzzles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleType: formData.puzzleType,
          difficulty: formData.difficulty,
          category: formData.category || undefined,
          theme: formData.theme || undefined,
          targetDate: formData.targetDate || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate puzzle");
      }

      setGeneratedPuzzle(data.puzzle);
      toast({
        title: "Puzzle Generated",
        description: "Review the puzzle below and save when ready.",
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

  const handleSave = async (puzzle: any) => {
    try {
      // Format puzzle data for API
      const puzzleData = {
        puzzle: puzzle.puzzle,
        puzzleType: puzzle.puzzleType || "rebus",
        answer: puzzle.answer,
        difficulty: puzzle.difficulty, // Can be number or string
        category: puzzle.category || "general",
        explanation: puzzle.explanation || "",
        hints: puzzle.hints || [],
        publishedAt: puzzle.publishedAt || new Date().toISOString(),
        active: puzzle.active !== undefined ? puzzle.active : true,
        metadata: puzzle.metadata || {},
      };

      const response = await fetch("/api/admin/puzzles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(puzzleData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save puzzle");
      }

      toast({
        title: "Puzzle Saved",
        description: "The puzzle has been saved to the database.",
      });

      setGeneratedPuzzle(null);
      setFormData({
        puzzleType: "rebus",
        difficulty: 7,
        category: "",
        theme: "",
        targetDate: "",
      });

      if (onPuzzleSaved) {
        onPuzzleSaved();
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
          <CardTitle>Generate Single Puzzle</CardTitle>
          <CardDescription>
            Create a new puzzle with custom parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="puzzle-type">Puzzle Type</Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, puzzleType: value })
                }
                value={formData.puzzleType}
              >
                <SelectTrigger id="puzzle-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {puzzleTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">
                Difficulty: {formData.difficulty}/10
              </Label>
              <Slider
                className="mt-2"
                id="difficulty"
                max={10}
                min={5}
                onValueChange={([value]) =>
                  setFormData({ ...formData, difficulty: value ?? 7 })
                }
                step={1}
                value={[formData.difficulty]}
              />
              <div className="mt-1 flex justify-between text-muted-foreground text-xs">
                <span>Hard (5)</span>
                <span>Impossible (10)</span>
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., nature, technology, holidays"
                value={formData.category}
              />
            </div>

            <div>
              <Label htmlFor="theme">Theme (Optional)</Label>
              <Input
                id="theme"
                onChange={(e) =>
                  setFormData({ ...formData, theme: e.target.value })
                }
                placeholder="e.g., summer, space, animals"
                value={formData.theme}
              />
            </div>

            <div>
              <Label htmlFor="target-date">Target Date (Optional)</Label>
              <Input
                id="target-date"
                onChange={(e) =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
                type="date"
                value={formData.targetDate}
              />
            </div>

            <Button
              className="w-full"
              disabled={loading}
              onClick={handleGenerate}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Puzzle
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && !generatedPuzzle && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {generatedPuzzle && (
        <PuzzlePreview
          onCancel={() => setGeneratedPuzzle(null)}
          onSave={handleSave}
          puzzle={generatedPuzzle}
        />
      )}
    </div>
  );
}
