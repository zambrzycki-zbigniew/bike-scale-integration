<script setup>
import { computed } from "vue";
import { format, intervalToDuration } from "date-fns";
import { useSession } from "@/stores/useSession";
import { usePulsesPerKm } from "@/stores/usePulsesPerKm";

const { sessions, selectSession, isLive, currentSession } = useSession();
const { ppm } = usePulsesPerKm();

/* kolumny tabeli */
const headers = [
  { title: "Start", value: "startTxt", width: 140 },
  { title: "End", value: "endTxt", width: 140 },
  { title: "Duration", value: "durTxt", width: 100 },
  { title: "Distance (km)", value: "km", width: 80, align: "end" },
  { title: "Average km/h", value: "avgTxt", width: 100, align: "end" },
];

/* helper – HHh MMm SSs */
function formatHMS(sec) {
  const d = intervalToDuration({ start: 0, end: sec * 1000 });
  const h = d.hours || 0;
  const m = d.minutes || 0;
  const s = d.seconds || 0;
  return `${h ? h + "h " : ""}${m ? m + "m " : ""}${s}s`;
}

/* wiersze, posortowane od najnowszej sesji */
const rows = computed(() => {
  return [...sessions.value] // kopiuj tablicę
    .sort((a, b) => b.start - a.start) // sort DESC
    .map((s) => ({
      id: s.id,
      startTxt: format(s.start * 1000, "dd.MM HH:mm"),
      endTxt: format(s.end * 1000, "dd.MM HH:mm"),
      durTxt: formatHMS(s.durationSec),
      km: (s.distKm ?? (s.imp ? s.imp / (ppm.value || 464) : 0)).toFixed(2),
      avgTxt: (s.avgKmh ?? 0).toFixed(2),
    }));
});

function onRowClick(_, row) {
  selectSession(row.item.id);
}
</script>

<template>
  <v-card v-if="!isLive" color="grey-darken-3" elevation="2">
    <v-data-table
      :headers="headers"
      :items="rows"
      :sort-by="['startTxt']"
      sort-desc
      :items-per-page="7"
      density="compact"
      class="elevation-0"
      @click:row="onRowClick"
      :model-value="[currentSession?.id]"
      item-value="id"
      show-select
    />
  </v-card>
</template>