/**
 * API tests for Resend notification crons.
 * Mocks Mongo + Resend; verifies GET works (Vercel cron) and auth.
 */

const findOne = jest.fn();
const updateOne = jest.fn();
const insertOne = jest.fn();
const toArray = jest.fn();
const find = jest.fn(() => ({ toArray }));
const fetchBlogPosts = jest.fn();

jest.mock("@/app/actions/blogActions", () => ({
  fetchBlogPosts,
}));

jest.mock("@/db/mongodb", () => ({
  getCollection: jest.fn(() => ({
    findOne,
    updateOne,
    insertOne,
    find,
  })),
}));

jest.mock("@/lib/notifications/email-service", () => ({
  sendDailyPuzzleEmail: jest.fn(),
  sendBlogPostEmail: jest.fn(),
  sendStreakAtRiskEmail: jest.fn(),
}));

jest.mock("@/lib/env", () => ({
  getAppUrl: () => "https://rebuzzle.byronwade.com",
}));

import { sendBlogPostEmail, sendDailyPuzzleEmail } from "@/lib/notifications/email-service";
import { GET as getBlogEmails } from "../send-blog-emails/route";
import { GET as getPuzzleEmails } from "../send-notifications/route";

const mockedSendDaily = sendDailyPuzzleEmail as jest.MockedFunction<typeof sendDailyPuzzleEmail>;
const mockedSendBlog = sendBlogPostEmail as jest.MockedFunction<typeof sendBlogPostEmail>;

describe("email cron routes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test", CRON_SECRET: "test-cron" };
    find.mockImplementation(() => ({ toArray }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("GET /api/cron/send-notifications sends puzzle emails to subscribers", async () => {
    findOne.mockResolvedValue({
      id: "p1",
      puzzleType: "rebus",
      difficulty: 6,
      publishedAt: new Date(),
    });
    toArray
      .mockResolvedValueOnce([
        {
          id: "sub-1",
          email: "player@example.com",
          userId: "u1",
          enabled: true,
        },
      ])
      .mockResolvedValueOnce([{ id: "u1", email: "player@example.com", username: "Player" }])
      // In-app recipients: signed-in players (not email-gated)
      .mockResolvedValueOnce([{ id: "u1" }, { id: "u2" }]);
    mockedSendDaily.mockResolvedValue({ success: true, messageId: "msg-1" });

    const res = await getPuzzleEmails(
      new Request("https://rebuzzle.byronwade.com/api/cron/send-notifications", {
        headers: { Authorization: "Bearer test-cron" },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockedSendDaily).toHaveBeenCalledWith(
      "player@example.com",
      expect.any(String),
      expect.objectContaining({ username: "Player" })
    );
    expect(updateOne).toHaveBeenCalled();
    expect(insertOne).toHaveBeenCalledTimes(2);
    expect(body.results.inApp.created).toBe(2);
  });

  it("GET /api/cron/send-blog-emails sends the latest Eve post", async () => {
    fetchBlogPosts.mockResolvedValue([
      {
        title: "Yesterday's Rebus",
        slug: "yesterdays-rebus",
        excerpt: "A clever aha",
      },
    ]);
    findOne.mockResolvedValue({
      slug: "different-post",
    });
    toArray
      .mockResolvedValueOnce([{ id: "sub-1", email: "reader@example.com", enabled: true }])
      .mockResolvedValueOnce([]);
    mockedSendBlog.mockResolvedValue({ success: true, messageId: "msg-2" });

    const res = await getBlogEmails(
      new Request("https://rebuzzle.byronwade.com/api/cron/send-blog-emails", {
        headers: { Authorization: "Bearer test-cron" },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockedSendBlog).toHaveBeenCalledWith(
      "reader@example.com",
      expect.objectContaining({
        postTitle: "Yesterday's Rebus",
        authorName: "Eve",
      })
    );
    expect(updateOne).toHaveBeenCalled();
  });

  it("rejects unauthorized cron GET", async () => {
    const res = await getPuzzleEmails(
      new Request("https://rebuzzle.byronwade.com/api/cron/send-notifications")
    );
    expect(res.status).toBe(401);
  });
});
