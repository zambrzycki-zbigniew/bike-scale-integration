<script setup>
import { storeToRefs } from "pinia";
import { useSession } from "@/stores/useSession";
import StatCard from "@/components/StatCard.vue";

const { speedNow, distNow } = storeToRefs(useSession());
</script>

<template>
  <v-col cols="6" class="stat-col">
    <StatCard icon="mdi-counter" :value="`${distNow.toFixed(2)} km`" label="Distance" color="#34d399" dense />
  </v-col>
  <v-col cols="6" class="stat-col">
    <StatCard icon="mdi-speedometer" :value="`${speedNow.toFixed(1)} km/h`" label="Speed" color="#a78bfa" dense />
  </v-col>
</template>