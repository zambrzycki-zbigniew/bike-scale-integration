<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { format } from "date-fns";

import { usePulsesPerKm } from "@/stores/usePulsesPerKm";
import { useSession } from "@/stores/useSession";
import { useBodyMetrics } from "@/stores/useBodyMetrics";
import { hybridSeries } from "@/utils/downsample";

import LineChart from "@/components/LineChart.vue";
import BarChart from "@/components/BarChart.vue";
import LineSkeleton from "@/components/LineSkeleton.vue";
import Duration from "@/components/Duration.vue";
import SessionCounters from "@/components/SessionCounters.vue";
import StatCard from "@/components/StatCard.vue";

const invertIsLive = ref(false);

/* ---------- reactive data ---------- */
const { ppm } = storeToRefs(usePulsesPerKm());
const { sessions, timeline, currentSession, isLive } = storeToRefs(useSession());
const { latest: latestBodyMetric, weightSeries } = storeToRefs(useBodyMetrics());

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
    <v-row dense>
      <v-col cols="12" md="6" class="stats-col">
        <v-row dense class="stats-row" :key="`stats-${currentSession?.id}`">
          <Duration />
          <SessionCounters />

          <div class="section-label">Body</div>
          <v-col cols="12" class="stat-col">
            <StatCard
              icon="mdi-scale-bathroom"
              :value="latestBodyMetric ? `${latestBodyMetric.weightKg.toFixed(1)} kg` : '—'"
              label="Weight"
              color="#fbbf24"
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
.stats-col {
  display: flex;
}
.stats-row {
  width: 100%;
}
.stats-row :deep(.stat-col) {
  display: flex;
}
.stats-row :deep(.stat-col) > * {
  width: 100%;
}
.stats-row :deep(.section-label) {
  flex: 0 0 100%;
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: rgba(255, 255, 255, 0.4);
  margin: 10px 4px 0;
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