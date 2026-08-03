import {
  dailyReminderDialogBlurb,
  dailyReminderEnabledBlurb,
  dailyReminderOptInCta,
  PUZZLE_EMAIL_REMINDER_SHORT,
  PUZZLE_PUBLISH_COPY,
} from "../reminder-copy";

describe("reminder-copy", () => {
  it("never claims 8 AM for puzzle emails", () => {
    const blobs = [
      dailyReminderDialogBlurb(),
      dailyReminderEnabledBlurb(),
      dailyReminderOptInCta(),
      PUZZLE_EMAIL_REMINDER_SHORT,
      PUZZLE_PUBLISH_COPY,
    ].join(" ");
    expect(blobs).not.toMatch(/8\s*AM/i);
    expect(blobs).toMatch(/4 PM UTC|UTC midnight/);
  });
});
