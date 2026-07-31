import { authorizeCron } from "@/lib/cron/auth";

describe("authorizeCron", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CRON_SECRET;
    delete process.env.VERCEL_CRON_SECRET;
    process.env.NODE_ENV = "test";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("allows requests in non-production when no secrets configured", () => {
    const req = new Request("https://example.com/api/cron/x");
    expect(authorizeCron(req).ok).toBe(true);
  });

  it("accepts Bearer CRON_SECRET (Vercel default)", () => {
    process.env.CRON_SECRET = "secret-abc";
    const req = new Request("https://example.com/api/cron/x", {
      headers: { Authorization: "Bearer secret-abc" },
    });
    expect(authorizeCron(req).ok).toBe(true);
  });

  it("accepts x-vercel-cron-secret when configured", () => {
    process.env.VERCEL_CRON_SECRET = "vercel-secret";
    const req = new Request("https://example.com/api/cron/x", {
      headers: { "x-vercel-cron-secret": "vercel-secret" },
    });
    expect(authorizeCron(req).ok).toBe(true);
  });

  it("rejects when secrets are set but neither header matches", () => {
    process.env.CRON_SECRET = "secret-abc";
    const req = new Request("https://example.com/api/cron/x", {
      headers: { Authorization: "Bearer wrong" },
    });
    const result = authorizeCron(req);
    expect(result.ok).toBe(false);
  });

  it("does not require both secrets at once (OR logic)", () => {
    process.env.CRON_SECRET = "secret-abc";
    process.env.VERCEL_CRON_SECRET = "vercel-secret";
    const bearerOnly = new Request("https://example.com/api/cron/x", {
      headers: { Authorization: "Bearer secret-abc" },
    });
    expect(authorizeCron(bearerOnly).ok).toBe(true);
  });
});
