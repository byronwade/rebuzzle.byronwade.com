"use client";

import { format } from "date-fns";
import { Calendar, Loader2, Save, Sparkles } from "lucide-react";
import { useState } from "react";
import { listPuzzleTypes } from "@/ai/config/puzzle-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

interface DateRangePuzzleGeneratorProps {
  onPuzzlesSaved?: () => void;
}

export function DateRangePuzzleGenerator({ onPuzzlesSaved }: DateRangePuzzleGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedPuzzles, setGeneratedPuzzles] = useState<any[]>([]);
  const [selectedPuzzles, setSelectedPuzzles] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    puzzleType: "rebus",
    difficulty: 7,
    category: "",
    theme: "",
  });

  const puzzleTypes = listPuzzleTypes();

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedPuzzles([]);
    setSelectedPuzzles(new Set());

    try {
      const response = await fetch("/api/admin/puzzles/generate-date-range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: formData.startDate,
          endDate: formData.endDate,
          puzzleType: formData.puzzleType,
          difficulty: formData.difficulty,
          category: formData.category || undefined,
          theme: formData.theme || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate puzzles");
      }

      setGeneratedPuzzles(data.puzzles);
      // Select all by default
      setSelectedPuzzles(new Set(data.puzzles.map((_: any, i: number) => i)));

      toast({
        title: "Puzzles Generated",
        description: `Generated ${data.puzzles.length} puzzles for date range. ${data.metadata?.failed || 0} failed.`,
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
    const newSelected = new Set(selectedPuzzles);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPuzzles(newSelected);
  };

  const handleSaveSelected = async () => {
    const puzzlesToSave = Array.from(selectedPuzzles).map((index) => generatedPuzzles[index]);

    if (puzzlesToSave.length === 0) {
      toast({
        title: "No Puzzles Selected",
        description: "Please select at least one puzzle to save.",
        variant: "destructive",
      });
      return;
    }

    let saved = 0;
    let failed = 0;

    for (const puzzle of puzzlesToSave) {
      try {
        const puzzleData = {
          puzzle: puzzle.puzzle,
          puzzleType: puzzle.puzzleType || "rebus",
          answer: puzzle.answer,
          difficulty: puzzle.difficulty,
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
      description: `Saved ${saved} puzzles. ${failed} failed.`,
    });

    if (saved > 0 && onPuzzlesSaved) {
      onPuzzlesSaved();
    }
  };

  // Calculate number of days
  const days =
    formData.startDate && formData.endDate
      ? Math.ceil(
          (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Date Range Puzzle Generation</CardTitle>
          <CardDescription>
            Generate puzzles for a specific date range (max 90 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  type="date"
                  value={formData.startDate}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  type="date"
                  value={formData.endDate}
                />
              </div>
            </div>

            {days > 0 && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Will generate puzzles for{" "}
                    <strong>
                      {days} day{days !== 1 ? "s" : ""}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="puzzle-type">Puzzle Type</Label>
              <Select
                onValueChange={(value) => setFormData({ ...formData, puzzleType: value })}
                value={formData.puzzleType}
              >
                <SelectTrigger id="puzzle-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {puzzleTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty: {formData.difficulty}/10</Label>
              <Slider
                className="mt-2"
                id="difficulty"
                max={10}
                min={5}
                onValueChange={([value]) => setFormData({ ...formData, difficulty: value ?? 7 })}
                step={1}
                value={[formData.difficulty]}
              />
            </div>

            <div>
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., nature, technology"
                value={formData.category}
              />
            </div>

            <div>
              <Label htmlFor="theme">Theme (Optional)</Label>
              <Input
                id="theme"
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                placeholder="e.g., summer, space"
                value={formData.theme}
              />
            </div>

            <Button
              className="w-full"
              disabled={loading || days > 90 || days < 1}
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
                  Generate Puzzles for {days} Day{days !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedPuzzles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Puzzles</CardTitle>
                <CardDescription>
                  {selectedPuzzles.size} of {generatedPuzzles.length} selected
                </CardDescription>
              </div>
              <Button disabled={selectedPuzzles.size === 0} onClick={handleSaveSelected}>
                <Save className="mr-2 h-4 w-4" />
                Save Selected ({selectedPuzzles.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedPuzzles.map((puzzle, index) => (
                <div className="flex items-start gap-4 rounded-lg border p-4" key={index}>
                  <Checkbox
                    checked={selectedPuzzles.has(index)}
                    className="mt-1"
                    onCheckedChange={() => toggleSelection(index)}
                  />
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-medium">
                        {puzzle.date || format(new Date(puzzle.publishedAt), "yyyy-MM-dd")}
                      </span>
                      <span className="text-muted-foreground text-sm">Answer: {puzzle.answer}</span>
                      <span className="text-muted-foreground text-sm">
                        Difficulty: {puzzle.difficulty}/10
                      </span>
                    </div>
                    <div className="line-clamp-2 text-muted-foreground text-sm">
                      {puzzle.puzzle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
