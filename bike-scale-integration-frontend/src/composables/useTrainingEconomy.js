import { computed } from 'vue';
import { metForSpeed } from '@/utils/met';

const MIN_SESSIONS = 3;
const MIN_SPAN_DAYS = 3;

// least-squares fit of y vs. time; predict(ts) extrapolates to any timestamp (epoch seconds)
function linearFit(points) {
  if (points.length < 2) return null;
  const t0 = points[0].t;
  const xs = points.map((p) => (p.t - t0) / 86400);
  const ys = points.map((p) => p.y);
  const n = xs.length;
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = yMean - slope * xMean;
  return { slope, predict: (ts) => intercept + slope * ((ts - t0) / 86400) };
}

/**
 *  useTrainingEconomy
 *  Fits a trend line through each session's average speed over time and
 *  extrapolates it to "now" to suggest a pacing target for the next ride.
 */
export function useTrainingEconomy(sessions, ppm, latestWeightKg, targetHours = 1) {
  const speedPoints = computed(() =>
    sessions.value
      .map((s) => {
        const durHr = (s.durationSec ?? s.end - s.start + 1) / 3600;
        if (!durHr) return null;
        const km = s.distKm ?? (s.imp ? s.imp / ppm.value : 0);
        return { t: s.start, y: km / durHr };
      })
      .filter(Boolean)
  );

  const spanDays = computed(() => {
    if (speedPoints.value.length < 2) return 0;
    return (speedPoints.value.at(-1).t - speedPoints.value[0].t) / 86400;
  });

  const hasEnoughData = computed(
    () => speedPoints.value.length >= MIN_SESSIONS && spanDays.value >= MIN_SPAN_DAYS
  );

  const fit = computed(() => linearFit(speedPoints.value));

  const speedTrendPerWeek = computed(() => (fit.value ? fit.value.slope * 7 : null));

  const targetAvgSpeed = computed(() => {
    if (!hasEnoughData.value || !fit.value) return null;
    return Math.max(fit.value.predict(Date.now() / 1000), 0);
  });

  const targetDistanceKm = computed(() =>
    targetAvgSpeed.value != null ? targetAvgSpeed.value * targetHours : null
  );

  const targetCalories = computed(() => {
    if (targetAvgSpeed.value == null || !latestWeightKg.value) return null;
    return metForSpeed(targetAvgSpeed.value) * latestWeightKg.value * targetHours;
  });

  return {
    hasEnoughData,
    speedTrendPerWeek,
    targetAvgSpeed,
    targetDistanceKm,
    targetCalories,
  };
}
