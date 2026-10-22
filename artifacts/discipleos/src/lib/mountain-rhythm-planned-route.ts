export type PlannedRoutePoint = {
  x: number;
  y: number;
};

function dailyGainWeight(dayIndex: number, pointCount: number) {
  if (pointCount === 7) {
    const sevenDayWeights = [0, 0.12, 0.1, 0.1, 0.35, 0.2, 0.35];
    return sevenDayWeights[dayIndex] ?? 0.1;
  }

  const phase = dayIndex / Math.max(1, pointCount - 1);
  const rollingPhase = 0.5 + 0.5 * Math.sin(2 * Math.PI * (phase * 3 - 0.2));
  const shortPhase = 0.5 + 0.5 * Math.sin(2 * Math.PI * (phase * 8 + 0.15));
  const macroRiseOne = Math.exp(-(((phase - 0.32) / 0.075) ** 2));
  const macroRiseTwo = Math.exp(-(((phase - 0.76) / 0.065) ** 2));

  return (
    0.12 +
    0.58 * rollingPhase ** 1.45 +
    0.12 * shortPhase +
    0.4 * macroRiseOne +
    0.48 * macroRiseTwo
  );
}

export function plannedElevationPercent(
  index: number,
  pointCount: number,
  currentIndex: number,
  currentElevationPercent: number,
  summitElevationPercent: number,
) {
  const anchorIndex = currentIndex >= 0 ? currentIndex : 0;
  const remainingDays = pointCount - 1 - anchorIndex;
  const startElevation = Math.max(0, Math.min(100, currentElevationPercent));
  const targetElevation = Math.max(startElevation, summitElevationPercent);

  if (remainingDays <= 0 || index <= anchorIndex) return startElevation;
  if (index >= pointCount - 1) return targetElevation;

  let totalWeight = 0;
  let completedWeight = 0;
  for (let dayIndex = anchorIndex + 1; dayIndex < pointCount; dayIndex += 1) {
    const weight = dailyGainWeight(dayIndex, pointCount);
    totalWeight += weight;
    if (dayIndex <= index) completedWeight += weight;
  }

  const progress = totalWeight > 0 ? completedWeight / totalWeight : 1;
  return startElevation + (targetElevation - startElevation) * progress;
}

function tangentAt(points: PlannedRoutePoint[], index: number) {
  if (index === 0) {
    const first = points[0];
    const next = points[1];
    return (next.y - first.y) / (next.x - first.x);
  }
  if (index === points.length - 1) {
    const previous = points[index - 1];
    const last = points[index];
    return (last.y - previous.y) / (last.x - previous.x);
  }

  const previous = points[index - 1];
  const current = points[index];
  const next = points[index + 1];
  const previousSlope = (current.y - previous.y) / (current.x - previous.x);
  const nextSlope = (next.y - current.y) / (next.x - current.x);

  if (previousSlope === 0 || nextSlope === 0 || Math.sign(previousSlope) !== Math.sign(nextSlope)) {
    return 0;
  }

  return (2 * previousSlope * nextSlope) / (previousSlope + nextSlope);
}

export function curvedPlannedRoutePath(points: PlannedRoutePoint[]) {
  if (points.length < 2) return "";

  let path = `M${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const width = end.x - start.x;
    const startTangent = tangentAt(points, index);
    const endTangent = tangentAt(points, index + 1);
    const controlOneY = start.y + (startTangent * width) / 3;
    const controlTwoY = end.y - (endTangent * width) / 3;

    path += ` C${start.x + width / 3} ${controlOneY} ${end.x - width / 3} ${controlTwoY} ${end.x} ${end.y}`;
  }
  return path;
}
