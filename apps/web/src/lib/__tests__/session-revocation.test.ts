import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const findById = jest.fn<(id: string) => Promise<unknown>>();
jest.mock("@/db", () => ({ db: { userOps: { findById } } }));

import {
  clearSessionRevocationCache,
  isSessionRevoked,
  noteCredentialsChanged,
} from "@/lib/auth/session-revocation";

describe("session revocation", () => {
  beforeEach(() => {
    clearSessionRevocationCache();
    findById.mockReset();
  });

  it("keeps sessions for users who never changed their password", async () => {
    findById.mockResolvedValue({ id: "u1" });
    expect(await isSessionRevoked("u1", 1_000)).toBe(false);
  });

  it("signs out tokens issued before a password change", async () => {
    findById.mockResolvedValue({ id: "u1", passwordChangedAt: new Date(2_000_000) });
    expect(await isSessionRevoked("u1", 1_000)).toBe(true);
    // Same second as the change: the device that changed it keeps its new token.
    expect(await isSessionRevoked("u1", 2_000)).toBe(false);
  });

  it("sees a change on this instance without waiting for the cache", async () => {
    findById.mockResolvedValue({ id: "u1" });
    expect(await isSessionRevoked("u1", 1_000)).toBe(false);
    noteCredentialsChanged("u1", new Date(5_000_000));
    expect(await isSessionRevoked("u1", 1_000)).toBe(true);
  });

  it("fails open when the database errors", async () => {
    findById.mockRejectedValue(new Error("down"));
    expect(await isSessionRevoked("u1", 1_000)).toBe(false);
  });
});

describe("issuedBeforePasswordChange", () => {
  const { issuedBeforePasswordChange } = jest.requireActual("@/lib/auth/session-revocation");
  const changedAt = new Date("2026-10-25T12:00:00Z");
  const changedSec = Math.floor(changedAt.getTime() / 1000);

  it("rejects tokens issued before the change and keeps later ones", () => {
    expect(issuedBeforePasswordChange({ passwordChangedAt: changedAt }, changedSec - 1)).toBe(true);
    expect(issuedBeforePasswordChange({ passwordChangedAt: changedAt }, changedSec)).toBe(false);
    expect(issuedBeforePasswordChange({}, changedSec - 1)).toBe(false);
  });
});

it("revokes deleted users after the short revocation cache expires", async () => {
  clearSessionRevocationCache();
  findById.mockResolvedValue(null);
  expect(await isSessionRevoked("deleted", 1000)).toBe(true);
});
