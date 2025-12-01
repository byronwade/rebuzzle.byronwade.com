"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, Save, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { listPuzzleTypes } from "@/ai/config/puzzle-types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface BulkPuzzleGeneratorProps {
  onPuzzlesSaved?: () => void;
}

export function BulkPuzzleGenerator({
  onPuzzlesSaved,
}: BulkPuzzleGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedPuzzles, setGeneratedPuzzles] = useState<any[]>([]);
  const [selectedPuzzles, setSelectedPuzzles] = useState<Set<number>>(
    new Set()
  );
  const [formData, setFormData] = useState({
    count: 5,
    puzzleType: "rebus",
    difficultyMin: 5,
    difficultyMax: 10,
    category: "",
    theme: "",
  });

  const puzzleTypes = listPuzzleTypes();

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedPuzzles([]);
    setSelectedPuzzles(new Set());

    try {
      const response = await fetch("/api/admin/puzzles/generate-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: formData.count,
          puzzleType: formData.puzzleType,
          difficultyMin: formData.difficultyMin,
          difficultyMax: formData.difficultyMax,
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
        description: `Generated ${data.puzzles.length} puzzles. ${data.metadata?.failed || 0} failed.`,
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
    const puzzlesToSave = Array.from(selectedPuzzles).map(
      (index) => generatedPuzzles[index]
    );

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Puzzle Generation</CardTitle>
          <CardDescription>
            Generate multiple puzzles at once with customizable parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="count">Number of Puzzles (1-50)</Label>
              <Input
                id="count"
                max="50"
                min="1"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    count: Number.parseInt(e.target.value) || 1,
                  })
                }
                type="number"
                value={formData.count}
              />
            </div>

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
              <Label htmlFor="difficulty-min">
                Min Difficulty: {formData.difficultyMin}/10
              </Label>
              <Slider
                className="mt-2"
                id="difficulty-min"
                max={10}
                min={5}
                onValueChange={([value]) =>
                  setFormData({ ...formData, difficultyMin: value ?? 5 })
                }
                step={1}
                value={[formData.difficultyMin]}
              />
            </div>

            <div>
              <Label htmlFor="difficulty-max">
                Max Difficulty: {formData.difficultyMax}/10
              </Label>
              <Slider
                className="mt-2"
                id="difficulty-max"
                max={10}
                min={5}
                onValueChange={([value]) =>
                  setFormData({ ...formData, difficultyMax: value ?? 10 })
                }
                step={1}
                value={[formData.difficultyMax]}
              />
            </div>

            <div>
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., nature, technology"
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
                placeholder="e.g., summer, space"
                value={formData.theme}
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
                  Generate {formData.count} Puzzles
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
              <Button
                disabled={selectedPuzzles.size === 0}
                onClick={handleSaveSelected}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Selected ({selectedPuzzles.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {generatedPuzzles.length > 0 && (
              <VirtualizedPuzzleList
                generatedPuzzles={generatedPuzzles}
                selectedPuzzles={selectedPuzzles}
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
function VirtualizedPuzzleList({
  generatedPuzzles,
  selectedPuzzles,
  toggleSelection,
}: {
  generatedPuzzles: any[];
  selectedPuzzles: Set<number>;
  toggleSelection: (index: number) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: generatedPuzzles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated height per item
    overscan: 5, // Render 5 extra items outside viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const puzzle = generatedPuzzles[virtualItem.index];
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
                  checked={selectedPuzzles.has(index)}
                  className="mt-1"
                  onCheckedChange={() => toggleSelection(index)}
                />
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium">Puzzle {index + 1}</span>
                    <span className="text-muted-foreground text-sm">
                      Answer: {puzzle.answer}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      Difficulty: {puzzle.difficulty}/10
                    </span>
                  </div>
                  <div className="line-clamp-2 text-muted-foreground text-sm">
                    {puzzle.puzzle}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
