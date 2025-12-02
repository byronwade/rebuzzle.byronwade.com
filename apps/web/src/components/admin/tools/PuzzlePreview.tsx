"use client";

import { Edit2, Eye, Save } from "lucide-react";
import { useState } from "react";
import { PuzzleDisplay } from "@/components/PuzzleDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface PuzzlePreviewProps {
  puzzle: {
    puzzle: string;
    puzzleType: string;
    answer: string;
    difficulty: number;
    category: string;
    explanation: string;
    hints: string[];
    publishedAt?: string;
    metadata?: {
      qualityScore?: number;
      uniquenessScore?: number;
    };
  };
  onSave: (puzzle: any) => void;
  onCancel?: () => void;
}

export function PuzzlePreview({ puzzle, onSave, onCancel }: PuzzlePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPuzzle, setEditedPuzzle] = useState(puzzle);

  const handleSave = () => {
    onSave(editedPuzzle);
  };

  const difficultyLabels: Record<number, string> = {
    5: "Hard",
    6: "Hard",
    7: "Difficult",
    8: "Difficult",
    9: "Evil",
    10: "Impossible",
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Puzzle Preview</CardTitle>
            <CardDescription>Review and edit the generated puzzle before saving</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              size="sm"
              variant={isEditing ? "outline" : "default"}
            >
              {isEditing ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </>
              ) : (
                <>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
            {onCancel && (
              <Button onClick={onCancel} size="sm" variant="outline">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs className="w-full" defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-4" value="preview">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="puzzle-text">Puzzle Text</Label>
                  <Textarea
                    className="font-mono"
                    id="puzzle-text"
                    onChange={(e) =>
                      setEditedPuzzle({
                        ...editedPuzzle,
                        puzzle: e.target.value,
                      })
                    }
                    rows={4}
                    value={editedPuzzle.puzzle}
                  />
                </div>
                <div>
                  <Label htmlFor="answer">Answer</Label>
                  <Input
                    id="answer"
                    onChange={(e) =>
                      setEditedPuzzle({
                        ...editedPuzzle,
                        answer: e.target.value,
                      })
                    }
                    value={editedPuzzle.answer}
                  />
                </div>
                <div>
                  <Label htmlFor="explanation">Explanation</Label>
                  <Textarea
                    id="explanation"
                    onChange={(e) =>
                      setEditedPuzzle({
                        ...editedPuzzle,
                        explanation: e.target.value,
                      })
                    }
                    rows={3}
                    value={editedPuzzle.explanation}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border bg-muted/50 p-6">
                  <div className="mb-4 font-medium text-muted-foreground text-sm">
                    Puzzle Display
                  </div>
                  <PuzzleDisplay
                    puzzle={editedPuzzle.puzzle}
                    puzzleType={editedPuzzle.puzzleType}
                    size="large"
                  />
                </div>
                <div className="rounded-lg border bg-neutral-100 p-4 dark:bg-neutral-800/30">
                  <div className="mb-2 font-medium text-neutral-900 text-sm dark:text-neutral-100">
                    Answer
                  </div>
                  <div className="font-semibold text-neutral-800 text-lg dark:text-neutral-200">
                    {editedPuzzle.answer}
                  </div>
                </div>
                <div>
                  <div className="mb-2 font-medium text-sm">Explanation</div>
                  <div className="whitespace-pre-wrap rounded-md border bg-background p-4 text-muted-foreground">
                    {editedPuzzle.explanation}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent className="space-y-4" value="details">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                {isEditing ? (
                  <Input
                    id="difficulty"
                    max="10"
                    min="5"
                    onChange={(e) =>
                      setEditedPuzzle({
                        ...editedPuzzle,
                        difficulty: Number.parseInt(e.target.value, 10) || 5,
                      })
                    }
                    type="number"
                    value={editedPuzzle.difficulty}
                  />
                ) : (
                  <div className="mt-2">
                    <Badge variant="secondary">
                      {difficultyLabels[editedPuzzle.difficulty] || "Unknown"} (
                      {editedPuzzle.difficulty}/10)
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                {isEditing ? (
                  <Input
                    id="category"
                    onChange={(e) =>
                      setEditedPuzzle({
                        ...editedPuzzle,
                        category: e.target.value,
                      })
                    }
                    value={editedPuzzle.category}
                  />
                ) : (
                  <div className="mt-2">
                    <Badge variant="outline">{editedPuzzle.category}</Badge>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="puzzle-type">Puzzle Type</Label>
                {isEditing ? (
                  <Input
                    id="puzzle-type"
                    onChange={(e) =>
                      setEditedPuzzle({
                        ...editedPuzzle,
                        puzzleType: e.target.value,
                      })
                    }
                    value={editedPuzzle.puzzleType}
                  />
                ) : (
                  <div className="mt-2">
                    <Badge variant="outline">{editedPuzzle.puzzleType}</Badge>
                  </div>
                )}
              </div>
              {editedPuzzle.publishedAt && (
                <div>
                  <Label htmlFor="published-at">Published At</Label>
                  {isEditing ? (
                    <Input
                      id="published-at"
                      onChange={(e) =>
                        setEditedPuzzle({
                          ...editedPuzzle,
                          publishedAt: new Date(e.target.value).toISOString(),
                        })
                      }
                      type="datetime-local"
                      value={
                        editedPuzzle.publishedAt
                          ? new Date(editedPuzzle.publishedAt).toISOString().slice(0, 16)
                          : ""
                      }
                    />
                  ) : (
                    <div className="mt-2 text-muted-foreground text-sm">
                      {new Date(editedPuzzle.publishedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Hints ({editedPuzzle.hints.length})</Label>
              {isEditing ? (
                <div className="mt-2 space-y-2">
                  {editedPuzzle.hints.map((hint, index) => (
                    <Textarea
                      key={index}
                      onChange={(e) => {
                        const newHints = [...editedPuzzle.hints];
                        newHints[index] = e.target.value;
                        setEditedPuzzle({ ...editedPuzzle, hints: newHints });
                      }}
                      rows={2}
                      value={hint}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {editedPuzzle.hints.map((hint, index) => (
                    <div className="rounded-md border bg-muted/50 p-3 text-sm" key={index}>
                      <span className="font-medium">Hint {index + 1}:</span> {hint}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent className="space-y-4" value="metadata">
            {editedPuzzle.metadata && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Quality Score</Label>
                  <div className="mt-2">
                    <Badge variant="secondary">
                      {(editedPuzzle.metadata.qualityScore || 0).toFixed(2)}/10
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Uniqueness Score</Label>
                  <div className="mt-2">
                    <Badge variant="secondary">
                      {(editedPuzzle.metadata.uniquenessScore || 0).toFixed(2)}
                      /10
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <Button className="w-full md:w-auto" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save to Database
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
