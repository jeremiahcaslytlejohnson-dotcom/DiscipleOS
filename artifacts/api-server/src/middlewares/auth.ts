import { db, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

export async function attachCurrentUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authUserId = req.session.authUserId;
    if (!authUserId) {
      next();
      return;
    }

    const [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, authUserId))
      .limit(1);

    if (!dbUser) {
      req.session.authUserId = undefined;
      next();
      return;
    }

    req.dbUser = dbUser;
    next();
  } catch (error) {
    req.log.error({ error }, "Authenticated user lookup failed");
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.dbUser) {
    res.status(401).json({ success: false, error: "Sign in required" });
    return;
  }
  next();
}
