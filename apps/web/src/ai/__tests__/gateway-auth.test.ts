import { ensureGatewayKey, getGatewayApiKey, looksLikeJwt } from "../gateway-auth";

describe("AI Gateway auth sanitization", () => {
  const originalKey = process.env.AI_GATEWAY_API_KEY;
  const originalOidc = process.env.VERCEL_OIDC_TOKEN;

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
});
