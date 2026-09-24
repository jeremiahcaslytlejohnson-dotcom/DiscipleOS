const PUSH_DEVICE_ID_KEY = "discipleos_push_device_id";

export function getPushDeviceId(): string {
  const existing = window.localStorage.getItem(PUSH_DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId =
    globalThis.crypto?.randomUUID?.() ??
    `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(PUSH_DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export function buildPushRegistrationPayload(
  subscription: PushSubscription,
  previousEndpoint?: string,
  deviceId = getPushDeviceId(),
) {
  return {
    ...subscription.toJSON(),
    deviceId,
    ...(previousEndpoint && previousEndpoint !== subscription.endpoint
      ? { previousEndpoint }
      : {}),
  };
}