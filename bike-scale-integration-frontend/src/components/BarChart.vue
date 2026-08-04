<script setup>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  TimeScale, Tooltip, Legend
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement,
                 TimeScale, Tooltip, Legend);

const props = defineProps({
  chartId:   { type: String, default: 'bar' },
  title:     { type: String, default: '' },
  accent:    { type: String, default: '#22d3ee' },
  labels:    { type: Array,  default: () => [] },
  datasets:  { type: Array,  default: () => [] }   // ← [{label,data}]
});

/* dodaj akcentowy kolor, jeśli caller go nie podał */
const ds = computed(() => props.datasets.map(d => ({
  backgroundColor: props.accent,
  borderRadius: 4,
  borderSkipped: false,
  ...d,
})));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks:{ color:'rgba(255,255,255,.75)' }, grid:{ display:false } },
    y: { ticks:{ color:'rgba(255,255,255,.75)' }, grid:{ color:'rgba(255,255,255,.1)' } }
  }
};
</script>

<template>
  <v-card class="chart-card">
    <div v-if="title" class="chart-card__title">{{ title }}</div>
    <div class="chart-canvas-wrap">
      <Bar :chart-id="chartId"
           :data="{ labels: labels, datasets: ds }"
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
  height: 180px;
}
</style>