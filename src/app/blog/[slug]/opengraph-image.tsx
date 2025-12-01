import { ImageResponse } from "next/og";
import { fetchBlogPost } from "@/app/actions/blogActions";

/**
 * Blog Post Open Graph Image
 *
 * Generates a dynamic OG image for blog posts with title and puzzle info
 */
export const alt = "Rebuzzle Blog Post";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);

  if (!post) {
    // Fallback image if post not found
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#8b5cf6",
          backgroundImage:
            "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "white",
          }}
        >
          Rebuzzle Blog
        </div>
      </div>,
      {
        ...size,
      }
    );
  }

  // Truncate title if too long
  const title =
    post.title.length > 60 ? post.title.slice(0, 57) + "..." : post.title;

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Header with gradient */}
      <div
        style={{
          width: "100%",
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage:
            "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: "white",
          }}
        >
          🧩 Rebuzzle Blog
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
          justifyContent: "center",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "bold",
            color: "#1f2937",
            marginBottom: "30px",
            lineHeight: "1.2",
          }}
        >
          {title}
        </div>

        {/* Puzzle info */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "20px",
            marginTop: "40px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              color: "#8b5cf6",
              fontWeight: "bold",
            }}
          >
            Puzzle: {post.answer}
          </div>
          {post.puzzleType && (
            <div
              style={{
                fontSize: "24px",
                color: "#6b7280",
                backgroundColor: "#f3f4f6",
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              {post.puzzleType}
            </div>
          )}
        </div>

        {/* Date */}
        <div
          style={{
            fontSize: "20px",
            color: "#9ca3af",
            marginTop: "30px",
          }}
        >
          {new Date(post.date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}

