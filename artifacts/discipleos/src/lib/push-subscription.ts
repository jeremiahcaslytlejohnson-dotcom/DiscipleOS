type PushLikeSubscription = {
  endpoint: string;
  unsubscribe: () => Promise<boolean>;
  options?: {
    applicationServerKey?: ArrayBuffer | ArrayBufferView | null;
  };
};

type SubscribeAndConfirmInput = {
  existingSubscription?: PushLikeSubscription | null;
  previousEndpoint?: string;
  subscribe: () => Promise<PushLikeSubscription>;
  save: (subscription: PushLikeSubscription, previousEndpoint?: string) => Promise<boolean>;
};

function toUint8Array(value: ArrayBuffer | ArrayBufferView | null | undefined) {
  if (!value) return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

/**
 * Browsers can retain a PushSubscription created with a previous VAPID
 * application server key. Passing the current key to subscribe() while that
 * subscription is still present can fail before the server ever sees a
 * registration attempt.
 *
 * If the browser exposes no applicationServerKey, leave the subscription
 * untouched. That is an unknown state, not proof that it is incompatible.
 */
export function isPushSubscriptionCompatible(
  subscription: PushLikeSubscription,
  applicationServerKey: Uint8Array,
) {
  const existingKey = toUint8Array(subscription.options?.applicationServerKey);
  if (!existingKey) return true;
  if (existingKey.length !== applicationServerKey.length) return false;
  return existingKey.every((value, index) => value === applicationServerKey[index]);
}

/**
 * Register first, retire second. The browser may return the existing
 * subscription from subscribe(), which is also safe to reconcile with the
 * server after a reload.
 */
export async function subscribeAndConfirmPush({
  existingSubscription,
  previousEndpoint,
  subscribe,
  save,
}: SubscribeAndConfirmInput) {
  const subscription = await subscribe();
  const isReplacement =
    Boolean(existingSubscription) &&
    existingSubscription!.endpoint !== subscription.endpoint;
  const endpointToRetire = isReplacement
    ? existingSubscription!.endpoint
    : previousEndpoint;

  try {
    const saved = await save(
      subscription,
      endpointToRetire,
    );
    if (!saved) throw new Error("Push subscription was not confirmed by the server");
  } catch (error) {
    if (subscription !== existingSubscription) {
      await subscription.unsubscribe().catch(() => false);
    }
    throw error;
  }

  if (isReplacement) {
    await existingSubscription!.unsubscribe();
  }

  return subscription;
}