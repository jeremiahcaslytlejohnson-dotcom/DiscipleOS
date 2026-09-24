import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-fetch";

type FeedbackCategory = "feedback" | "bug" | "idea";

const categories: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "feedback", label: "General feedback" },
  { value: "bug", label: "Report a problem" },
  { value: "idea", label: "Share an idea" },
];

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("feedback");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    textareaRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function openWidget() {
    setStatus("idle");
    setIsOpen(true);
  }

  function closeWidget() {
    if (status !== "sending") setIsOpen(false);
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 2 || status === "sending") return;

    setStatus("sending");
    try {
      const response = await apiFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          page: window.location.pathname,
        }),
      });
      if (!response.ok) throw new Error("Feedback submission failed");
      setMessage("");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        className="discipleos-feedback-trigger"
        onClick={openWidget}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">✦</span>
        Feedback
      </button>

      {isOpen ? (
        <div
          className="discipleos-feedback-layer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWidget();
          }}
        >
          <div
            ref={dialogRef}
            className="discipleos-feedback-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            <div className="discipleos-feedback-dialog-header">
              <div>
                <p className="discipleos-feedback-eyebrow">Help shape DiscipleOS</p>
                <h2 id="feedback-title">How is it going?</h2>
              </div>
              <button
                type="button"
                className="discipleos-feedback-close"
                onClick={closeWidget}
                aria-label="Close feedback"
              >
                ×
              </button>
            </div>

            {status === "sent" ? (
              <div className="discipleos-feedback-success" role="status">
                <strong>Thank you for sharing.</strong>
                <span>Your feedback has been sent to the DiscipleOS team.</span>
                <button type="button" onClick={() => setIsOpen(false)}>Done</button>
              </div>
            ) : (
              <form className="discipleos-feedback-form" onSubmit={submitFeedback}>
                <label htmlFor="feedback-category">What would you like to share?</label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
                  disabled={status === "sending"}
                >
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>

                <label htmlFor="feedback-message">Your message</label>
                <textarea
                  ref={textareaRef}
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell us what worked, what did not, or what would help."
                  maxLength={2_000}
                  rows={5}
                  required
                  disabled={status === "sending"}
                />
                <div className="discipleos-feedback-form-footer">
                  <span>{message.length}/2,000</span>
                  <button type="submit" disabled={status === "sending" || message.trim().length < 2}>
                    {status === "sending" ? "Sending…" : "Send feedback"}
                  </button>
                </div>
                {status === "error" ? (
                  <p className="discipleos-feedback-error" role="alert">
                    We could not send that right now. Please try again.
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}