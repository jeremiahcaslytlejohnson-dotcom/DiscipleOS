import "express-session";

declare module "express-session" {
  interface SessionData {
    authUserId?: string;
    userId: string;
    anonymousUserId: string;
    /** True once this session has successfully written at least one piece of user data.
     *  An established session's server state is authoritative even when it returns empty
     *  (the user intentionally has no data). An unestablished session is new/unknown and
     *  should NOT overwrite non-empty localStorage data with an empty server response. */
    sessionEstablished: boolean;
  }
}
