import { isValidEmail, normalizeEmail, validateUsername } from "@/lib/account-validation";

describe("account validation", () => {
  it("normalizes email casing and whitespace", () => {
    expect(normalizeEmail("  Bob@Example.COM ")).toBe("bob@example.com");
    expect(isValidEmail("bob@example.com")).toBe(true);
    expect(isValidEmail("bob@")).toBe(false);
  });

  it("accepts ordinary usernames", () => {
    expect(validateUsername("Byron")).toBeNull();
    expect(validateUsername("  puzzle_fan 7 ")).toBeNull();
  });

  it("rejects empty, short, long, and URL-breaking usernames", () => {
    expect(validateUsername("")).toMatch(/required/);
    expect(validateUsername(42)).toMatch(/required/);
    expect(validateUsername("ab")).toMatch(/at least 3/);
    expect(validateUsername("x".repeat(41))).toMatch(/40 characters/);
    expect(validateUsername("a/b/c")).toMatch(/can’t contain/);
    expect(validateUsername("what?")).toMatch(/can’t contain/);
  });
});
