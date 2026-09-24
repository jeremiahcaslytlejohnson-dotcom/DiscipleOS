import { Router } from "express";
import { canStartNamedJourney, getRhythmAccessTier } from "../auth/capabilities";

const router = Router();

/**
 * GET /api/session/info
 *
 * Returns the current session's userId and whether the session has been
 * "established" — i.e. it has successfully written at least one piece of user
 * data. The frontend uses this to decide whether an empty server response is
 * authoritative (established session intentionally has no data) or should be
 * ignored (brand-new or unrecognised session should not overwrite localStorage).
 */
router.get("/session/info", (req, res) => {
  const accountUserId = req.dbUser?.id;
  const rhythmAccessTier = getRhythmAccessTier(req);
  res.json({
    userId: req.session.userId ?? null,
    authenticated: Boolean(accountUserId),
    established: Boolean(accountUserId) || req.session.sessionEstablished === true,
    capabilities: {
      mountainRhythm: rhythmAccessTier,
      namedJourneys: canStartNamedJourney(req, "7-day-climb"),
    },
  });
});

export default router;
