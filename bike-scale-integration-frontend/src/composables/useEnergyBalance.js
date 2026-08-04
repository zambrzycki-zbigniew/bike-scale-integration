import { computed } from 'vue';

const FAT_KCAL_PER_KG = 7700; // energy density of adipose tissue
const MIN_POINTS = 3;
const MIN_SPAN_DAYS = 5;

// approximate MET for cycling by average speed (compendium of physical activities)
function metForSpeed(kmh) {
  if (kmh < 16) return 4.0;
  if (kmh < 19) return 6.8;
  if (kmh < 22.4) return 8.0;
  if (kmh < 25.6) return 10.0;
  return 12.0;
}

// least-squares slope of y vs. time, expressed as "units of y per day"
function slopePerDay(points) {
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
  return den === 0 ? null : num / den;
}

/**
 *  useEnergyBalance
 *  Calibrates a rough "implied daily calorie intake" from the energy-balance
 *  equation:  Δfat-mass energy = calories-in − (BMR + exercise).
 *  Solving for calories-in lets weight/body-composition trend + tracked rides
 *  reveal what you must roughly be eating, without ever logging food.
 */
export function useEnergyBalance(bodyEntries, sessions, ppm, windowDays = 14) {
  const cutoff = computed(() => Math.floor(Date.now() / 1000) - windowDays * 86400);

  const windowEntries = computed(() =>
    bodyEntries.value
      .filter((e) => e.date >= cutoff.value && e.weightKg != null)
      .sort((a, b) => a.date - b.date)
  );

  const spanDays = computed(() => {
    if (windowEntries.value.length < 2) return 0;
    return (windowEntries.value.at(-1).date - windowEntries.value[0].date) / 86400;
  });

  const hasEnoughData = computed(
    () => windowEntries.value.length >= MIN_POINTS && spanDays.value >= MIN_SPAN_DAYS
  );

  const weightTrendPerWeek = computed(() => {
    const slope = slopePerDay(windowEntries.value.map((e) => ({ t: e.date, y: e.weightKg })));
    return slope == null ? null : slope * 7;
  });

  const fatMassTrendPerWeek = computed(() => {
    const points = windowEntries.value
      .filter((e) => e.fatRatioPct != null)
      .map((e) => ({ t: e.date, y: e.weightKg * (e.fatRatioPct / 100) }));
    const slope = slopePerDay(points);
    return slope == null ? null : slope * 7;
  });

  const avgBmr = computed(() => {
    const bmrs = windowEntries.value
      .filter((e) => e.fatRatioPct != null)
      .map((e) => {
        const fatMass = e.weightKg * (e.fatRatioPct / 100);
        return 370 + 21.6 * (e.weightKg - fatMass); // Katch-McArdle
      });
    return bmrs.length ? bmrs.reduce((a, b) => a + b, 0) / bmrs.length : null;
  });

  function closestEntry(ts) {
    let best = null;
    let bestDiff = Infinity;
    for (const e of bodyEntries.value) {
      if (e.weightKg == null) continue;
      const diff = Math.abs(e.date - ts);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = e;
      }
    }
    return best;
  }

  const exerciseCaloriesInWindow = computed(() => {
    let total = 0;
    for (const s of sessions.value) {
      if (s.start < cutoff.value) continue;
      const durHr = (s.durationSec ?? s.end - s.start + 1) / 3600;
      if (!durHr) continue;
      const km = s.distKm ?? (s.imp ? s.imp / ppm.value : 0);
      const entry = closestEntry(s.start);
      if (!entry) continue;
      total += metForSpeed(km / durHr) * entry.weightKg * durHr;
    }
    return total;
  });

  const estimatedDailyIntake = computed(() => {
    if (!hasEnoughData.value || avgBmr.value == null || fatMassTrendPerWeek.value == null) {
      return null;
    }
    const storedPerDay = (fatMassTrendPerWeek.value / 7) * FAT_KCAL_PER_KG;
    const exercisePerDay = exerciseCaloriesInWindow.value / Math.max(spanDays.value, 1);
    return avgBmr.value + exercisePerDay + storedPerDay;
  });

  return {
    hasEnoughData,
    spanDays,
    weightTrendPerWeek,
    fatMassTrendPerWeek,
    exerciseCaloriesInWindow,
    avgBmr,
    estimatedDailyIntake,
  };
}
