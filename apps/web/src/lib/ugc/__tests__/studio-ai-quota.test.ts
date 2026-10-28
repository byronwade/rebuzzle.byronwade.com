jest.mock("@/db", () => ({
  db: {},
  getCollection: jest.fn(),
}));

import { getCollection } from "@/db";
import { refundStudioAiGeneration } from "../studio-ai-quota";

const mockUpdateOne = jest.fn();

describe("refundStudioAiGeneration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCollection as jest.Mock).mockReturnValue({ updateOne: mockUpdateOne });
  });

  it("decrements one reserved AI generation credit for the user", async () => {
    await refundStudioAiGeneration("creator-1");

    expect(getCollection).toHaveBeenCalledWith("users");
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { id: "creator-1", studioAiGenerationsUsed: { $gt: 0 } },
      { $inc: { studioAiGenerationsUsed: -1 } }
    );
  });

  it("uses a positive-count filter so refunds cannot make usage negative", async () => {
    await refundStudioAiGeneration("creator-2");

    const [filter] = mockUpdateOne.mock.calls[0] ?? [];
    expect(filter).toEqual({ id: "creator-2", studioAiGenerationsUsed: { $gt: 0 } });
  });
});
