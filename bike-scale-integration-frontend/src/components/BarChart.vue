<script setup>
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
  labels:    { type: Array,  default: () => [] },
  datasets:  { type: Array,  default: () => [] }   // ← [{label,data}]
});

/* dodaj białe kolory, jeśli caller ich nie podał */
const ds = props.datasets.map(d => ({
  backgroundColor: '#fff',
  borderColor:     '#fff',
  ...d
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#fff' } } },
  scales: {
    x: { ticks:{ color:'#fff' }, grid:{ color:'#555' } },
    y: { ticks:{ color:'#fff' }, grid:{ color:'#555' } }
  }
};
</script>

<template>
  <Bar :chart-id="props.chartId"
       :data="{ labels: props.labels, datasets: ds }"
       :options="options" style="height:300px" />
</template>