import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { notifyAuthChange, useAuth } from "./auth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
type AuthStep = "email" | "code";
const AUTH_PURPOSE = "email";
const PENDING_VERIFICATION_KEY = "discipleos-pending-email-verification";

type PendingVerification = {
  email: string;
  route: "/sign-in" | "/sign-up";
};

function appPath(path: string) {
  return `${basePath}${path}` || "/";
}

function getErrorMessage(payload: any, fallback: string) {
  if (payload?.code === "CODE_INVALID_OR_EXPIRED") {
    return "That verification code is invalid or expired. Request a new code and try again.";
  }
  return typeof payload?.error === "string" && payload.error ? payload.error : fallback;
}

function readPendingVerification(route: PendingVerification["route"]): PendingVerification | null {
  try {
    const raw = sessionStorage.getItem(PENDING_VERIFICATION_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as Partial<PendingVerification>;
    if (
      pending.route !== route ||
      typeof pending.email !== "string" ||
      pending.email.trim().length < 3 ||
      pending.email.trim().length > 320
    ) {
      return null;
    }
    return { route, email: pending.email };
  } catch {
    return null;
  }
}

function savePendingVerification(route: PendingVerification["route"], email: string) {
  try {
    sessionStorage.setItem(
      PENDING_VERIFICATION_KEY,
      JSON.stringify({ route, email: email.trim().toLowerCase() }),
    );
  } catch {
    // Verification can continue if browser storage is unavailable.
  }
}

function clearPendingVerification() {
  try {
    sessionStorage.removeItem(PENDING_VERIFICATION_KEY);
  } catch {
    // The server-side session remains authoritative.
  }
}

function AuthShell({
  step,
  email,
  code,
  error,
  isBusy,
  onEmailChange,
  onCodeChange,
  onEmailSubmit,
  onCodeSubmit,
  onResend,
  onChangeEmail,
}: {
  step: AuthStep;
  email: string;
  code: string;
  error: string | null;
  isBusy: boolean;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onEmailSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCodeSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  return (
    <div className="discipleos-auth-panel">
      <div className="discipleos-auth-brand">
        <img src={appPath("/logo.svg")} alt="" />
      </div>
      <div className="discipleos-auth-heading">
        <h1>{step === "code" ? "Check your email" : "Continue to DiscipleOS"}</h1>
        <p>
          {step === "code"
            ? `Enter the one-time code we sent to ${email}.`
            : "Use your email to sync DiscipleOS. We’ll create or access your account after you verify the code. No password required."}
        </p>
      </div>

      {step === "email" ? (
        <form className="discipleos-auth-form" onSubmit={onEmailSubmit}>
          <label className="discipleos-auth-label" htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            className="discipleos-auth-input"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
            required
          />
          <button className="discipleos-auth-button" type="submit" disabled={isBusy}>
            {isBusy ? "Sending code…" : "Continue with email"}
          </button>
        </form>
      ) : (
        <form className="discipleos-auth-form" onSubmit={onCodeSubmit}>
          <label className="discipleos-auth-label" htmlFor="auth-code">One-time code</label>
          <input
            id="auth-code"
            className="discipleos-auth-input discipleos-auth-code-input"
            type="text"
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
          />
          <button className="discipleos-auth-button" type="submit" disabled={isBusy}>
            {isBusy ? "Verifying…" : "Verify and continue"}
          </button>
          <div className="discipleos-auth-secondary-actions">
            <button type="button" onClick={onResend} disabled={isBusy}>
              {isBusy ? "Sending…" : "Send a new code"}
            </button>
            <button type="button" onClick={onChangeEmail} disabled={isBusy}>Use a different email</button>
          </div>
        </form>
      )}

      {error ? <p className="discipleos-auth-error" role="alert">{error}</p> : null}

      <a className="discipleos-auth-local-link" href={appPath("/")}>Continue using DiscipleOS locally</a>
    </div>
  );
}

async function postAuth(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function useAuthScreen() {
  const { isLoaded, isSignedIn, refresh } = useAuth();
  const [location, setLocation] = useLocation();
  const authRoute: PendingVerification["route"] = location.startsWith("/sign-up")
    ? "/sign-up"
    : "/sign-in";
  const pendingVerification = readPendingVerification(authRoute);
  const [step, setStep] = useState<AuthStep>(pendingVerification ? "code" : "email");
  const [email, setEmail] = useState(pendingVerification?.email ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation("/");
  }, [isLoaded, isSignedIn, setLocation]);

  async function requestCode() {
    setIsBusy(true);
    setError(null);
    try {
      const { response, payload } = await postAuth("/api/auth/request-code", {
        email: email.trim(),
        purpose: AUTH_PURPOSE,
      });
      if (!response.ok) {
        setError(getErrorMessage(payload, "We could not send a verification code."));
        return;
      }
      setCode("");
      setStep("code");
      savePendingVerification(authRoute, email);
    } catch {
      setError("We could not reach DiscipleOS. You can continue locally and try again later.");
    } finally {
      setIsBusy(false);
    }
  }

  async function verifyCode() {
    setIsBusy(true);
    setError(null);
    try {
      const { response, payload } = await postAuth("/api/auth/verify-code", {
        email: email.trim(),
        purpose: AUTH_PURPOSE,
        code: code.trim(),
      });
      if (!response.ok) {
        setCode("");
        setError(getErrorMessage(payload, "That verification code is invalid or expired."));
        return;
      }

      clearPendingVerification();

      // Claim this browser's anonymous plans/events before refreshing the
      // account context and navigating away. Home still retries this
      // idempotently during its normal sync, but doing it here prevents a
      // timing gap from hiding data immediately after verification.
      const claim = await postAuth("/api/account/claim", {});
      if (!claim.response.ok) {
        // Verification has already established the secure account session and
        // consumed the code. Do not leave the user on a screen where retrying
        // that code can only fail. Home retains local data and retries the
        // session-bound claim during its normal sync.
        await refresh();
        setLocation("/");
        return;
      }

      await refresh();
      notifyAuthChange("signed-in");
      setLocation("/");
    } catch {
      setError("We could not finish verification. Try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function resend() {
    await requestCode();
  }

  function changeEmail() {
    clearPendingVerification();
    setCode("");
    setError(null);
    setStep("email");
  }

  return {
    isLoaded,
    isSignedIn,
    step,
    email,
    code,
    error,
    isBusy,
    onEmailChange: setEmail,
    onCodeChange: setCode,
    onEmailSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void requestCode();
    },
    onCodeSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void verifyCode();
    },
    onResend: () => void resend(),
    onChangeEmail: changeEmail,
  };
}

export function EmailCodeAuth() {
  const props = useAuthScreen();
  if (!props.isLoaded || props.isSignedIn) return null;
  return <AuthShell {...props} />;
}
