import { NextResponse } from "next/server";
import type { BlogPost } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * GET /api/admin/blogs/[id]
 * Get a single blog post by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const blogPostsCollection = getCollection<BlogPost>("blogPosts");
    const blogPost = await blogPostsCollection.findOne({ id });

    if (!blogPost) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      blogPost,
    });
  } catch (error) {
    console.error("Admin blog get error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch blog post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/blogs/[id]
 * Update a blog post
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const blogPostsCollection = getCollection<BlogPost>("blogPosts");

    // Check if blog post exists
    const existingPost = await blogPostsCollection.findOne({ id });
    if (!existingPost) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    // Check if slug is being changed and if new slug already exists
    if (body.slug && body.slug !== existingPost.slug) {
      const slugExists = await blogPostsCollection.findOne({ slug: body.slug });
      if (slugExists) {
        return NextResponse.json(
          { error: "A blog post with this slug already exists" },
          { status: 409 }
        );
      }
    }

    // Prepare update object
    const updates: Partial<BlogPost> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.content !== undefined) updates.content = body.content;
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
    if (body.authorId !== undefined) updates.authorId = body.authorId;
    if (body.puzzleId !== undefined) updates.puzzleId = body.puzzleId;
    if (body.publishedAt !== undefined)
      updates.publishedAt = new Date(body.publishedAt);
    updates.updatedAt = new Date();

    await blogPostsCollection.updateOne({ id }, { $set: updates });

    const updatedPost = await blogPostsCollection.findOne({ id });

    return NextResponse.json({
      success: true,
      blogPost: updatedPost,
      message: "Blog post updated successfully",
    });
  } catch (error) {
    console.error("Admin blog update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update blog post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/blogs/[id]
 * Delete a blog post
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const blogPostsCollection = getCollection<BlogPost>("blogPosts");

    const result = await blogPostsCollection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Blog post deleted successfully",
    });
  } catch (error) {
    console.error("Admin blog delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete blog post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
