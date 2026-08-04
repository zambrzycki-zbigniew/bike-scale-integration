<script setup>
import { computed } from "vue";
import { useSession } from "@/stores/useSession";
const { speedNow, distNow, isLive } = useSession();
const props = defineProps({
  invertIsLive: { type: Boolean, default: false },
});
const small = computed(
  () => !(!props.invertIsLive ? isLive.value : !isLive.value)
);
</script>

<template>
  <v-row :class="small ? 'my-0' : 'my-2'" justify="center">
    <v-col :cols="small ? 12 : 6">
      <v-card :elevation="2" :color="small ? 'teal-darken-3' : 'teal'">
        <v-card-text :class="small ? `text-center d-flex justify-center align-center` : `text-center`">
          <v-icon :size="small ? 43 : 70">mdi-counter</v-icon><br v-if="!small"/>
          <span :class="small ? 'text-h5' : 'text-h2'"
            >{{ distNow.toFixed(2) }} km</span
          >
        </v-card-text>
      </v-card>
    </v-col>
    <v-col :cols="small ? 12 : 6">
      <v-card :elevation="2" :color="small ? 'indigo-darken-3' : 'indigo'">
        <v-card-text :class="small ? `text-center d-flex justify-center align-center` : `text-center`">
          <v-icon :size="small ? 43 : 70">mdi-speedometer</v-icon><br v-if="!small"/>
          <span :class="small ? 'text-h5' : 'text-h2'"
            >{{ speedNow.toFixed(1) }} km/h</span
          >
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>