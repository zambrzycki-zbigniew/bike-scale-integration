<script setup>
import { Line } from 'vue-chartjs';
import { Chart as ChartJS,
         TimeScale, LinearScale, PointElement, LineElement,
         Tooltip, Legend } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(TimeScale, LinearScale, PointElement,
                 LineElement, Tooltip, Legend);

const props = defineProps({
  chartId:  { type: String, default: 'line' },
  datasets: { type: Array,  default: () => [] }
});

const options = {
  parsing: false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#fff' } } },
  scales: {
    x: { type: 'time', time: { unit: 'minute' },
         ticks: { color: '#fff' }, grid: { color: '#555' } },
    y: { ticks: { color: '#fff' }, grid: { color: '#555' } }
  },
  elements: { line: { borderColor: '#fff' },
              point:{ backgroundColor:'#fff', borderColor:'#fff' } }
};
</script>

<template>
  <Line :chart-id="props.chartId"
        :data="{ datasets: props.datasets }"
        :options="options" style="height:300px" />
</template>