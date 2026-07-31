import {
  AUTH_COOKIE_NAME,
  getAuthTokenFromRequest,
  LEGACY_AUTH_COOKIE_NAME,
  parseCookieHeader,
} from "../cookies";

describe("auth cookies", () => {
  it("parses cookie headers with equals in values", () => {
    const parsed = parseCookieHeader("a=1; token=abc=def; b=2");
    expect(parsed.a).toBe("1");
    expect(parsed.token).toBe("abc=def");
    expect(parsed.b).toBe("2");
  });

  it("prefers rebuzzle_auth over legacy auth_token", () => {
    const request = new Request("https://example.com", {
      headers: {
        cookie: `${LEGACY_AUTH_COOKIE_NAME}=legacy; ${AUTH_COOKIE_NAME}=canonical`,
      },
    });
    expect(getAuthTokenFromRequest(request)).toBe("canonical");
  });

  it("falls back to legacy auth_token", () => {
    const request = new Request("https://example.com", {
      headers: {
        cookie: `${LEGACY_AUTH_COOKIE_NAME}=legacy-only`,
      },
    });
    expect(getAuthTokenFromRequest(request)).toBe("legacy-only");
  });

  it("returns null when no auth cookie is present", () => {
    const request = new Request("https://example.com", {
      headers: { cookie: "other=1" },
    });
    expect(getAuthTokenFromRequest(request)).toBeNull();
  });
});
