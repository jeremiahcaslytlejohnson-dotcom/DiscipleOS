import "./_group.css";
import RefinedChart from "./RefinedChart";

function dateAtOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getScore() {
  const trail = Array.from({ length: 7 }, (_, index) => {
    const status = index === 0 ? "missed" : "future";
    return {
      date: dateAtOffset(index - 1),
      status,
      rhythmStatus: status,
      planned: 2,
      completed: 0,
      completion: 0,
      elevationPercent: 0,
      earnedPercent: 0,
      rhythmPercent: 0,
    };
  });

  return {
    journeyDays: 7,
    journeyLabel: "7-Day Climb",
    journeyProgress: 0,
    completedDays: 0,
    level: "Basecamp",
    currentElevationPercent: 0,
    rhythmProgress: 0,
    currentTrend: "Needs a next step",
    todayPlanned: true,
    todayPercentage: 0,
    journeyComplete: false,
    windowEnd: dateAtOffset(0),
    trail,
    message: "Choose a 7-Day Climb to begin.",
  };
}

export function Refined() {
  return (
    <div className="mr-preview">
      <div className="mr-preview__frame">
        <RefinedChart score={getScore()} />
      </div>
    </div>
  );
}
