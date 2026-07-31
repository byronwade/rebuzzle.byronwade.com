"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Puzzle } from "@/db/models";

interface EditPuzzleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  puzzle: Puzzle | null;
  isCreating: boolean;
  onSave: (puzzle: Puzzle) => void;
}

export function EditPuzzleDialog({
  open,
  onOpenChange,
  puzzle,
  isCreating,
  onSave,
}: EditPuzzleDialogProps) {
  const form = useForm<Puzzle>({
    defaultValues: puzzle
      ? {
          ...puzzle,
          publishedAt:
            typeof puzzle.publishedAt === "string"
              ? new Date(puzzle.publishedAt)
              : puzzle.publishedAt,
          createdAt:
            typeof puzzle.createdAt === "string" ? new Date(puzzle.createdAt) : puzzle.createdAt,
        }
      : {
          id: "new",
          puzzle: "",
          puzzleType: "rebus",
          answer: "",
          difficulty: "medium",
          category: "",
          explanation: "",
          hints: [],
          publishedAt: new Date(),
          createdAt: new Date(),
          active: true,
        },
  });

  useEffect(() => {
    if (puzzle) {
      form.reset({
        ...puzzle,
        publishedAt:
          typeof puzzle.publishedAt === "string"
            ? new Date(puzzle.publishedAt)
            : puzzle.publishedAt,
        createdAt:
          typeof puzzle.createdAt === "string" ? new Date(puzzle.createdAt) : puzzle.createdAt,
      });
    } else {
      form.reset({
        id: "new",
        puzzle: "",
        puzzleType: "rebus",
        answer: "",
        difficulty: "medium",
        category: "",
        explanation: "",
        hints: [],
        publishedAt: new Date(),
        createdAt: new Date(),
        active: true,
      });
    }
  }, [puzzle, form]);

  const onSubmit = (data: Puzzle) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreating ? "Create Puzzle" : "Edit Puzzle"}</DialogTitle>
          <DialogDescription>
            {isCreating
              ? "Create a new puzzle for your collection."
              : "Update the puzzle details below."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="puzzle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puzzle</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
              rules={{ required: "Puzzle content is required" }}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="puzzleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puzzle Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "rebus"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select puzzle type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rebus">Rebus</SelectItem>
                        <SelectItem value="word-puzzle">Word Puzzle</SelectItem>
                        <SelectItem value="riddle">Riddle</SelectItem>
                        <SelectItem value="trivia">Trivia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                rules={{ required: "Answer is required" }}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hints (one per line)</FormLabel>
                  <FormControl>
                    <Textarea
                      onChange={(e) =>
                        field.onChange(e.target.value.split("\n").filter((h) => h.trim()))
                      }
                      rows={3}
                      value={Array.isArray(field.value) ? field.value.join("\n") : ""}
                    />
                  </FormControl>
                  <FormDescription>Enter each hint on a separate line</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="publishedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Published At</FormLabel>
                    <FormControl>
                      <Input
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                        type="datetime-local"
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Whether this puzzle is active and visible to users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button type="submit">{isCreating ? "Create" : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
