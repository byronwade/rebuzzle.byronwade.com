import { publicTitle } from "../submissions";

jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));

describe("publicTitle", () => {
  it("keeps a real title", () => {
    expect(publicTitle("  Garden party ", "sunflower")).toBe("Garden party");
  });

  it("drops a title that restates the answer", () => {
    expect(publicTitle("Sun Flower!", "sunflower")).toBeUndefined();
    expect(publicTitle("", "sunflower")).toBeUndefined();
    expect(publicTitle(undefined, "sunflower")).toBeUndefined();
  });
});
