import { formatEstimatedReadingTime } from "../bible-data";

type EstimatedReadingTimeProps = {
  minutes: number;
  className?: string;
  testId?: string;
};

export default function EstimatedReadingTime({
  minutes,
  className = "",
  testId,
}: EstimatedReadingTimeProps) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  const formattedTime = formatEstimatedReadingTime(minutes);

  return (
    <span
      data-testid={testId}
      className={`discipleos-meta-copy ${className}`.trim()}
      title="Estimated from passage length; actual reading time varies"
      aria-label={`Estimated reading time: about ${formattedTime}`}
    >
      ≈ {formattedTime}
    </span>
  );
}
