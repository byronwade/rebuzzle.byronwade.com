import { getPlayDayCount, recordPlayDay, shouldPromptGuestSave } from "../play-days";

describe("play-days", () => {
  const store = new Map<string, string>();

  beforeAll(() => {
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      },
      configurable: true,
    });
  });

  beforeEach(() => {
    store.clear();
  });

  it("records distinct days and gates guest save on day 2", () => {
    expect(getPlayDayCount()).toBe(0);
    expect(shouldPromptGuestSave()).toBe(false);

    expect(recordPlayDay("2026-08-01")).toBe(1);
    expect(shouldPromptGuestSave()).toBe(false);

    expect(recordPlayDay("2026-08-01")).toBe(1);
    expect(recordPlayDay("2026-08-02")).toBe(2);
    expect(shouldPromptGuestSave()).toBe(true);
  });
});
