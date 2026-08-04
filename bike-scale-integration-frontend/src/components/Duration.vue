<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { intervalToDuration, format } from 'date-fns';
import { useSession } from '@/stores/useSession';
import StatCard from '@/components/StatCard.vue';

const { timeline } = storeToRefs(useSession());

/*  start / end epoki  */
const start = computed(() => timeline.value[0]?.t ?? null);
const end   = computed(() => timeline.value.at(-1)?.t ?? null);

/*  długość w sekundach  */
const durSec = computed(() =>
  start.value !== null ? end.value - start.value : 0
);

/*  HH MM SS  */
const duration = computed(() => {
  if (!durSec.value) return { h:0, m:0, s:0 };
  const d = intervalToDuration({ start:0, end: durSec.value * 1000 });
  return { h: d.hours||0, m: d.minutes||0, s: d.seconds||0 };
});
const durationText = computed(() => {
  const { h, m, s } = duration.value;
  return `${h ? h + 'h ' : ''}${m ? m + 'm ' : ''}${s}s`;
});

/*  „HH:mm:ss – HH:mm:ss”  */
const timespan = computed(() =>
  start.value !== null
    ? `${format(start.value*1000,'HH:mm:ss')} – ${format(end.value*1000,'HH:mm:ss')}`
    : '—'
);
</script>

<template>
  <v-col cols="12" class="stat-col">
    <StatCard icon="mdi-timer-outline" :value="durationText" label="Duration" color="#22d3ee" />
  </v-col>
  <v-col cols="12" class="stat-col">
    <StatCard icon="mdi-clock-outline" :value="timespan" label="Session" color="#60a5fa" />
  </v-col>
</template>