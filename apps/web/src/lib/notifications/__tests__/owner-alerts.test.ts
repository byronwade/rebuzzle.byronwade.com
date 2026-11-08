type Row = Record<string, unknown> & { key: string };
let rows: Row[] = [];
const matches = (row: Row, filter: Record<string, unknown>) =>
  Object.entries(filter).every(([field, expected]) => {
    if (expected && typeof expected === "object" && "$exists" in expected) {
      return (row[field] !== undefined) === (expected as { $exists: boolean }).$exists;
    }
    if (expected instanceof Date) {
      return row[field] instanceof Date && (row[field] as Date).getTime() === expected.getTime();
    }
    return row[field] === expected;
  });
// An in-memory stand-in with no unique index, so dedupe must not depend on one.
const collection = {
  findOne: jest.fn(async (filter: Record<string, unknown>) => {
    return rows.find((row) => matches(row, filter)) ?? null;
  }),
  insertOne: jest.fn(async (doc: Row) => {
    rows.push({ ...doc });
    return {};
  }),
  updateOne: jest.fn(
    async (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) => {
      const row = rows.find((candidate) => matches(candidate, filter));
      if (!row) return { modifiedCount: 0 };
      Object.assign(row, update.$set);
      return { modifiedCount: 1 };
    }
  ),
};
jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn(() => collection) }));
jest.mock("../email-service", () => ({ sendEmail: jest.fn() }));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { logger } from "@/lib/logger";
import { sendEmail } from "../email-service";
import { OWNER_ALERT_RETRY_MS, sendOwnerAlert } from "../owner-alerts";

describe("sendOwnerAlert", () => {
  const original = process.env.ADMIN_ALERT_EMAIL;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date("2026-11-20T12:00:00.000Z") });
    rows = [];
    process.env.ADMIN_ALERT_EMAIL = "owner@example.com";
    (sendEmail as jest.Mock).mockResolvedValue({ success: true });
  });
  afterEach(() => {
    jest.useRealTimers();
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
    expect(rows).toEqual([
      expect.objectContaining({ key: "backup_used:2026-11-20", sentAt: expect.any(Date) }),
    ]);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        subject: "[Rebuzzle URGENT] backup_used 2026-11-20",
      })
    );
  });

  it("emails at most once per type and date across repeated requests", async () => {
    await sendOwnerAlert(alert);
    for (let i = 0; i < 5; i += 1) {
      await expect(sendOwnerAlert(alert)).resolves.toBe("duplicate");
    }
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("treats a concurrent insert of the same key as a duplicate", async () => {
    collection.insertOne.mockRejectedValueOnce({ code: 11000 });
    await expect(sendOwnerAlert(alert)).resolves.toBe("duplicate");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does not email when the alert cannot be recorded", async () => {
    collection.insertOne.mockRejectedValueOnce(new Error("mongo unavailable"));
    await expect(sendOwnerAlert(alert)).resolves.toBe("failed");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it("does not use up the alert when email is not configured", async () => {
    delete process.env.ADMIN_ALERT_EMAIL;
    await expect(sendOwnerAlert(alert)).resolves.toBe("not_configured");
    expect(rows).toHaveLength(0);
    expect(logger.error).toHaveBeenCalled();

    process.env.ADMIN_ALERT_EMAIL = "owner@example.com";
    await expect(sendOwnerAlert(alert)).resolves.toBe("sent");
  });

  it("retries a failed send only after the cooldown", async () => {
    (sendEmail as jest.Mock).mockResolvedValueOnce({ success: false, error: "resend down" });
    await expect(sendOwnerAlert(alert)).resolves.toBe("failed");
    await expect(sendOwnerAlert(alert)).resolves.toBe("duplicate");
    expect(sendEmail).toHaveBeenCalledTimes(1);

    jest.setSystemTime(Date.now() + OWNER_ALERT_RETRY_MS);
    await expect(sendOwnerAlert(alert)).resolves.toBe("sent");
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});
