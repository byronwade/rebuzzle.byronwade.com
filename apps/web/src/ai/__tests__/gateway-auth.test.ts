import {
  ensureGatewayKey,
  formatGatewayAuthError,
  getGatewayApiKey,
  getGatewayAuthDiagnostics,
  isGatewayAuthError,
  looksLikeJwt,
} from "../gateway-auth";

describe("AI Gateway auth sanitization", () => {
  const originalKey = process.env.AI_GATEWAY_API_KEY;
  const originalOidc = process.env.VERCEL_OIDC_TOKEN;
  const originalVercel = process.env.VERCEL;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.AI_GATEWAY_API_KEY;
    } else {
      process.env.AI_GATEWAY_API_KEY = originalKey;
    }
    if (originalOidc === undefined) {
      delete process.env.VERCEL_OIDC_TOKEN;
    } else {
      process.env.VERCEL_OIDC_TOKEN = originalOidc;
    }
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
  });

  it("detects JWTs vs gateway keys", () => {
    expect(looksLikeJwt("vck_test_key_1234567890")).toBe(false);
    expect(
      looksLikeJwt(
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturepart"
      )
    ).toBe(true);
  });

  it("keeps real gateway API keys", () => {
    process.env.AI_GATEWAY_API_KEY = "vck_test_key_1234567890";
    delete process.env.VERCEL_OIDC_TOKEN;
    ensureGatewayKey();
    expect(getGatewayApiKey()).toBe("vck_test_key_1234567890");
  });

  it("does not treat OIDC JWTs as API keys", () => {
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturepart";
    process.env.AI_GATEWAY_API_KEY = jwt;
    delete process.env.VERCEL_OIDC_TOKEN;
    ensureGatewayKey();
    expect(getGatewayApiKey()).toBeUndefined();
    expect(process.env.AI_GATEWAY_API_KEY).toBeUndefined();
    expect(process.env.VERCEL_OIDC_TOKEN).toBe(jwt);
  });

  it("reports missing auth off Vercel without a key", () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    delete process.env.VERCEL;
    const d = getGatewayAuthDiagnostics();
    expect(d.authPath).toBe("missing");
    expect(d.likelyConfigured).toBe(false);
    expect(formatGatewayAuthError(d)).toMatch(/AI_GATEWAY_API_KEY/);
    expect(formatGatewayAuthError(d)).toMatch(/\.env\.local/);
  });

  it("points at Vercel project env when on Vercel without a key", () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    const d = getGatewayAuthDiagnostics();
    expect(d.authPath).toBe("oidc");
    expect(d.likelyConfigured).toBe(true);
    expect(formatGatewayAuthError({ ...d, apiKeyPresent: false })).toMatch(
      /Project Settings/
    );
  });

  it("detects gateway auth errors", () => {
    expect(
      isGatewayAuthError(
        new Error(
          "Unauthenticated. Configure AI_GATEWAY_API_KEY or use a provider module."
        )
      )
    ).toBe(true);
    expect(isGatewayAuthError(new Error("Quality below threshold"))).toBe(false);
  });
});
