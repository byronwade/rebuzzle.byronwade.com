import { NextResponse } from "next/server";
import type { BlogPost, NewBlogPost } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * GET /api/admin/blogs
 * List all blog posts with pagination
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    const blogPostsCollection = getCollection<BlogPost>("blogPosts");

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const [blogPosts, total] = await Promise.all([
      blogPostsCollection
        .find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      blogPostsCollection.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      blogPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin blogs list error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch blog posts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/blogs
 * Create a new blog post
 */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, content, excerpt, authorId, puzzleId, publishedAt } = body;

    // Validation
    if (!(title && slug && content)) {
      return NextResponse.json({ error: "Title, slug, and content are required" }, { status: 400 });
    }

    // Check if slug already exists
    const blogPostsCollection = getCollection<BlogPost>("blogPosts");
    const existingPost = await blogPostsCollection.findOne({ slug });

    if (existingPost) {
      return NextResponse.json(
        { error: "A blog post with this slug already exists" },
        { status: 409 }
      );
    }

    const newBlogPost: NewBlogPost = {
      id: `blog_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      title,
      slug,
      content,
      excerpt: excerpt || `${content.substring(0, 200)}...`,
      authorId: authorId || admin.id,
      puzzleId: puzzleId || "",
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await blogPostsCollection.insertOne(newBlogPost);

    return NextResponse.json({
      success: true,
      blogPost: newBlogPost,
      message: "Blog post created successfully",
    });
  } catch (error) {
    console.error("Admin blog create error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create blog post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
