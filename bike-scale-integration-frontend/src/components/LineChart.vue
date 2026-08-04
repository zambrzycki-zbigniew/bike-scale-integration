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
  chartId:  { type: String, default: 'line' },
  title:    { type: String, default: '' },
  accent:   { type: String, default: '#22d3ee' },
  datasets: { type: Array,  default: () => [] }
});

const ds = computed(() => props.datasets.map(d => ({
  borderColor: props.accent,
  backgroundColor: `${props.accent}33`,
  pointRadius: 0,
  pointHoverRadius: 4,
  borderWidth: 3,
  tension: 0.35,
  fill: true,
  ...d,
})));

const options = {
  parsing: false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { type: 'time', time: { unit: 'minute' },
         ticks: { color: 'rgba(255,255,255,.75)' }, grid: { color: 'rgba(255,255,255,.1)' } },
    y: { ticks: { color: 'rgba(255,255,255,.75)' }, grid: { color: 'rgba(255,255,255,.1)' } }
  },
};
</script>

<template>
  <v-card class="chart-card">
    <div v-if="title" class="chart-card__title">{{ title }}</div>
    <div class="chart-canvas-wrap">
      <Line :chart-id="chartId"
            :data="{ datasets: ds }"
            :options="options" />
    </div>
  </v-card>
</template>

<style scoped>
.chart-card {
  padding: 14px 16px 10px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.1);
}
.chart-card__title {
  font-size: .8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: rgba(255,255,255,.65);
  margin-bottom: 6px;
}
.chart-canvas-wrap {
  position: relative;
  height: 240px;
}
</style>