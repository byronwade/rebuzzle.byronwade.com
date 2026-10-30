import { classifyGuessResponse } from "../guess-response-outcome";

describe("classifyGuessResponse", () => {
  it("treats a daily rollover conflict as a reload, not a completed run", () => {
    expect(
      classifyGuessResponse(409, {
        success: false,
        reloadDaily: true,
      })
    ).toBe("reload-daily");
  });

  it("treats other conflicts and non-winning locks as an already-closed day", () => {
    expect(classifyGuessResponse(409, { success: false, locked: true })).toBe("locked");
    expect(classifyGuessResponse(409, {})).toBe("locked");
    expect(classifyGuessResponse(200, { success: false, locked: true })).toBe("locked");
  });

  it("lets a winning final guess that also reports locked reach the scored path", () => {
    expect(classifyGuessResponse(200, { success: true, locked: true })).toBe("scored");
    expect(classifyGuessResponse(200, { success: true })).toBe("scored");
  });
});
