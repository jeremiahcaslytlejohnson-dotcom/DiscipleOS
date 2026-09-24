import { apiFetch } from "./api-fetch";
const fetch = apiFetch;
/**
 * Reconnect synchronization primitives for DiscipleOS.
 *
 * When the app is offline, API mutations fail silently (optimistic UI keeps
 * state intact). Each failed mutation is appended as a PendingOp to a
 * localStorage-backed queue. On reconnect, flushPendingOps() replays the queue
 * to the server in insertion order (push-before-pull), then the caller
 * re-hydrates from the server.
 *
 * Owned ops are idempotent on the API side (upserts by id, chapter-complete by
 * planId+key), so replaying is safe even if a previous attempt partially
 * succeeded. Ownership conflicts are non-retryable and are dropped.
 */

import { isRetiredConsistencyResetPlan } from "./consistency-reset";

export type PendingOp =
  | { type: "upsert-event"; payload: any; ts: number }
  | { type: "delete-event"; id: string; ts: number }
  | { type: "upsert-plan"; payload: any; ts: number }
  | { type: "delete-plan"; id: string; ts: number }
  | {
      type: "chapter-complete";
      planId: string;
      key: string;
      completed: boolean;
      earnedDay?: string;
      completionDate?: string;
      ts: number;
    }
  | {
      type: "day-complete";
      planId: string;
      date: string;
      completed: boolean;
      completionDate?: string;
      ts: number;
    }
  | { type: "event-complete"; eventId: string; occurrenceDate: string; completed: boolean; ts: number };

export const PENDING_OPS_KEY = "discipleos:pendingOps";
export const LOCAL_ONLY_AFTER_SIGNOUT_KEY = "discipleos:local-only-after-signout";

export const DASHBOARD_DISCLOSURES_KEY = "discipleos:dashboard-disclosures";

export type DashboardDisclosureState = {
  today: boolean;
  schedule: boolean;
  assignedReading: boolean;
  progress: boolean;
  mountainRhythm: boolean;
};

export const DEFAULT_DASHBOARD_DISCLOSURES: DashboardDisclosureState = {
  today: true,
  schedule: true,
  assignedReading: true,
  progress: false,
  mountainRhythm: false,
};

/**
 * Dashboard disclosures are device preferences, not account data. Keep them
 * separate from the server-sync queue and fall back to the expanded defaults
 * if localStorage is unavailable, malformed, or contains an older shape.
 */
export function loadDashboardDisclosureState(): DashboardDisclosureState {
  try {
    if (typeof localStorage === "undefined") {
      return { ...DEFAULT_DASHBOARD_DISCLOSURES };
    }

    const raw = localStorage.getItem(DASHBOARD_DISCLOSURES_KEY);
    if (!raw) return { ...DEFAULT_DASHBOARD_DISCLOSURES };

    const parsed = JSON.parse(raw);
    return {
      today:
        typeof parsed?.today === "boolean"
          ? parsed.today
          : DEFAULT_DASHBOARD_DISCLOSURES.today,
      schedule:
        typeof parsed?.schedule === "boolean"
          ? parsed.schedule
          : DEFAULT_DASHBOARD_DISCLOSURES.schedule,
      assignedReading:
        typeof parsed?.assignedReading === "boolean"
          ? parsed.assignedReading
          : DEFAULT_DASHBOARD_DISCLOSURES.assignedReading,
      progress:
        typeof parsed?.progress === "boolean"
          ? parsed.progress
          : DEFAULT_DASHBOARD_DISCLOSURES.progress,
      mountainRhythm:
        typeof parsed?.mountainRhythm === "boolean"
          ? parsed.mountainRhythm
          : DEFAULT_DASHBOARD_DISCLOSURES.mountainRhythm,
    };
  } catch {
    return { ...DEFAULT_DASHBOARD_DISCLOSURES };
  }
}

export function saveDashboardDisclosureState(
  state: DashboardDisclosureState,
): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        DASHBOARD_DISCLOSURES_KEY,
        JSON.stringify({
          today: Boolean(state.today),
          schedule: Boolean(state.schedule),
          assignedReading: Boolean(state.assignedReading),
          progress: Boolean(state.progress),
          mountainRhythm: Boolean(state.mountainRhythm),
        }),
      );
    }
  } catch {}
}

export type PendingOpsState = {
  ownerId: string | null;
  ops: PendingOp[];
};

export function loadLocalOnlyAfterSignOut(): boolean {
  try {
    return localStorage.getItem(LOCAL_ONLY_AFTER_SIGNOUT_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveLocalOnlyAfterSignOut(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(LOCAL_ONLY_AFTER_SIGNOUT_KEY, "true");
    } else {
      localStorage.removeItem(LOCAL_ONLY_AFTER_SIGNOUT_KEY);
    }
  } catch {}
}

export type SessionBoundaryState = {
  ownerId: string | null;
  events: any[];
  plans: any[];
  pendingOps: PendingOp[];
  pendingOpsOwnerId: string | null;
};

export type ReconciledSessionBoundary = SessionBoundaryState & {
  localDataWasCleared: boolean;
  pendingOpsWereCleared: boolean;
};

/**
 * A missing owner is intentionally treated as untrusted. Older localStorage
 * values predate session binding and must not be submitted to a new session.
 */
export function reconcileSessionBoundary(
  state: SessionBoundaryState,
  currentOwnerId: string,
): ReconciledSessionBoundary {
  const hasLocalServerData = state.events.length > 0 || state.plans.length > 0;
  const localDataWasCleared =
    state.ownerId !== currentOwnerId && hasLocalServerData;
  const pendingOpsWereCleared =
    state.pendingOps.length > 0 &&
    state.pendingOpsOwnerId !== currentOwnerId;

  return {
    ownerId: currentOwnerId,
    events: localDataWasCleared ? [] : state.events,
    plans: localDataWasCleared ? [] : state.plans,
    pendingOps: pendingOpsWereCleared ? [] : state.pendingOps,
    pendingOpsOwnerId: currentOwnerId,
    localDataWasCleared,
    pendingOpsWereCleared,
  };
}

export function loadPendingOpsState(): PendingOpsState {
  try {
    if (typeof localStorage === "undefined") {
      return { ownerId: null, ops: [] };
    }

    const raw = localStorage.getItem(PENDING_OPS_KEY);
    if (!raw) return { ownerId: null, ops: [] };

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Legacy queues have no owner and are therefore untrusted at startup.
      const ops = (parsed as PendingOp[]).filter((op) => !isRetiredPlanOp(op));
      return { ownerId: null, ops };
    }

    const ownerId = typeof parsed?.ownerId === "string" ? parsed.ownerId : null;
    const originalOps = Array.isArray(parsed?.ops) ? parsed.ops as PendingOp[] : [];
    const ops = originalOps.filter((op) => !isRetiredPlanOp(op));

    if (ops.length !== originalOps.length) {
      localStorage.setItem(
        PENDING_OPS_KEY,
        JSON.stringify({ ownerId, ops }),
      );
    }

    return {
      ownerId,
      ops,
    };
  } catch {
    return { ownerId: null, ops: [] };
  }
}

function isRetiredPlanOp(op: PendingOp) {
  return op.type === "upsert-plan" && isRetiredConsistencyResetPlan(op.payload);
}

export function loadPendingOps(): PendingOp[] {
  return loadPendingOpsState().ops;
}

export function savePendingOps(ops: PendingOp[], ownerId: string | null = null): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        PENDING_OPS_KEY,
        JSON.stringify({ ownerId, ops }),
      );
    }
  } catch {}
}

/** Append one op to the queue and persist. Returns the new array. */
export function addPendingOp(
  ops: PendingOp[],
  op: PendingOp,
  ownerId: string | null = null,
): PendingOp[] {
  const next = [...ops, op];
  savePendingOps(next, ownerId);
  return next;
}

/**
 * Flush pending ops to the server in insertion order (oldest first).
 * Retryable failures are kept in the returned array so the caller can persist
 * them for the next reconnect attempt. Successfully applied ops and ownership
 * conflicts (409) are dropped.
 *
 * This function is intentionally sequential — order matters for
 * create-then-delete or multiple chapter-completions on the same key.
 */
export async function flushPendingOps(
  ops: PendingOp[],
  shouldContinue: () => boolean = () => true,
): Promise<PendingOp[]> {
  if (ops.length === 0) return [];

  const remaining: PendingOp[] = [];

  for (const [index, op] of ops.entries()) {
    if (!shouldContinue()) {
      remaining.push(...ops.slice(index));
      break;
    }
    try {
      let ok = false;

      if (op.type === "upsert-event") {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(op.payload),
        });
        ok = res.ok;
        if (!ok && res.status === 409) continue;
      } else if (op.type === "delete-event") {
        const res = await fetch("/api/events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: op.id }),
        });
        ok = res.ok;
        if (!ok && res.status === 409) continue;
      } else if (op.type === "upsert-plan") {
        const res = await fetch("/api/reading/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(op.payload),
        });
        ok = res.ok;
        if (!ok && res.status === 409) continue;
      } else if (op.type === "delete-plan") {
        const res = await fetch("/api/reading/plans", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: op.id }),
        });
        ok = res.ok;
        if (!ok && res.status === 409) continue;
      } else if (op.type === "chapter-complete") {
        const res = await fetch("/api/reading/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: op.planId,
            key: op.key,
            completed: op.completed,
            earnedDay: op.earnedDay,
            completionDate: op.completionDate,
          }),
        });
        ok = res.ok;
        if (!ok && res.status === 409) continue;
      } else if (op.type === "day-complete") {
        const res = await fetch("/api/reading/day-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: op.planId,
            date: op.date,
            completed: op.completed,
            completionDate: op.completionDate,
          }),
        });
        ok = res.ok;
        if (!ok && res.status === 409) continue;
      } else if (op.type === "event-complete") {
        const res = await fetch("/api/events/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: op.eventId,
            occurrenceDate: op.occurrenceDate,
            completed: op.completed,
          }),
        });
        ok = res.ok;
        if (!ok && res.status === 409) continue;
      }

      if (!ok) remaining.push(op);
    } catch {
      // Network error — keep op for next reconnect
      remaining.push(op);
    }
  }

  return remaining;
}
