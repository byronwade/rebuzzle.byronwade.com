import { isPlayStageScrollable } from "../play-stage-layout";

describe("isPlayStageScrollable", () => {
  it("scrolls when the day is locked", () => {
    expect(
      isPlayStageScrollable({ gameOver: true, stageExpanded: false, keyboardOpen: false })
    ).toBe(true);
  });

  it("scrolls when the mobile puzzle is expanded so chats are pushed down", () => {
    expect(
      isPlayStageScrollable({ gameOver: false, stageExpanded: true, keyboardOpen: false })
    ).toBe(true);
  });

  it("stays pinned while the keyboard is open", () => {
    expect(isPlayStageScrollable({ gameOver: true, stageExpanded: true, keyboardOpen: true })).toBe(
      false
    );
  });

  it("stays pinned during active play with a docked puzzle", () => {
    expect(
      isPlayStageScrollable({ gameOver: false, stageExpanded: false, keyboardOpen: false })
    ).toBe(false);
  });
});
