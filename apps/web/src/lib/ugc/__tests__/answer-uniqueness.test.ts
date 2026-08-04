const findOne = jest.fn();

jest.mock("@/db/mongodb", () => ({
  getCollection: () => ({
    findOne,
  }),
}));

import { isUgcAnswerKeyTaken } from "../submissions";

describe("isUgcAnswerKeyTaken", () => {
  beforeEach(() => {
    findOne.mockReset();
  });

  it("returns false for empty keys", async () => {
    await expect(isUgcAnswerKeyTaken("")).resolves.toBe(false);
    expect(findOne).not.toHaveBeenCalled();
  });

  it("queries live Studio statuses and excludes the current draft", async () => {
    findOne.mockResolvedValueOnce({ id: "other" });
    await expect(isUgcAnswerKeyTaken("sunflower", "draft-1")).resolves.toBe(true);
    expect(findOne).toHaveBeenCalledWith(
      {
        answerKey: "sunflower",
        status: { $in: ["approved", "featured", "pending_grade"] },
        id: { $ne: "draft-1" },
      },
      { projection: { id: 1 } }
    );
  });

  it("returns false when no live collision exists", async () => {
    findOne.mockResolvedValueOnce(null);
    await expect(isUgcAnswerKeyTaken("freshphrase")).resolves.toBe(false);
  });
});
