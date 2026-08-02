import { describe, expect, it } from "@jest/globals";
import {
  APP_SETTINGS_STORAGE_KEY,
  createDefaultAppSettings,
  normalizeAppSettings,
  readAppSettings,
  writeAppSettings,
} from "../app-settings";

function createStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: jest.fn(() => value),
    setItem: jest.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("app settings", () => {
  it("uses accessible defaults when nothing has been saved", () => {
    const settings = readAppSettings(createStorage());

    expect(settings.sound).toBe(true);
    expect(settings.showHints).toBe(true);
  });

  it("merges partial stored settings with current defaults", () => {
    const settings = normalizeAppSettings({ sound: false });

    expect(settings).toEqual({
      ...createDefaultAppSettings(),
      sound: false,
    });
  });

  it("ignores invalid values and malformed storage", () => {
    expect(normalizeAppSettings({ sound: "yes", showHints: null })).toEqual(
      createDefaultAppSettings()
    );
    expect(readAppSettings(createStorage("{not-json"))).toEqual(createDefaultAppSettings());
  });

  it("writes the normalized settings payload under the stable storage key", () => {
    const storage = createStorage();
    const settings = { ...createDefaultAppSettings(), sound: false };

    writeAppSettings(settings, storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  });
});
