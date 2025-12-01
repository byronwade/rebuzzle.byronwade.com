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
import { Textarea } from "@/components/ui/textarea";
import type { BlogPost } from "@/db/models";

interface EditBlogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blog: BlogPost | null;
  isCreating: boolean;
  onSave: (blog: BlogPost) => void;
}

export function EditBlogDialog({
  open,
  onOpenChange,
  blog,
  isCreating,
  onSave,
}: EditBlogDialogProps) {
  const form = useForm<BlogPost>({
    defaultValues: blog
      ? {
          ...blog,
          publishedAt:
            typeof blog.publishedAt === "string"
              ? new Date(blog.publishedAt)
              : blog.publishedAt,
          createdAt:
            typeof blog.createdAt === "string"
              ? new Date(blog.createdAt)
              : blog.createdAt,
          updatedAt:
            typeof blog.updatedAt === "string"
              ? new Date(blog.updatedAt)
              : blog.updatedAt,
        }
      : {
          id: "new",
          title: "",
          slug: "",
          content: "",
          excerpt: "",
          authorId: "",
          puzzleId: "",
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
  });

  useEffect(() => {
    if (blog) {
      form.reset({
        ...blog,
        publishedAt:
          typeof blog.publishedAt === "string"
            ? new Date(blog.publishedAt)
            : blog.publishedAt,
        createdAt:
          typeof blog.createdAt === "string"
            ? new Date(blog.createdAt)
            : blog.createdAt,
        updatedAt:
          typeof blog.updatedAt === "string"
            ? new Date(blog.updatedAt)
            : blog.updatedAt,
      });
    } else {
      form.reset({
        id: "new",
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        authorId: "",
        puzzleId: "",
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }, [blog, form]);

  const onSubmit = (data: BlogPost) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? "Create Blog Post" : "Edit Blog Post"}
          </DialogTitle>
          <DialogDescription>
            {isCreating
              ? "Create a new blog post for your collection."
              : "Update the blog post details below."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
              rules={{ required: "Title is required" }}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    URL-friendly version of the title (e.g., "my-blog-post")
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
              rules={{ required: "Slug is required" }}
            />

            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Excerpt</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} value={field.value || ""} />
                  </FormControl>
                  <FormDescription>
                    Short summary or preview of the blog post
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="font-mono text-sm"
                      rows={12}
                    />
                  </FormControl>
                  <FormDescription>
                    Blog post content in Markdown format
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
              rules={{ required: "Content is required" }}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="puzzleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puzzle ID (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      ID of the puzzle this blog post is related to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publishedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Published At</FormLabel>
                    <FormControl>
                      <Input
                        onChange={(e) =>
                          field.onChange(new Date(e.target.value).toISOString())
                        }
                        type="datetime-local"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ""
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button type="submit">
                {isCreating ? "Create" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

