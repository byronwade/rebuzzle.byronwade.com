import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { playInterfaceSound } from "../interface-sounds";
import { playSound } from "../sound-engine";

jest.mock("../sound-engine", () => ({
  playSound: jest.fn(),
}));

const mockedPlaySound = jest.mocked(playSound);

describe("interface sounds", () => {
  beforeEach(() => {
    mockedPlaySound.mockResolvedValue({ stop: jest.fn() });
  });

  afterEach(() => {
    mockedPlaySound.mockReset();
    Reflect.deleteProperty(globalThis, "window");
  });

  it("plays a quiet cue when sounds are enabled", async () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => JSON.stringify({ sound: true }),
        },
      },
    });

    await expect(playInterfaceSound("submit")).resolves.toBe(true);
    expect(mockedPlaySound).toHaveBeenCalledTimes(1);
    expect(mockedPlaySound).toHaveBeenCalledWith(
      expect.stringMatching(/^data:audio\/mpeg;base64,/),
      expect.objectContaining({ volume: expect.any(Number) })
    );
  });

  it("does not initialize playback when the saved preference is muted", async () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => JSON.stringify({ sound: false }),
        },
      },
    });

    await expect(playInterfaceSound("success")).resolves.toBe(false);
    expect(mockedPlaySound).not.toHaveBeenCalled();
  });

  it("can preview the sound setting even while the saved preference is muted", async () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => JSON.stringify({ sound: false }),
        },
      },
    });

    await expect(playInterfaceSound("sound-on", { ignorePreference: true })).resolves.toBe(true);
    expect(mockedPlaySound).toHaveBeenCalledTimes(1);
  });

  it("fails silently when browser audio is unavailable", async () => {
    mockedPlaySound.mockRejectedValue(new Error("AudioContext unavailable"));

    await expect(playInterfaceSound("failure")).resolves.toBe(false);
  });
});
