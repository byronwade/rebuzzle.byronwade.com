jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

import { cookies, headers } from "next/headers";
import { resolveRequestTimeZone } from "../timezone";

beforeEach(() => jest.clearAllMocks());

it("accepts a valid explicit device time zone before the Vercel IP fallback", async () => {
  jest.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  jest.mocked(headers).mockResolvedValue(
    new Headers({
      "x-rebuzzle-time-zone": "America/Denver",
      "x-vercel-ip-timezone": "UTC",
    }) as never
  );

  await expect(resolveRequestTimeZone()).resolves.toBe("America/Denver");
});

it("ignores invalid explicit zones and keeps the cookie preference", async () => {
  jest.mocked(cookies).mockResolvedValue({ get: () => ({ value: "Europe/Paris" }) } as never);
  jest
    .mocked(headers)
    .mockResolvedValue(new Headers({ "x-rebuzzle-time-zone": "Mars/Phobos" }) as never);

  await expect(resolveRequestTimeZone()).resolves.toBe("Europe/Paris");
});
