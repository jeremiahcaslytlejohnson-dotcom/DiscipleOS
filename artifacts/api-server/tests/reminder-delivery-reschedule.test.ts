import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

import webpush from "web-push";
import {
  sendDueReminders,
  sentMarkerCoversSchedule,
  type ReminderDeliveryStore,
  type ReminderDeliveryTransaction,
  type ReminderEvent,
  type ReminderSubscription,
} from "../src/services/reminderDelivery";

const EVENT_ID = "stable-prayer-reminder";
const OWNER_ID = "memory-test-owner";
const ENDPOINT = "https://push.example.invalid/memory-test-device";
const EVENT_DATE = "2026-10-27";

type SentMarker = {
  eventId: string;
  endpoint: string;
  sentAt: Date;
};

function makeEvent(): ReminderEvent {
  return {
    id: EVENT_ID,
    userId: OWNER_ID,
    title: "Morning prayer",
    type: "prayer",
    date: EVENT_DATE,
    time: "09:00",
    notes: "A daily prayer",
    remind: true,
    reminderMinutes: 0,
    repeat: "daily",
    repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
    repeatUntil: null,
    timeZone: "UTC",
    countsTowardRhythm: true,
    updatedAt: new Date(`${EVENT_DATE}T08:00:00.000Z`),
  };
}

function makeSubscription(): ReminderSubscription {
  return {
    id: 1,
    userId: OWNER_ID,
    deviceId: "memory-test-device",
    endpoint: ENDPOINT,
    p256dh: "memory-test-key",
    auth: "memory-test-auth",
    createdAt: new Date(`${EVENT_DATE}T08:00:00.000Z`),
  };
}

function createMemoryStore() {
  const events = [makeEvent()];
  const subscriptions = [makeSubscription()];
  const completions = [
    { eventId: EVENT_ID, occurrenceDate: EVENT_DATE, completed: true },
  ];
  const sentMarkers: SentMarker[] = [];
  const lockTails = new Map<string, Promise<void>>();

  async function withKeyLock<T>(key: string, run: () => Promise<T>): Promise<T> {
    const previous = lockTails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    lockTails.set(key, current);
    await previous;

    try {
      return await run();
    } finally {
      release();
      if (lockTails.get(key) === current) lockTails.delete(key);
    }
  }

  const store: ReminderDeliveryStore = {
    async listEvents() {
      return events.filter((event) => event.remind);
    },
    async listSubscriptions() {
      return [...subscriptions];
    },
    withDeliveryLock(eventId, lockKey, run) {
      return withKeyLock(`event:${eventId}`, () =>
        withKeyLock(lockKey, async () => {
          const transaction: ReminderDeliveryTransaction = {
            async getCurrentEvent(currentEventId, userId) {
              return events.find(
                (event) =>
                  event.id === currentEventId && event.userId === userId,
              );
            },
            async hasSentReminder(lookup) {
              return sentMarkers.some(
                (marker) =>
                  marker.eventId === lookup.eventId &&
                  marker.endpoint === lookup.endpoint &&
                  marker.sentAt >= lookup.dayBounds.start &&
                  marker.sentAt < lookup.dayBounds.end &&
                  sentMarkerCoversSchedule(
                    marker.sentAt,
                    lookup.dueDate,
                    lookup.dueTime,
                    lookup.timeZone,
                  ),
              );
            },
            async recordSentReminder(eventId, endpoint, sentAt) {
              sentMarkers.push({ eventId, endpoint, sentAt: new Date(sentAt) });
            },
            async removeSubscription(id, userId) {
              const index = subscriptions.findIndex(
                (subscription) =>
                  subscription.id === id && subscription.userId === userId,
              );
              if (index < 0) return false;
              subscriptions.splice(index, 1);
              return true;
            },
          };

          return run(transaction);
        }),
      );
    },
  };

  return { store, events, completions, sentMarkers };
}

function utcTime(time: string) {
  return new Date(`${EVENT_DATE}T${time}:00.000Z`);
}

describe("edited reminder delivery with stable event identity", () => {
  beforeEach(() => {
    vi.mocked(webpush.setVapidDetails).mockReset();
    vi.mocked(webpush.sendNotification)
      .mockReset()
      .mockResolvedValue({ statusCode: 201 } as any);
  });

  it("sends a rescheduled reminder once and retains the original marker and completion", async () => {
    const fixture = createMemoryStore();
    const originalMarkerTime = utcTime("09:00");

    const originalRun = await sendDueReminders(
      { now: originalMarkerTime },
      fixture.store,
    );
    expect(originalRun.sent).toBe(1);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(fixture.sentMarkers).toHaveLength(1);

    fixture.events[0] = {
      ...fixture.events[0],
      title: "Updated morning prayer",
      time: "09:05",
      updatedAt: utcTime("09:01"),
    };
    vi.mocked(webpush.sendNotification).mockClear();

    const editedRun = await sendDueReminders(
      { now: utcTime("09:05") },
      fixture.store,
    );
    expect(editedRun.sent).toBe(1);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(fixture.events).toHaveLength(1);
    expect(fixture.events[0].id).toBe(EVENT_ID);
    expect(fixture.sentMarkers).toHaveLength(2);
    expect(fixture.sentMarkers.map((marker) => marker.eventId)).toEqual([
      EVENT_ID,
      EVENT_ID,
    ]);
    expect(fixture.completions).toEqual([
      { eventId: EVENT_ID, occurrenceDate: EVENT_DATE, completed: true },
    ]);

    vi.mocked(webpush.sendNotification).mockClear();
    const repeatedRun = await sendDueReminders(
      { now: utcTime("09:05") },
      fixture.store,
    );
    expect(repeatedRun.sent).toBe(0);
    expect(repeatedRun.alreadySentSkips).toBe(1);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(fixture.sentMarkers).toHaveLength(2);
  });

  it("serializes competing workers for the edited reminder", async () => {
    const fixture = createMemoryStore();
    await sendDueReminders({ now: utcTime("09:00") }, fixture.store);
    fixture.events[0] = {
      ...fixture.events[0],
      time: "09:05",
      updatedAt: utcTime("09:01"),
    };

    vi.mocked(webpush.sendNotification).mockClear();
    vi.mocked(webpush.sendNotification).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return { statusCode: 201 } as any;
    });

    const [firstRun, secondRun] = await Promise.all([
      sendDueReminders(
        { now: utcTime("09:05"), invocationId: "worker-one" },
        fixture.store,
      ),
      sendDueReminders(
        { now: utcTime("09:05"), invocationId: "worker-two" },
        fixture.store,
      ),
    ]);

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(firstRun.sent + secondRun.sent).toBe(1);
    expect(fixture.sentMarkers).toHaveLength(2);
    expect(fixture.sentMarkers.every((marker) => marker.eventId === EVENT_ID)).toBe(
      true,
    );
  });

  it("skips a stale schedule snapshot after an edit wins the event lock", async () => {
    const fixture = createMemoryStore();
    const listEvents = fixture.store.listEvents;
    fixture.store.listEvents = async () => {
      const snapshot = await listEvents();
      fixture.events[0] = {
        ...fixture.events[0],
        time: "09:05",
        updatedAt: utcTime("09:01"),
      };
      return snapshot;
    };

    const staleRun = await sendDueReminders(
      { now: utcTime("09:00") },
      fixture.store,
    );
    expect(staleRun.sent).toBe(0);
    expect(staleRun.alreadySentSkips).toBe(1);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(fixture.sentMarkers).toHaveLength(0);

    const currentRun = await sendDueReminders(
      { now: utcTime("09:05") },
      fixture.store,
    );
    expect(currentRun.sent).toBe(1);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(fixture.sentMarkers).toHaveLength(1);
    expect(fixture.sentMarkers[0].eventId).toBe(EVENT_ID);
  });
});
