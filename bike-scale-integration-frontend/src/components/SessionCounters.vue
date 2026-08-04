<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useSession } from "@/stores/useSession";
import StatCard from "@/components/StatCard.vue";

const { speedNow, distNow, isLive } = storeToRefs(useSession());
const props = defineProps({
  invertIsLive: { type: Boolean, default: false },
});
const compact = computed(
  () => !(!props.invertIsLive ? isLive.value : !isLive.value)
);
</script>

<template>
  <v-col cols="12">
    <StatCard icon="mdi-counter" :value="`${distNow.toFixed(2)} km`" label="Distance" color="#34d399" :compact="compact" />
  </v-col>
  <v-col cols="12">
    <StatCard icon="mdi-speedometer" :value="`${speedNow.toFixed(1)} km/h`" label="Speed" color="#a78bfa" :compact="compact" />
  </v-col>
</template>