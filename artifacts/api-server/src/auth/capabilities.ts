import type { Request } from "express";

export type RhythmAccessTier = "basic" | "full";

export const NAMED_JOURNEY_DURATIONS: Record<string, number> = {
  "7-day-climb": 7,
  "20-day-reset": 20,
  "40-day-climb": 40,
};

/**
 * Mountain Rhythm's released routes are free. Keep this boundary explicit so
 * the unreleased 40-Day Climb cannot be started through a direct API call.
 */
export function getRhythmAccessTier(req: Request): RhythmAccessTier {
  const override = process.env.MOUNTAIN_RHYTHM_ACCESS_TIER;
  if (override === "basic") return "basic";
  if (override === "full" || process.env.NODE_ENV !== "production") return "full";

  // Keep the identity lookup here so the future entitlement resolver has one
  // server-authoritative boundary. Authenticated users remain Basic until an
  // entitlement source is connected.
  req.dbUser?.id;
  return "basic";
}

/**
 * The 7-Day Climb is available. The 20-Day Reset and 40-Day Climb remain
 * locked for this release without introducing subscription behavior.
 */
export function canStartNamedJourney(_req: Request, journeyKey?: unknown) {
  return journeyKey === "7-day-climb";
}

export function getNamedJourneyDuration(journeyKey: unknown) {
  if (typeof journeyKey !== "string") return null;
  return Object.prototype.hasOwnProperty.call(NAMED_JOURNEY_DURATIONS, journeyKey)
    ? NAMED_JOURNEY_DURATIONS[journeyKey]
    : null;
}