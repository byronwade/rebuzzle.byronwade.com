const insertOne = jest.fn();
jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn(() => ({ insertOne })) }));
jest.mock("../email-service", () => ({ sendEmail: jest.fn() }));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { logger } from "@/lib/logger";
import { sendEmail } from "../email-service";
import { sendOwnerAlert } from "../owner-alerts";

describe("sendOwnerAlert", () => {
  const original = process.env.ADMIN_ALERT_EMAIL;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_ALERT_EMAIL = "owner@example.com";
    insertOne.mockResolvedValue({});
    (sendEmail as jest.Mock).mockResolvedValue({ success: true });
  });
  afterAll(() => {
    if (original === undefined) delete process.env.ADMIN_ALERT_EMAIL;
    else process.env.ADMIN_ALERT_EMAIL = original;
  });

  const alert = {
    type: "backup_used" as const,
    level: "urgent" as const,
    dateKey: "2026-11-20",
    message: "No scheduled puzzle for 2026-11-20; served a backup.",
  };

  it("records the alert once and emails the owner", async () => {
    await expect(sendOwnerAlert(alert)).resolves.toBe("sent");
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ key: "backup_used:2026-11-20", level: "urgent" })
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        subject: "[Rebuzzle URGENT] backup_used 2026-11-20",
      })
    );
  });

  it("skips duplicates of the same type and date", async () => {
    insertOne.mockRejectedValueOnce({ code: 11000 });
    await expect(sendOwnerAlert(alert)).resolves.toBe("duplicate");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("never throws, even when email is not configured", async () => {
    delete process.env.ADMIN_ALERT_EMAIL;
    await expect(sendOwnerAlert(alert)).resolves.toBe("not_configured");
    expect(logger.error).toHaveBeenCalled();
  });
});
