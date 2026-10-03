import { describe, expect, it } from "vitest";
import {
  isReminderDue,
  reminderDueDateISO,
} from "../src/services/reminderDelivery";

describe("reminder delivery window", () => {
  it("accepts the scheduled minute and one minute late, but rejects two minutes late", () => {
    const occurrenceDate = "2026-10-02";

    expect(
      isReminderDue("14:00", 10, occurrenceDate, occurrenceDate, "13:50"),
    ).toBe(true);
    expect(
      isReminderDue("14:00", 10, occurrenceDate, occurrenceDate, "13:51"),
    ).toBe(true);
    expect(
      isReminderDue("14:00", 10, occurrenceDate, occurrenceDate, "13:52"),
    ).toBe(false);
    expect(
      isReminderDue("14:00", 10, occurrenceDate, occurrenceDate, "13:49"),
    ).toBe(false);
  });

  it("keeps a next-day event whose reminder is due before midnight", () => {
    const eventDate = "2026-10-03";

    expect(reminderDueDateISO(eventDate, "00:05", 10)).toBe("2026-10-02");
    expect(isReminderDue("00:05", 10, eventDate, "2026-10-02", "23:55")).toBe(
      true,
    );
    expect(isReminderDue("00:05", 10, eventDate, "2026-10-02", "23:56")).toBe(
      true,
    );
    expect(isReminderDue("00:05", 10, eventDate, "2026-10-02", "23:57")).toBe(
      false,
    );
  });
});