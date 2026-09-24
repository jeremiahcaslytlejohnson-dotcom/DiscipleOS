import { useEffect, useState } from "react";
import { Check, Inbox, LoaderCircle, Mail, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

type FeedbackRecord = {
  id: string;
  createdAt: string;
  category: string;
  message: string;
  page: string | null;
  userId: string | null;
  userEmail: string | null;
  reviewedAt: string | null;
  notificationStatus: "pending" | "sending" | "failed" | "sent" | null;
  notificationAttempts: number;
  notificationLastAttemptAt: string | null;
  notificationLastError: string | null;
  notificationSentAt: string | null;
};

function formatSubmittedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function FeedbackInbox() {
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  async function loadFeedback({ refresh = false } = {}) {
    setError("");
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await apiFetch("/api/feedback");
      if (!response.ok) throw new Error("Could not load feedback");
      const payload = await response.json();
      setFeedback(Array.isArray(payload?.feedback) ? payload.feedback : []);
    } catch {
      setError("Could not load feedback right now.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadFeedback();
  }, []);

  async function updateReviewed(item: FeedbackRecord) {
    const reviewed = !item.reviewedAt;
    setUpdatingId(item.id);
    setError("");

    try {
      const response = await apiFetch(`/api/feedback/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed }),
      });
      if (!response.ok) throw new Error("Could not update feedback");
      const payload = await response.json();
      const reviewedAt = payload?.feedback?.reviewedAt ?? null;
      setFeedback((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, reviewedAt } : entry)),
      );
    } catch {
      setError("Could not update that feedback right now.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function retryNotification(item: FeedbackRecord) {
    setRetryingId(item.id);
    setError("");
    setNotificationMessage("");

    try {
      const response = await apiFetch(
        `/api/feedback/${encodeURIComponent(item.id)}/notification/retry`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Could not retry that notification.");
      }

      setNotificationMessage(
        payload.alreadySent
          ? "That feedback notification was already sent."
          : "Feedback notification sent.",
      );
      await loadFeedback({ refresh: true });
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Could not retry that notification right now.",
      );
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <section id="feedback-inbox" className="discipleos-functional-surface mt-5 scroll-mt-6 p-4 sm:p-6" aria-labelledby="feedback-inbox-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#D4A017]">
            <Inbox className="h-4 w-4" aria-hidden="true" />
            <span>Owner tools</span>
          </div>
          <h2 id="feedback-inbox-heading" className="mt-2 text-lg font-semibold tracking-[-0.02em] text-white">
            Feedback inbox
          </h2>
          <p className="discipleos-section-description mt-1 max-w-2xl">
            Review feedback saved from across DiscipleOS. Newest submissions appear first.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadFeedback({ refresh: true })}
          disabled={isRefreshing || isLoading}
          className="discipleos-control--compact inline-flex shrink-0 items-center justify-center gap-2 self-start border border-white/10 px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-[#D4A017]/35 hover:bg-[#D4A017]/10 hover:text-[#F4D77A] disabled:cursor-wait disabled:opacity-60"
          data-testid="feedback-inbox-refresh"
        >
          {isRefreshing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-4 border border-red-300/25 bg-red-950/20 p-3 text-sm text-red-100" role="alert">
          {error}
        </p>
      ) : null}
      {notificationMessage ? (
        <p
          className="mt-4 border border-emerald-300/25 bg-emerald-400/10 p-3 text-sm text-emerald-100"
          role="status"
          data-testid="feedback-inbox-notification-message"
        >
          {notificationMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-white/60" role="status">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading feedback…
        </div>
      ) : feedback.length === 0 ? (
        <div className="discipleos-empty-state mt-5 text-sm">
          No feedback submissions yet.
        </div>
      ) : (
        <div className="mt-5 divide-y divide-white/10 border-y border-white/10" data-testid="feedback-inbox-list">
          {feedback.map((item) => {
            const isReviewed = Boolean(item.reviewedAt);
            const isNotificationSent =
              item.notificationStatus === "sent" || Boolean(item.notificationSentAt);
            const canRetryNotification =
              !isNotificationSent &&
              ["pending", "sending", "failed"].includes(item.notificationStatus || "");
            return (
              <article key={item.id} className="py-4 first:pt-0 last:pb-0" data-testid={`feedback-inbox-item-${item.id}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F4D77A]">
                        {item.category}
                      </span>
                      <span
                        className={cn(
                          "border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]",
                          isReviewed
                            ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                            : "border-[#D4A017]/30 bg-[#D4A017]/10 text-[#F4D77A]",
                        )}
                      >
                        {isReviewed ? "Reviewed" : "New"}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/90">{item.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void updateReviewed(item)}
                    disabled={updatingId === item.id}
                    className="discipleos-control--compact inline-flex shrink-0 items-center justify-center gap-2 self-start border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-[#D4A017]/35 hover:bg-[#D4A017]/10 hover:text-[#F4D77A] disabled:cursor-wait disabled:opacity-60"
                    data-testid={`feedback-inbox-review-${item.id}`}
                  >
                    {updatingId === item.id ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : isReviewed ? (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isReviewed ? "Mark new" : "Mark reviewed"}
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-1 text-xs text-white/55 sm:flex-row sm:flex-wrap sm:gap-x-4">
                  <time dateTime={item.createdAt} title={item.createdAt}>
                    {formatSubmittedAt(item.createdAt)}
                  </time>
                  <span>Page/source: {item.page || "Not provided"}</span>
                  <span>{item.userEmail || "Anonymous user"}</span>
                  {isNotificationSent ? <span>Email notification: Sent</span> : null}
                  {item.notificationStatus === "failed" ? (
                    <span>Email notification: Failed</span>
                  ) : null}
                </div>
                {item.notificationLastError ? (
                  <p className="mt-2 break-words text-xs text-red-200/75">
                    Last email error: {item.notificationLastError}
                  </p>
                ) : null}
                {canRetryNotification ? (
                  <button
                    type="button"
                    onClick={() => void retryNotification(item)}
                    disabled={retryingId === item.id}
                    className="discipleos-control--compact mt-3 inline-flex items-center justify-center gap-2 border border-[#D4A017]/30 bg-[#D4A017]/10 px-3 py-2 text-xs font-semibold text-[#F4D77A] transition hover:border-[#D4A017]/55 hover:bg-[#D4A017]/15 disabled:cursor-wait disabled:opacity-60"
                    data-testid={`feedback-inbox-retry-${item.id}`}
                  >
                    {retryingId === item.id ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {item.notificationStatus === "pending" ? "Send email" : "Retry email"}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}