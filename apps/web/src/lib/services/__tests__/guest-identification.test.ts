import { hashIpAddress } from "../guest-identification";

describe("hashIpAddress", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses IP_HASH_SALT when set", () => {
    process.env.IP_HASH_SALT = "dedicated-salt";
    process.env.AUTH_SECRET = "auth-secret";
    const a = hashIpAddress("1.2.3.4");
    const b = hashIpAddress("1.2.3.4");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("falls back to AUTH_SECRET instead of throwing in production", () => {
    delete process.env.IP_HASH_SALT;
    process.env.AUTH_SECRET = "auth-secret-fallback";
    process.env.NODE_ENV = "production";
    expect(() => hashIpAddress("8.8.8.8")).not.toThrow();
    expect(hashIpAddress("8.8.8.8")).toHaveLength(64);
  });

  it("produces different hashes for different IPs", () => {
    process.env.IP_HASH_SALT = "dedicated-salt";
    expect(hashIpAddress("1.1.1.1")).not.toBe(hashIpAddress("2.2.2.2"));
  });
});
