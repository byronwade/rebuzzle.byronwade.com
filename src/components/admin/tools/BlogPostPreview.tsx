"use client";

import { Edit2, Eye, Save } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface BlogPostPreviewProps {
  blogPost: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    puzzleId?: string;
    publishedAt?: string;
  };
  onSave: (blogPost: any) => void;
  onCancel?: () => void;
}

export function BlogPostPreview({
  blogPost,
  onSave,
  onCancel,
}: BlogPostPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState(blogPost);

  const handleSave = () => {
    onSave(editedPost);
  };

  // Generate slug from title
  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 100);

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Blog Post Preview</CardTitle>
            <CardDescription>
              Review and edit the generated blog post before saving
            </CardDescription>
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
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-4" value="preview">
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-2xl">{editedPost.title}</h2>
                <div className="mt-2 text-muted-foreground text-sm">
                  Slug:{" "}
                  <code className="rounded bg-muted px-2 py-1">
                    {editedPost.slug}
                  </code>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="mb-2 font-medium text-sm">Excerpt</div>
                <div className="text-muted-foreground">
                  {editedPost.excerpt}
                </div>
              </div>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editedPost.content}
                </ReactMarkdown>
              </div>
            </div>
          </TabsContent>

          <TabsContent className="space-y-4" value="edit">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setEditedPost({
                      ...editedPost,
                      title: newTitle,
                      slug: generateSlug(newTitle),
                    });
                  }}
                  value={editedPost.title}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  onChange={(e) =>
                    setEditedPost({ ...editedPost, slug: e.target.value })
                  }
                  value={editedPost.slug}
                />
                <div className="mt-1 text-muted-foreground text-xs">
                  Auto-generated from title, but can be edited
                </div>
              </div>
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  onChange={(e) =>
                    setEditedPost({ ...editedPost, excerpt: e.target.value })
                  }
                  rows={3}
                  value={editedPost.excerpt}
                />
              </div>
              <div>
                <Label htmlFor="content">Content (Markdown)</Label>
                <Textarea
                  className="font-mono text-sm"
                  id="content"
                  onChange={(e) =>
                    setEditedPost({ ...editedPost, content: e.target.value })
                  }
                  rows={20}
                  value={editedPost.content}
                />
                <div className="mt-1 text-muted-foreground text-xs">
                  Supports Markdown formatting
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent className="space-y-4" value="details">
            <div className="space-y-4">
              {editedPost.puzzleId && (
                <div>
                  <Label>Puzzle ID</Label>
                  <div className="mt-2">
                    <code className="rounded bg-muted px-2 py-1 text-sm">
                      {editedPost.puzzleId}
                    </code>
                  </div>
                </div>
              )}
              {editedPost.publishedAt && (
                <div>
                  <Label htmlFor="published-at">Published At</Label>
                  <Input
                    className="mt-2"
                    id="published-at"
                    onChange={(e) =>
                      setEditedPost({
                        ...editedPost,
                        publishedAt: new Date(e.target.value).toISOString(),
                      })
                    }
                    type="datetime-local"
                    value={
                      editedPost.publishedAt
                        ? new Date(editedPost.publishedAt)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                  />
                </div>
              )}
              <div>
                <Label>Content Stats</Label>
                <div className="mt-2 space-y-1 text-muted-foreground text-sm">
                  <div>Words: {editedPost.content.split(/\s+/).length}</div>
                  <div>Characters: {editedPost.content.length}</div>
                  <div>
                    Paragraphs: {editedPost.content.split(/\n\n+/).length}
                  </div>
                </div>
              </div>
            </div>
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

