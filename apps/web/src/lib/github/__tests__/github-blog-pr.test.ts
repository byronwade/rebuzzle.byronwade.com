import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("server-only", () => ({}));
jest.mock("jose", () => ({ importPKCS8: jest.fn(), SignJWT: jest.fn() }));

import { createBlogPostPullRequest } from "../github-blog-pr";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createBlogPostPullRequest", () => {
  const originalEnv = process.env;
  const input = {
    slug: "learn-the-pattern-2026-08-01",
    title: "Learn the Pattern Behind This Rebus",
    puzzleId: "puzzle-123456789",
    publishedAt: "2026-08-01T00:00:00.000Z",
    content: '{"version":1}\n',
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GITHUB_BLOG_TOKEN: "test-token",
      GITHUB_BLOG_REPOSITORY: "example/rebuzzle",
      GITHUB_BLOG_BASE_BRANCH: "main",
      GITHUB_BLOG_PR_DRAFT: "true",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("creates a branch, content commit, and draft pull request", async () => {
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, 404))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, 404))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "base-sha" } }))
      .mockResolvedValueOnce(jsonResponse({ ref: "refs/heads/content/test" }, 201))
      .mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, 404))
      .mockResolvedValueOnce(jsonResponse({ content: { sha: "content-sha" } }, 201))
      .mockResolvedValueOnce(
        jsonResponse(
          { number: 42, html_url: "https://github.com/example/rebuzzle/pull/42", draft: true },
          201
        )
      );
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);

    const result = await createBlogPostPullRequest(input);

    expect(result).toMatchObject({
      success: true,
      pullRequestNumber: 42,
      pullRequestUrl: "https://github.com/example/rebuzzle/pull/42",
      draft: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(8);

    const contentRequest = fetchMock.mock.calls[6];
    expect(contentRequest?.[0]).toContain("/contents/apps/web/content/blog-posts/");
    const contentBody = JSON.parse(String(contentRequest?.[1]?.body));
    expect(Buffer.from(contentBody.content, "base64").toString("utf8")).toBe(input.content);
    expect(contentBody.branch).toBe("content/eve-blog-2026-08-01-puzzle123456");

    const pullBody = JSON.parse(String(fetchMock.mock.calls[7]?.[1]?.body));
    expect(pullBody).toMatchObject({
      head: "content/eve-blog-2026-08-01-puzzle123456",
      base: "main",
      draft: true,
    });
  });

  it("returns the existing open pull request without another commit", async () => {
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, 404))
      .mockResolvedValueOnce(
        jsonResponse([{ number: 9, html_url: "https://github.com/example/rebuzzle/pull/9" }])
      );
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);

    await expect(createBlogPostPullRequest(input)).resolves.toMatchObject({
      success: true,
      skipped: "pull_request_exists",
      pullRequestNumber: 9,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not create a PR when the content file is already on main", async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ sha: "file" }));
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);

    await expect(createBlogPostPullRequest(input)).resolves.toMatchObject({
      success: true,
      skipped: "already_published",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails clearly when no GitHub authentication is configured", async () => {
    process.env.GITHUB_BLOG_TOKEN = undefined;
    process.env.GITHUB_BLOG_APP_ID = undefined;
    process.env.GITHUB_BLOG_APP_INSTALLATION_ID = undefined;
    process.env.GITHUB_BLOG_APP_PRIVATE_KEY = undefined;

    await expect(createBlogPostPullRequest(input)).rejects.toThrow(
      "GitHub blog PR authentication is not configured"
    );
  });
});
