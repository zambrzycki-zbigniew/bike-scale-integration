<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { format } from "date-fns";

import { usePulsesPerKm } from "@/stores/usePulsesPerKm";
import { useSession } from "@/stores/useSession";
import { hybridSeries } from "@/utils/downsample";

import LineChart from "@/components/LineChart.vue";
import BarChart from "@/components/BarChart.vue";
import LineSkeleton from "@/components/LineSkeleton.vue";
import Duration from "@/components/Duration.vue";
import SessionCounters from "@/components/SessionCounters.vue";
import SessionPicker from "@/components/SessionPicker.vue";

const invertIsLive = ref(false);

/* ---------- reactive data ---------- */
const { ppm } = storeToRefs(usePulsesPerKm());
const { sessions, timeline, currentSession, isLive } = storeToRefs(useSession());

/* ---------- wykresy ---------- */
const distLine = computed(() => {
  if (!timeline.value.length || !currentSession.value) return [];
  return hybridSeries(
    currentSession.value.start,
    timeline.value,
    ppm.value,
    60,
    1,
    120
  ).distPoints;
});

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
  <v-btn @click="invertIsLive = !invertIsLive"></v-btn>
  <v-container fluid>
    <!-- kafelki + picker -->
    <transition name="fade" mode="out-in">
      <v-row :key="!invertIsLive ? isLive : !isLive">
        <v-col :cols="(!invertIsLive ? isLive : !isLive) ? 12 : 6">
          <Duration
            :key="`dur-${currentSession?.id}`"
            :invertIsLive="invertIsLive"
          />
          <SessionCounters
            :key="`cnt-${currentSession?.id}`"
            :invertIsLive="invertIsLive"
          />
        </v-col>
        <v-col v-if="!(!invertIsLive ? isLive : !isLive)" cols="6">
          <SessionPicker />
        </v-col>
      </v-row>
    </transition>

    <!-- wykresy -->
    <v-row>
      <v-col cols="12" md="6">
        <transition name="fade-fast" mode="out-in">
          <LineChart
            v-if="distLine.length"
            :key="`dist-${currentSession?.id}`"
            :datasets="[{ label: 'km', data: distLine }]" />
          <LineSkeleton v-else
        /></transition>
      </v-col>

      <v-col cols="12" md="6">
        <transition name="fade-fast" mode="out-in">
          <LineChart
            v-if="speedLine.length"
            :key="`spd-${currentSession?.id}`"
            chart-id="speed"
            :datasets="[{ label: 'km/h', data: speedLine }]" />
          <LineSkeleton v-else
        /></transition>
      </v-col>
    </v-row>

    <!-- bar-charty -->
    <v-row v-if="daily.length">
      <v-col cols="12" md="4">
        <BarChart
          chart-id="km-day"
          :labels="daily.map((d) => d.day)"
          :datasets="[{ label: 'km', data: daily.map((d) => d.km) }]"
        />
      </v-col>
      <v-col cols="12" md="4">
        <BarChart
          chart-id="dur-day"
          :labels="daily.map((d) => d.day)"
          :datasets="[{ label: 'min', data: daily.map((d) => d.dur) }]"
        />
      </v-col>
      <v-col cols="12" md="4">
        <BarChart
          chart-id="avg-day"
          :labels="daily.map((d) => d.day)"
          :datasets="[{ label: 'km/h', data: daily.map((d) => d.avg) }]"
        />
      </v-col>
    </v-row>
  </v-container>
</template>