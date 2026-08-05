<script setup>
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS,
         TimeScale, LinearScale, PointElement, LineElement,
         Filler, Tooltip, Legend } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(TimeScale, LinearScale, PointElement,
                 LineElement, Filler, Tooltip, Legend);

const props = defineProps({
  chartId:    { type: String, default: 'line' },
  title:      { type: String, default: '' },
  accent:     { type: String, default: '#22d3ee' },
  fillHeight: { type: Boolean, default: false },
  compact:    { type: Boolean, default: false },
  timeUnit:   { type: String, default: 'minute' },
  datasets:   { type: Array,  default: () => [] }
});

const ds = computed(() => props.datasets.map(d => ({
  borderColor: props.accent,
  backgroundColor: `${props.accent}40`,
  pointRadius: 0,
  pointHoverRadius: 4,
  borderWidth: 3.5,
  tension: 0.35,
  fill: true,
  ...d,
})));

const options = computed(() => ({
  parsing: false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { type: 'time', time: { unit: props.timeUnit },
         ticks: { color: 'rgba(255,255,255,.85)', font: { size: 13 } }, grid: { color: 'rgba(255,255,255,.14)' } },
    y: { ticks: { color: 'rgba(255,255,255,.85)', font: { size: 13 } }, grid: { color: 'rgba(255,255,255,.14)' } }
  },
}));
</script>

<template>
  <v-card class="chart-card" :class="{ 'chart-card--fill': fillHeight }">
    <div v-if="title" class="chart-card__title">{{ title }}</div>
    <div class="chart-canvas-wrap" :class="{ 'chart-canvas-wrap--fill': fillHeight, 'chart-canvas-wrap--compact': compact }">
      <Line :chart-id="chartId"
            :data="{ datasets: ds }"
            :options="options" />
    </div>
  </v-card>
</template>

<style scoped>
.chart-card {
  padding: 14px 16px 10px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.18);
}
.chart-card__title {
  font-size: .85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: rgba(255,255,255,.75);
  margin-bottom: 6px;
}
.chart-canvas-wrap {
  position: relative;
  height: 260px;
}
.chart-card--fill {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.chart-canvas-wrap--fill {
  flex: 1;
  height: auto;
  min-height: 0;
}
.chart-canvas-wrap--compact {
  height: 150px;
}
@media (max-width: 959.98px) {
  .chart-card--fill {
    height: auto;
  }
  .chart-canvas-wrap--fill {
    flex: none;
    height: 260px;
  }
}
</style>