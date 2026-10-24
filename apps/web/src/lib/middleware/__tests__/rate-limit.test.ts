import { rateLimit, rateLimiters } from "../rate-limit";

function requestFrom(ip: string): Request {
  return new Request("https://rebuzzle.test/api", { headers: { "x-forwarded-for": ip } });
}

describe("rateLimiters", () => {
  it("keeps each named limiter in its own bucket for the same IP", async () => {
    const request = requestFrom("203.0.113.7");
    for (let i = 0; i < 10; i += 1) {
      await rateLimiters.api(request);
    }

    const auth = await rateLimiters.auth(request);
    const guest = await rateLimiters.guest(request);

    expect(auth?.success).toBe(true);
    expect(auth?.remaining).toBe(4);
    expect(guest?.success).toBe(true);
  });

  it("still enforces a limiter's own allowance", async () => {
    const limiter = rateLimit({ name: "test-tight", windowMs: 60_000, maxRequests: 2 });
    const request = requestFrom("203.0.113.8");

    expect((await limiter(request))?.success).toBe(true);
    expect((await limiter(request))?.success).toBe(true);
    expect((await limiter(request))?.success).toBe(false);
  });
});
