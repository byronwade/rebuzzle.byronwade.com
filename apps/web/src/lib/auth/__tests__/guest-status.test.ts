import { resolveGuestStatus } from "../guest-status";

it("honors an explicit member role even when a legacy email has the guest suffix", () => {
  expect(resolveGuestStatus(false, "member@guest.rebuzzle.local")).toBe(false);
});

it("falls back to the synthetic email for legacy sessions without a role", () => {
  expect(resolveGuestStatus(undefined, "guest@guest.rebuzzle.local")).toBe(true);
  expect(resolveGuestStatus(undefined, "member@example.com")).toBe(false);
});
