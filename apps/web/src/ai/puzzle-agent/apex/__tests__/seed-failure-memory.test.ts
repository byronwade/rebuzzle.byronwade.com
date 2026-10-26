const find = jest.fn();
const updateOne = jest.fn();
jest.mock("@/db/mongodb", () => ({ getCollection: () => ({ find, updateOne }) }));

import { loadRecentFailedSeedPairs, recordSeedQualityFailure } from "../seed-failure-memory";

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.REBUZZLE_DIAGNOSTIC_READ_ONLY;
});

test("reads only the requested planner's recent pairs within 48 hours", async () => {
  find.mockReturnValue({
    limit: () => ({
      toArray: async () => [{ pairKey: "historyrepeatingitself:triple_layer_composition" }],
    }),
  });
  const pairs = await loadRecentFailedSeedPairs("planner-v2", new Date("2026-10-29T00:00:00Z"));
  expect([...pairs]).toEqual(["historyrepeatingitself:triple_layer_composition"]);
  expect(find).toHaveBeenCalledWith({
    plannerVersion: "planner-v2",
    lastRejectedAt: { $gte: new Date("2026-10-27T00:00:00Z") },
  });
});

test("normalizes the answer while keeping technique and planner version separate", async () => {
  await recordSeedQualityFailure({
    answer: "History repeating itself!",
    techniqueId: "triple_layer_composition",
    plannerVersion: "planner-v2",
  });
  expect(updateOne).toHaveBeenCalledWith(
    { _id: "planner-v2:historyrepeatingitself:triple_layer_composition" },
    {
      $set: expect.objectContaining({
        plannerVersion: "planner-v2",
        pairKey: "historyrepeatingitself:triple_layer_composition",
      }),
    },
    { upsert: true }
  );
});

test("diagnostic mode never writes", async () => {
  process.env.REBUZZLE_DIAGNOSTIC_READ_ONLY = "1";
  await recordSeedQualityFailure({
    answer: "history",
    techniqueId: "triple_layer_composition",
    plannerVersion: "planner-v2",
  });
  expect(updateOne).not.toHaveBeenCalled();
});

test("database failures do not prevent generation", async () => {
  find.mockImplementation(() => {
    throw new Error("offline");
  });
  updateOne.mockRejectedValue(new Error("offline"));
  expect(await loadRecentFailedSeedPairs("planner-v2")).toEqual(new Set());
  await expect(
    recordSeedQualityFailure({
      answer: "history",
      techniqueId: "triple_layer_composition",
      plannerVersion: "planner-v2",
    })
  ).resolves.toBeUndefined();
});
