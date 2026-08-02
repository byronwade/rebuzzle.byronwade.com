import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("server-only", () => ({}));

import { loadRepositoryBlogPosts } from "../repository-posts";

const directories: string[] = [];

function createDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "rebuzzle-blog-"));
  directories.push(directory);
  return directory;
}

function validPost(slug = "pattern-thinking-2026-08-01", publishedAt = "2026-08-01T00:00:00Z") {
  return {
    version: 1,
    slug,
    title: "Pattern Thinking for Better Rebus Solving",
    excerpt: "Learn a practical process for recognizing the visual pattern in this daily puzzle.",
    content: "A".repeat(250),
    publishedAt,
    puzzle: {
      id: "puzzle-1",
      display: "CYCLE CYCLE CYCLE",
      type: "rebus",
      answer: "Tricycle",
      explanation: "Three instances of cycle form the word tricycle.",
      difficulty: 4,
      category: "wordplay",
    },
    seoMetadata: {
      focusKeyword: "rebus puzzle",
      secondaryKeywords: ["visual word puzzle"],
      metaDescription:
        "Learn how visual repetition creates the solution to this daily rebus puzzle.",
      readingTime: 3,
      wordCount: 500,
    },
  };
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadRepositoryBlogPosts", () => {
  it("validates, maps, and sorts merged repository posts", () => {
    const directory = createDirectory();
    const older = validPost("older-post-2026-07-31", "2026-07-31T00:00:00Z");
    const newer = validPost("newer-post-2026-08-01", "2026-08-01T00:00:00Z");
    writeFileSync(join(directory, `${older.slug}.json`), JSON.stringify(older));
    writeFileSync(join(directory, `${newer.slug}.json`), JSON.stringify(newer));

    const posts = loadRepositoryBlogPosts(directory);

    expect(posts.map((post) => post.slug)).toEqual([newer.slug, older.slug]);
    expect(posts[0]).toMatchObject({
      date: "2026-08-01",
      puzzle: "CYCLE CYCLE CYCLE",
      puzzleType: "rebus",
      answer: "Tricycle",
    });
  });

  it("fails the build contract for malformed content", () => {
    const directory = createDirectory();
    writeFileSync(join(directory, "broken.json"), "{not-json");

    expect(() => loadRepositoryBlogPosts(directory)).toThrow("Invalid repository blog JSON");
  });

  it("requires the filename to match the post slug", () => {
    const directory = createDirectory();
    writeFileSync(join(directory, "wrong-name.json"), JSON.stringify(validPost()));

    expect(() => loadRepositoryBlogPosts(directory)).toThrow(
      "Repository blog filename must match its slug"
    );
  });
});
