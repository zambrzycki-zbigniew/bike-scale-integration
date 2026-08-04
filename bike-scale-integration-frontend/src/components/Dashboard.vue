<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { format } from "date-fns";

import { usePulsesPerKm } from "@/stores/usePulsesPerKm";
import { useSession } from "@/stores/useSession";
import { useBodyMetrics } from "@/stores/useBodyMetrics";
import { hybridSeries } from "@/utils/downsample";
import { useEnergyBalance } from "@/composables/useEnergyBalance";

import LineChart from "@/components/LineChart.vue";
import BarChart from "@/components/BarChart.vue";
import LineSkeleton from "@/components/LineSkeleton.vue";
import Duration from "@/components/Duration.vue";
import SessionCounters from "@/components/SessionCounters.vue";
import StatCard from "@/components/StatCard.vue";

const invertIsLive = ref(false);

/* ---------- reactive data ---------- */
const { ppm } = storeToRefs(usePulsesPerKm());
const { sessions, timeline, currentSession, isLive, distNow } = storeToRefs(useSession());
const { latest: latestBodyMetric, weightSeries, entries: bodyEntries } = storeToRefs(useBodyMetrics());

const {
  hasEnoughData: hasTrendData,
  weightTrendPerWeek,
  fatMassTrendPerWeek,
  estimatedDailyIntake,
} = useEnergyBalance(bodyEntries, sessions, ppm, 14);

function trendIcon(v) {
  if (v == null) return "mdi-trending-neutral";
  return v < 0 ? "mdi-trending-down" : "mdi-trending-up";
}
function trendValue(v, unit) {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)} ${unit}`;
}

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

// przybliżone MET dla jazdy na rowerze wg średniej prędkości (compendium of physical activities)
function metForSpeed(kmh) {
  if (kmh < 16) return 4.0;
  if (kmh < 19) return 6.8;
  if (kmh < 22.4) return 8.0;
  if (kmh < 25.6) return 10.0;
  return 12.0;
}

const estimatedCalories = computed(() => {
  if (!rideDurationHr.value || !latestBodyMetric.value?.weightKg) return null;
  const avgSpeed = distNow.value / rideDurationHr.value;
  return metForSpeed(avgSpeed) * latestBodyMetric.value.weightKg * rideDurationHr.value;
});

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

    <!-- kafelki (wszystkie najnowsze staty) + wykresy -->
    <v-row dense align="start">
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

          <div class="section-label">Body</div>
          <v-col cols="12" class="stat-col">
            <StatCard
              icon="mdi-scale-bathroom"
              :value="latestBodyMetric ? `${latestBodyMetric.weightKg.toFixed(1)} kg` : '—'"
              label="Weight"
              color="#fbbf24"
            />
          </v-col>
          <v-col cols="6" class="stat-col">
            <StatCard
              icon="mdi-water-percent"
              :value="fatMassKg != null ? `${fatMassKg.toFixed(1)} kg` : '—'"
              label="Fat Mass"
              color="#f87171"
              dense
            />
          </v-col>
          <v-col cols="6" class="stat-col">
            <StatCard
              icon="mdi-arm-flex"
              :value="latestBodyMetric?.muscleMassKg ? `${latestBodyMetric.muscleMassKg.toFixed(1)} kg` : '—'"
              label="Muscle Mass"
              color="#38bdf8"
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

          <div class="section-label">Trends (14d)</div>
          <v-col cols="6" class="stat-col">
            <StatCard
              :icon="trendIcon(weightTrendPerWeek)"
              :value="hasTrendData ? trendValue(weightTrendPerWeek, 'kg/wk') : '—'"
              label="Weight Trend"
              color="#60a5fa"
              dense
            />
          </v-col>
          <v-col cols="6" class="stat-col">
            <StatCard
              :icon="trendIcon(fatMassTrendPerWeek)"
              :value="hasTrendData ? trendValue(fatMassTrendPerWeek, 'kg/wk') : '—'"
              label="Fat Trend"
              color="#f87171"
              dense
            />
          </v-col>
          <v-col cols="12" class="stat-col">
            <StatCard
              icon="mdi-food-apple"
              :value="hasTrendData && estimatedDailyIntake != null ? `${Math.round(estimatedDailyIntake)} kcal/day` : '—'"
              label="Est. Daily Intake"
              color="#22c55e"
            />
          </v-col>
        </v-row>
      </v-col>

      <v-col cols="12" md="6" class="charts-col">
        <div class="charts-col__inner">
          <transition name="fade-fast" mode="out-in">
            <LineChart
              v-if="speedLine.length"
              :key="`spd-${currentSession?.id}`"
              chart-id="speed"
              title="Speed"
              accent="#a78bfa"
              :datasets="[{ label: 'km/h', data: speedLine }]" />
            <LineSkeleton v-else
          /></transition>

          <LineChart
            v-if="weightSeries.length"
            chart-id="weight-trend"
            title="Weight trend"
            accent="#fbbf24"
            time-unit="day"
            :datasets="[{ label: 'kg', data: weightSeries }]"
          />

          <v-row v-if="daily.length" dense>
            <v-col cols="12" md="4">
              <BarChart
                chart-id="km-day"
                title="km / day"
                accent="#34d399"
                :labels="daily.map((d) => d.day)"
                :datasets="[{ label: 'km', data: daily.map((d) => d.km) }]"
              />
            </v-col>
            <v-col cols="12" md="4">
              <BarChart
                chart-id="dur-day"
                title="Minutes / day"
                accent="#60a5fa"
                :labels="daily.map((d) => d.day)"
                :datasets="[{ label: 'min', data: daily.map((d) => d.dur) }]"
              />
            </v-col>
            <v-col cols="12" md="4">
              <BarChart
                chart-id="avg-day"
                title="Avg km/h / day"
                accent="#a78bfa"
                :labels="daily.map((d) => d.day)"
                :datasets="[{ label: 'km/h', data: daily.map((d) => d.avg) }]"
              />
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
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
</style>