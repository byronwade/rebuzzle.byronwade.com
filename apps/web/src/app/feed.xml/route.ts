import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/seo/utils";
import { fetchBlogPosts } from "../actions/blogActions";

/**
 * RSS Feed Generator
 *
 * Generates RSS 2.0 feed for blog posts
 */
export async function GET() {
  try {
    const baseUrl = getBaseUrl();
    const blogPosts = await fetchBlogPosts();

    // Generate RSS XML
    const rssItems = blogPosts
      .slice(0, 20) // Limit to 20 most recent posts
      .map((post) => {
        const pubDate = new Date(post.date).toUTCString();
        const link = `${baseUrl}/blog/${post.slug}`;
        const description = post.excerpt || post.explanation || "Puzzle solution and explanation";

        return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <category><![CDATA[${post.puzzleType || "puzzle"}]]></category>
    </item>`;
      })
      .join("\n");

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Rebuzzle Blog - Puzzle Solutions & Tips</title>
    <link>${baseUrl}/blog</link>
    <description>Daily puzzle solutions, tips, and strategies for Rebuzzle - The ultimate Wordle alternative</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/icon-512x512.png</url>
      <title>Rebuzzle</title>
      <link>${baseUrl}</link>
    </image>
${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rssXml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return new NextResponse("Error generating RSS feed", { status: 500 });
  }
}
