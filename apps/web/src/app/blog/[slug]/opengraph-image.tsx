import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchBlogPost } from "@/app/actions/blogActions";

/**
 * Blog post Open Graph image — matches Rebuzzle ink-on-canvas brand.
 */
export const alt = "Rebuzzle Blog Post";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  const logoBuffer = await readFile(join(process.cwd(), "public/brand/logo-mark.png"));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  if (!post) {
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- OG ImageResponse */}
        <img
          alt=""
          height={96}
          src={logoSrc}
          style={{ marginBottom: 28, borderRadius: 22 }}
          width={96}
        />
        <div
          style={{
            fontSize: 56,
            fontWeight: 600,
            color: "#171717",
            letterSpacing: "-0.04em",
          }}
        >
          Rebuzzle Blog
        </div>
      </div>,
      { ...size }
    );
  }

  const title = post.title.length > 60 ? `${post.title.slice(0, 57)}...` : post.title;

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
      <div
        style={{
          width: "100%",
          height: 120,
          display: "flex",
          alignItems: "center",
          padding: "0 64px",
          borderBottom: "1px solid #ebebeb",
          backgroundColor: "#fafafa",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- OG ImageResponse */}
        <img
          alt=""
          height={48}
          src={logoSrc}
          style={{ borderRadius: 12, marginRight: 16 }}
          width={48}
        />
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#171717",
            letterSpacing: "-0.04em",
          }}
        >
          Rebuzzle Blog
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 600,
            color: "#171717",
            letterSpacing: "-0.035em",
            marginBottom: 28,
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginTop: 12,
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: "#0070f3",
              fontWeight: 600,
            }}
          >
            Puzzle: {post.answer}
          </div>
          {post.puzzleType ? (
            <div
              style={{
                fontSize: 20,
                color: "#666666",
                backgroundColor: "#f5f5f5",
                padding: "8px 14px",
                borderRadius: 999,
              }}
            >
              {post.puzzleType}
            </div>
          ) : null}
        </div>

        <div
          style={{
            fontSize: 18,
            color: "#888888",
            marginTop: 28,
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
    { ...size }
  );
}
