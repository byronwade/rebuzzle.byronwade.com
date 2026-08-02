const verifyAdminAccess = jest.fn();
const findOne = jest.fn();
const proposeBlogForPuzzle = jest.fn();

jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/db/mongodb", () => ({
  getCollection: jest.fn(() => ({ findOne })),
}));
jest.mock("@/lib/blog/propose-puzzle-blog", () => ({ proposeBlogForPuzzle }));

import { POST } from "../route";

function request(body: unknown): Request {
  return new Request("https://rebuzzle.example/api/admin/blogs/propose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/blogs/propose", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    findOne.mockResolvedValue({ id: "puzzle-1", answer: "Tricycle" });
    proposeBlogForPuzzle.mockResolvedValue({
      success: true,
      puzzleId: "puzzle-1",
      title: "Pattern Thinking for Better Rebus Solving",
      slug: "pattern-thinking-2026-08-01",
      pullRequestNumber: 42,
      pullRequestUrl: "https://github.com/example/rebuzzle/pull/42",
      branch: "content/eve-blog-2026-08-01-puzzle1",
      draft: true,
    });
  });

  it("requires administrator access", async () => {
    verifyAdminAccess.mockResolvedValue(null);
    const response = await POST(request({}));
    expect(response.status).toBe(401);
  });

  it("opens a PR from an edited generated post", async () => {
    const response = await POST(
      request({
        puzzleId: "puzzle-1",
        title: "Pattern Thinking for Better Rebus Solving",
        slug: "pattern-thinking",
        excerpt: "Learn a practical process for recognizing patterns in visual word puzzles.",
        content: "A".repeat(250),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.proposal.pullRequestUrl).toBe("https://github.com/example/rebuzzle/pull/42");
    expect(proposeBlogForPuzzle).toHaveBeenCalledWith(
      expect.objectContaining({ id: "puzzle-1" }),
      expect.objectContaining({ slug: "pattern-thinking", content: "A".repeat(250) })
    );
  });

  it("rejects content that cannot satisfy the repository contract", async () => {
    const response = await POST(
      request({
        puzzleId: "puzzle-1",
        title: "Short",
        slug: "x",
        excerpt: "Too short",
        content: "Too short",
      })
    );
    expect(response.status).toBe(400);
    expect(proposeBlogForPuzzle).not.toHaveBeenCalled();
  });
});
