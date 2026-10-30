import { GET } from "../route";

jest.mock("next/server", () => ({
  connection: jest.fn().mockResolvedValue(undefined),
}));

describe("Apple App Site Association", () => {
  const originalPrefix = process.env.APPLE_APP_ID_PREFIX;

  afterEach(() => {
    if (originalPrefix === undefined) {
      delete process.env.APPLE_APP_ID_PREFIX;
    } else {
      process.env.APPLE_APP_ID_PREFIX = originalPrefix;
    }
  });

  it("associates only the attributed daily-share URL with the native app", async () => {
    process.env.APPLE_APP_ID_PREFIX = "ABC123DEFG";

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      applinks: {
        details: [
          {
            appIDs: ["ABC123DEFG.com.byronwade.rebuzzle"],
            components: [{ "/": "/", "?": { source: "share" } }],
          },
        ],
      },
    });
  });

  it("fails closed when the Apple App ID prefix is missing or malformed", async () => {
    process.env.APPLE_APP_ID_PREFIX = "";

    const missing = await GET();
    expect(missing.status).toBe(503);

    process.env.APPLE_APP_ID_PREFIX = "ABC123DEFG.com.attacker";
    const malformed = await GET();
    expect(malformed.status).toBe(503);
  });
});
