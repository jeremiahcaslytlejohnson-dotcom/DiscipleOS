import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session, { type Store } from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachCurrentUser } from "./middlewares/auth";

const PgStore = connectPgSimple(session);

/** Create a shared Postgres-backed session store. Callers can pass the same
 *  store instance to two different app instances to simulate a server restart
 *  while preserving sessions in the database. */
export function createPgSessionStore(): Store {
  return new PgStore({
    pool,
    createTableIfMissing: true,
    // Prune expired sessions every 15 minutes
    pruneSessionInterval: 900,
  }) as unknown as Store;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

/** Factory that builds a fully configured Express app.
 *  Pass an explicit `sessionStore` to share state across instances (useful for
 *  restart-persistence tests). Omits the store argument in production — a new
 *  PgStore backed by the shared pool is created automatically. */
export function createApp(sessionStore?: Store): Express {
  const app: Express = express();
  // Requests reach deployed apps through Replit's HTTPS reverse proxy. Trust
  // that single hop so Express recognizes secure requests and emits the
  // production session cookie correctly.
  app.set("trust proxy", 1);

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    session({
      store: sessionStore ?? createPgSessionStore(),
      secret: sessionSecret!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      },
    }),
  );
  app.use(attachCurrentUser);

  // Anonymous IDs exist only to let a browser safely claim its pre-account
  // data. Signed-in requests always use the local account ID as owner.
  app.use((req, _res, next) => {
    if (!req.session.anonymousUserId) {
      req.session.anonymousUserId = req.session.userId ?? crypto.randomUUID();
    }
    const accountUserId = req.dbUser?.id;
    req.session.userId = accountUserId ?? req.session.anonymousUserId;
    if (accountUserId) req.session.sessionEstablished = true;
    next();
  });

  app.use("/api", router);

  return app;
}

// Singleton app used by the production server
export default createApp();
