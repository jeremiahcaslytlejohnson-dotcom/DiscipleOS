import { describe, expect, it, vi } from "vitest";
import {
  isPushSubscriptionCompatible,
  subscribeAndConfirmPush,
} from "../../discipleos/src/lib/push-subscription";

function subscription(endpoint: string, applicationServerKey?: Uint8Array) {
  return {
    endpoint,
    unsubscribe: vi.fn().mockResolvedValue(true),
    options: { applicationServerKey },
  };
}

describe("push subscription lifecycle", () => {
  it("keeps the old subscription until the replacement is confirmed", async () => {
    const oldSubscription = subscription("old");
    const newSubscription = subscription("new");
    const order: string[] = [];

    await subscribeAndConfirmPush({
      existingSubscription: oldSubscription,
      subscribe: vi.fn().mockResolvedValue(newSubscription),
      save: vi.fn(async () => {
        order.push("save");
        return true;
      }),
    });
    order.push("after");

    expect(order).toEqual(["save", "after"]);
    expect(oldSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(newSubscription.unsubscribe).not.toHaveBeenCalled();
  });

  it("does not retire the old subscription when server confirmation fails", async () => {
    const oldSubscription = subscription("old");
    const newSubscription = subscription("new");

    await expect(
      subscribeAndConfirmPush({
        existingSubscription: oldSubscription,
        subscribe: vi.fn().mockResolvedValue(newSubscription),
        save: vi.fn().mockResolvedValue(false),
      }),
    ).rejects.toThrow("not confirmed");

    expect(oldSubscription.unsubscribe).not.toHaveBeenCalled();
    expect(newSubscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("reconciles an existing browser subscription without unsubscribing it", async () => {
    const existingSubscription = subscription("existing");
    const save = vi.fn().mockResolvedValue(true);

    await subscribeAndConfirmPush({
      existingSubscription,
      subscribe: vi.fn().mockResolvedValue(existingSubscription),
      save,
    });

    expect(save).toHaveBeenCalledWith(existingSubscription, undefined);
    expect(existingSubscription.unsubscribe).not.toHaveBeenCalled();
  });

  it("passes a retired incompatible endpoint through after local cleanup", async () => {
    const newSubscription = subscription("new");
    const save = vi.fn().mockResolvedValue(true);

    await subscribeAndConfirmPush({
      previousEndpoint: "old-incompatible-endpoint",
      subscribe: vi.fn().mockResolvedValue(newSubscription),
      save,
    });

    expect(save).toHaveBeenCalledWith(newSubscription, "old-incompatible-endpoint");
  });

  it("detects a different VAPID application server key", () => {
    const currentKey = new Uint8Array([1, 2, 3]);
    const matching = subscription("matching", new Uint8Array([1, 2, 3]));
    const different = subscription("different", new Uint8Array([9, 2, 3]));
    const unknown = subscription("unknown");

    expect(isPushSubscriptionCompatible(matching, currentKey)).toBe(true);
    expect(isPushSubscriptionCompatible(different, currentKey)).toBe(false);
    expect(isPushSubscriptionCompatible(unknown, currentKey)).toBe(true);
  });
});