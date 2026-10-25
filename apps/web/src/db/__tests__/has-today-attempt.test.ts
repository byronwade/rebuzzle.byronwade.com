const findOne = jest.fn();

jest.mock("@/db/mongodb", () => ({
  getCollection: () => ({ findOne }),
}));

import { puzzleAttemptOps } from "../operations";

describe("puzzleAttemptOps.hasTodayAttempt", () => {
  beforeEach(() => findOne.mockReset());

  it("ignores archive and community plays in the legacy fallback", async () => {
    findOne.mockResolvedValue(null);
    const result = await puzzleAttemptOps.hasTodayAttempt("u1", "2026-10-25");
    expect(result.hasAttempt).toBe(false);
    const legacyQuery = findOne.mock.calls[1][0];
    expect(legacyQuery).toMatchObject({ userId: "u1", puzzleDate: null });
  });
});
