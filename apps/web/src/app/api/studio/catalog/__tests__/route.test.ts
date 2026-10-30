import { GET } from "../route";

jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: async () => ({ userId: "creator" }),
}));
jest.mock("@/lib/ugc/require-studio-user", () => ({
  requireStudioUser: async () => ({ ok: true }),
}));
jest.mock("@/lib/ugc/studio-ai-quota", () => ({
  getStudioAiQuota: async () => ({ used: 0, limit: 3, remaining: 3 }),
}));
it("exposes discovery separately from supported puzzle readings", async () => {
  const response = await GET(new Request("https://rebuzzle.test/api/studio/catalog"));
  const body = await response.json();
  const citrus = body.pictograms.find((item: { concept: string }) => item.concept === "citrus");
  expect(citrus.searchAliases).toContain("lemon");
  expect(citrus.approvedReadings).toEqual(["citrus"]);
  expect(citrus.commonConfusions).toEqual(["orange", "lemon"]);
});
