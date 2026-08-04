<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { format } from "date-fns";

import { usePulsesPerKm } from "@/stores/usePulsesPerKm";
import { useSession } from "@/stores/useSession";
import { useBodyMetrics } from "@/stores/useBodyMetrics";
import { hybridSeries } from "@/utils/downsample";
import { metForSpeed, nextTier } from "@/utils/met";
import { useEnergyBalance } from "@/composables/useEnergyBalance";
import { useTrainingEconomy } from "@/composables/useTrainingEconomy";

import LineChart from "@/components/LineChart.vue";
import BarChart from "@/components/BarChart.vue";
import LineSkeleton from "@/components/LineSkeleton.vue";
import Duration from "@/components/Duration.vue";
import SessionCounters from "@/components/SessionCounters.vue";
import StatCard from "@/components/StatCard.vue";
import PaceComparisonCard from "@/components/PaceComparisonCard.vue";

const TARGET_SESSION_HOURS = 1;
const GOAL_WEIGHT_KG = Number(import.meta.env.VITE_GOAL_WEIGHT_KG) || null;

const invertIsLive = ref(false);

/* ---------- reactive data ---------- */
const { ppm } = storeToRefs(usePulsesPerKm());
const { sessions, timeline, currentSession, isLive, distNow, speedNow } = storeToRefs(useSession());
const { latest: latestBodyMetric, weightSeries, entries: bodyEntries } = storeToRefs(useBodyMetrics());

const isLiveEffective = computed(() => (!invertIsLive.value ? isLive.value : !isLive.value));

const {
  hasEnoughData: hasTrendData,
  weightTrendPerWeek,
  fatMassTrendPerWeek,
  muscleMassTrendPerWeek,
  estimatedDailyIntake,
  goalEtaDays,
} = useEnergyBalance(bodyEntries, sessions, ppm, 14, GOAL_WEIGHT_KG);

const latestWeightKg = computed(() => latestBodyMetric.value?.weightKg ?? null);
const {
  hasEnoughData: hasEconomyData,
  speedTrendPerWeek,
  targetAvgSpeed,
  targetDistanceKm,
  targetCalories,
} = useTrainingEconomy(sessions, ppm, latestWeightKg, TARGET_SESSION_HOURS);

/* ---------- wykresy ---------- */
const speedLine = computed(() => {
  if (!timeline.value.length || !currentSession.value) return [];
  return hybridSeries(
    currentSession.value.start,
    timeline.value,
    ppm.value,
    60,
    1,
    120
  ).speedPoints;
});

/* ---------- dzienne agregaty ---------- */
const daily = computed(() => {
  const map = {};
  sessions.value.forEach((s) => {
    const day = format(s.start * 1000, "yyyy-MM-dd");
    if (!map[day]) map[day] = { km: 0, durMin: 0 };
    const km = s.distKm ?? (s.imp ? s.imp / ppm.value : 0);
    const mins = s.durationSec
      ? s.durationSec / 60
      : (s.end - s.start + 1) / 60;
    map[day].km += km;
    map[day].durMin += mins;
  });
  return Object.entries(map)
    .sort()
    .map(([d, v]) => ({
      day: d,
      km: v.km,
      dur: v.durMin,
      avg: v.durMin ? v.km / (v.durMin / 60) : 0,
    }));
});

/* ---------- kalorie z jazdy (MET × masa ciała × czas) ---------- */
const rideDurationHr = computed(() => {
  if (timeline.value.length < 2) return 0;
  return (timeline.value.at(-1).t - timeline.value[0].t) / 3600;
});

const avgSpeedSession = computed(() =>
  rideDurationHr.value ? distNow.value / rideDurationHr.value : null
);

const estimatedCalories = computed(() => {
  if (!rideDurationHr.value || avgSpeedSession.value == null || !latestBodyMetric.value?.weightKg) return null;
  return metForSpeed(avgSpeedSession.value) * latestBodyMetric.value.weightKg * rideDurationHr.value;
});

/* ---------- ile prędkości trzeba utrzymać, by spalać więcej (progi MET) ---------- */
const currentBurnRate = computed(() => {
  const w = latestBodyMetric.value?.weightKg;
  return w ? metForSpeed(speedNow.value) * w : null;
});

const pushToText = computed(() => {
  const w = latestBodyMetric.value?.weightKg;
  if (!w) return "—";
  const tier = nextTier(speedNow.value);
  if (!tier) return "Max burn tier reached";
  return `${tier.min.toFixed(1)} km/h → ${(tier.met * w).toFixed(0)} kcal/h`;
});

/* ---------- kolor prędkości względem celu (czerwony → żółty → zielony → turkusowy → niebieski) ---------- */
function speedComparisonColor(actual, target) {
  if (actual == null || !target) return "#c084fc";
  const ratio = actual / target;
  if (ratio < 0.85) return "#f87171";
  if (ratio < 0.97) return "#facc15";
  if (ratio <= 1.03) return "#4ade80";
  if (ratio <= 1.15) return "#2dd4bf";
  return "#60a5fa";
}

const currentSpeedColor = computed(() =>
  speedComparisonColor(speedNow.value, hasEconomyData.value ? targetAvgSpeed.value : null)
);
const avgSpeedColor = computed(() =>
  speedComparisonColor(avgSpeedSession.value, hasEconomyData.value ? targetAvgSpeed.value : null)
);

/* ---------- skład ciała (Withings) ---------- */
const fatMassKg = computed(() => {
  const m = latestBodyMetric.value;
  if (!m?.weightKg || m.fatRatioPct == null) return null;
  return m.weightKg * (m.fatRatioPct / 100);
});

const restingCalories = computed(() => {
  const m = latestBodyMetric.value;
  if (!m?.weightKg || fatMassKg.value == null) return null;
  const leanMassKg = m.weightKg - fatMassKg.value;
  return 370 + 21.6 * leanMassKg; // Katch-McArdle BMR
});

const goalEtaText = computed(() => {
  if (!GOAL_WEIGHT_KG || !hasTrendData.value) return "—";
  if (goalEtaDays.value === 0) return "Goal reached";
  if (goalEtaDays.value == null) return "Not on track";
  return `~${goalEtaDays.value}d (${(goalEtaDays.value / 7).toFixed(1)}w)`;
});
</script>

<template>
  <v-container fluid class="dashboard">
    <header class="dashboard__header">
      <h1 class="dashboard__title"><v-icon color="primary">mdi-bike</v-icon> Bike Dashboard</h1>
      <div class="dashboard__header-right">
        <v-chip v-if="isLive" color="green" size="small" class="live-chip" variant="flat">
          <v-icon start size="10">mdi-circle</v-icon> LIVE
        </v-chip>
        <v-btn icon="mdi-swap-horizontal" size="small" variant="text" density="comfortable"
               @click="invertIsLive = !invertIsLive" title="Toggle preview mode" />
      </div>
    </header>

    <!-- widok treningowy: du\u017ce statystyki na g\u00f3rze + wykres pr\u0119dko\u015bci na dole -->
    <div v-if="isLiveEffective" class="training-view">
      <v-row dense class="training-view__stats">
        <v-col cols="12" class="stat-col">
          <PaceComparisonCard
            :current="speedNow"
            :average="avgSpeedSession"
            :target="hasEconomyData ? targetAvgSpeed : null"
            :current-color="currentSpeedColor"
            :average-color="avgSpeedColor"
          />
        </v-col>

        <Duration :dense="false" cols="3" :show-label="false" :show-session="false" />
        <v-col cols="6" sm="3" class="stat-col">
          <StatCard icon="mdi-counter" :value="`${distNow.toFixed(2)} km`" label="Distance" color="#34d399" />
        </v-col>
        <v-col cols="6" sm="3" class="stat-col">
          <StatCard
            icon="mdi-fire"
            :value="estimatedCalories ? `${estimatedCalories.toFixed(0)} kcal` : '—'"
            label="Calories"
            color="#f97316"
          />
        </v-col>

        <v-col cols="6" class="stat-col">
          <StatCard
            icon="mdi-fire-circle"
            :value="currentBurnRate != null ? `${currentBurnRate.toFixed(0)} kcal/h` : '—'"
            label="Burn Rate"
            color="#fb7185"
          />
        </v-col>
        <v-col cols="6" class="stat-col">
          <StatCard icon="mdi-trending-up" :value="pushToText" label="Push To Next Tier" color="#facc15" />
        </v-col>
      </v-row>

      <div class="training-view__chart">
        <LineChart
          v-if="speedLine.length"
          :key="`spd-${currentSession?.id}`"
          chart-id="speed"
          title="Speed"
          accent="#a78bfa"
          fill-height
          :datasets="[{ label: 'km/h', data: speedLine }]" />
        <LineSkeleton v-else />
      </div>
    </div>

    <!-- widok spoczynkowy: kafelki (wszystkie najnowsze staty) + wykresy -->
    <v-row v-else dense>
      <v-col cols="12" md="6" class="stats-col">
        <v-row dense class="stats-row" :key="`stats-${currentSession?.id}`">
          <Duration />
          <SessionCounters />
          <v-col cols="12" class="stat-col">
            <StatCard
              icon="mdi-fire"
              :value="estimatedCalories ? `${estimatedCalories.toFixed(0)} kcal` : '—'"
              label="Calories (est.)"
              color="#f97316"
              dense
            />
          </v-col>

          <div class="section-label">Next Session ({{ TARGET_SESSION_HOURS }}h)</div>
          <v-col cols="6" class="stat-col">
            <StatCard
              icon="mdi-speedometer-medium"
              :value="hasEconomyData && targetAvgSpeed != null ? `${targetAvgSpeed.toFixed(1)} km/h` : '—'"
              label="Target Avg Speed"
              color="#c084fc"
              :trend="hasEconomyData ? speedTrendPerWeek : null"
              trend-unit="km/h/wk"
              trend-good-direction="up"
              dense
            />
          </v-col>
          <v-col cols="6" class="stat-col">
            <StatCard
              icon="mdi-map-marker-distance"
              :value="hasEconomyData && targetDistanceKm != null ? `${targetDistanceKm.toFixed(1)} km` : '—'"
              label="Target Distance"
              color="#34d399"
              dense
            />
          </v-col>
          <v-col cols="12" class="stat-col">
            <StatCard
              icon="mdi-fire"
              :value="hasEconomyData && targetCalories != null ? `${targetCalories.toFixed(0)} kcal` : '—'"
              label="Target Calories"
              color="#fb7185"
              dense
            />
          </v-col>

          <div class="section-label">Body</div>
          <v-col cols="12" class="stat-col">
            <StatCard
              icon="mdi-scale-bathroom"
              :value="latestBodyMetric ? `${latestBodyMetric.weightKg.toFixed(1)} kg` : '—'"
              label="Weight"
              color="#fbbf24"
              :trend="hasTrendData ? weightTrendPerWeek : null"
              trend-unit="kg/wk"
              trend-good-direction="down"
              dense
            />
          </v-col>
          <v-col cols="6" class="stat-col">
            <StatCard
              icon="mdi-water-percent"
              :value="fatMassKg != null ? `${fatMassKg.toFixed(1)} kg` : '—'"
              label="Fat Mass"
              color="#f87171"
              :trend="hasTrendData ? fatMassTrendPerWeek : null"
              trend-unit="kg/wk"
              trend-good-direction="down"
              dense
            />
          </v-col>
          <v-col cols="6" class="stat-col">
            <StatCard
              icon="mdi-arm-flex"
              :value="latestBodyMetric?.muscleMassKg ? `${latestBodyMetric.muscleMassKg.toFixed(1)} kg` : '—'"
              label="Muscle Mass"
              color="#38bdf8"
              :trend="hasTrendData ? muscleMassTrendPerWeek : null"
              trend-unit="kg/wk"
              trend-good-direction="up"
              dense
            />
          </v-col>
          <v-col cols="12" class="stat-col">
            <StatCard
              icon="mdi-fire-circle"
              :value="restingCalories != null ? `${restingCalories.toFixed(0)} kcal/day` : '—'"
              label="Resting Burn (BMR)"
              color="#fb923c"
              dense
            />
          </v-col>
          <v-col cols="12" class="stat-col">
            <StatCard
              icon="mdi-food-apple"
              :value="hasTrendData && estimatedDailyIntake != null ? `${Math.round(estimatedDailyIntake)} kcal/day` : '—'"
              label="Est. Daily Intake"
              color="#22c55e"
              dense
            />
          </v-col>
          <v-col v-if="GOAL_WEIGHT_KG" cols="12" class="stat-col">
            <StatCard
              icon="mdi-flag-checkered"
              :value="goalEtaText"
              :label="`Goal: ${GOAL_WEIGHT_KG} kg`"
              color="#38bdf8"
              dense
            />
          </v-col>
        </v-row>
      </v-col>

      <v-col cols="12" md="6" class="charts-col">
        <div class="charts-col__inner charts-col__inner--idle">
          <LineChart
            v-if="weightSeries.length"
            chart-id="weight-trend"
            title="Weight trend"
            accent="#fbbf24"
            time-unit="day"
            :datasets="[{ label: 'kg', data: weightSeries }]"
          />

          <template v-if="daily.length">
            <BarChart
              chart-id="km-day"
              title="km / day"
              accent="#34d399"
              :labels="daily.map((d) => d.day)"
              :datasets="[{ label: 'km', data: daily.map((d) => d.km) }]"
            />
            <BarChart
              chart-id="dur-day"
              title="Minutes / day"
              accent="#60a5fa"
              :labels="daily.map((d) => d.day)"
              :datasets="[{ label: 'min', data: daily.map((d) => d.dur) }]"
            />
            <BarChart
              chart-id="avg-day"
              title="Avg km/h / day"
              accent="#a78bfa"
              :labels="daily.map((d) => d.day)"
              :datasets="[{ label: 'km/h', data: daily.map((d) => d.avg) }]"
            />
          </template>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.stats-row {
  width: 100%;
}
.stats-row :deep(.section-label) {
  flex: 0 0 100%;
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: rgba(255, 255, 255, 0.4);
  margin: 14px 4px 2px;
}
.stats-row :deep(.section-label:first-child) {
  margin-top: 0;
}

.charts-col {
  display: flex;
}
.charts-col__inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.charts-col__inner--idle {
  /* compensates for the "This Ride" section-label sitting above the first card on the left */
  margin-top: 19px;
}

.training-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 16px;
  min-height: 0;
}
.training-view__chart {
  flex: 1;
  min-height: 280px;
  display: flex;
}
.training-view__chart :deep(.chart-card) {
  flex: 1;
}
</style>