<script setup>
import { ref, onUnmounted, computed } from 'vue';
import { useMetrics }      from '../composables/useMetrics';
import { usePulsesPerKm }  from '../stores/usePulsesPerKm';

const { listenRawMetrics } = useMetrics();
const { ppm } = usePulsesPerKm();      // ← współdzielony ref

const segments = ref([]);

function buildSegments(raw) {
  segments.value = [];
  let current = null;
  raw.forEach(d => {
    const t = d.ts.seconds, p = d.p;
    if (!current) { current = { start: t, end: t, pulses: p }; return; }
    if (t - current.end <= 5) {
      current.end = t; current.pulses += p;
    } else {
      segments.value.push(current);
      current = { start: t, end: t, pulses: p };
    }
  });
  if (current) segments.value.push(current);
}
const stop = listenRawMetrics(buildSegments);
onUnmounted(stop);

/* pomocnicza funkcja do wyświetlania km */
function km(pulses) {
  return ppm.value ? (pulses / ppm.value).toFixed(3) : '—';
}
</script>

<template>
  <h2>Przejechane segmenty</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Start (UTC)</th><th>Koniec</th>
          <th>Pulsy</th><th>km</th></tr>
    </thead>
    <tbody>
      <tr v-for="(s,i) in segments" :key="i">
        <td>{{ i+1 }}</td>
        <td>{{ new Date(s.start*1000).toISOString() }}</td>
        <td>{{ new Date(s.end*1000).toISOString() }}</td>
        <td>{{ s.pulses }}</td>
        <td>{{ km(s.pulses) }}</td>
      </tr>
    </tbody>
  </table>
</template>