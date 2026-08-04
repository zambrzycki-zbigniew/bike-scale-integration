<script setup>
import { computed, defineProps } from 'vue';
import { intervalToDuration, format } from 'date-fns';
import { useSession } from '@/stores/useSession';


const { timeline, isLive } = useSession();

/*  małe kafelki, gdy nie jedziesz  */
const props = defineProps({
  invertIsLive:  { type: Boolean, default: false }
});
const small = computed(() => !(!props.invertIsLive ? isLive.value : !isLive.value));

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

/*  „HH:mm:ss – HH:mm:ss”  */
const timespan = computed(() =>
  start.value !== null
    ? `${format(start.value*1000,'HH:mm:ss')} – ${format(end.value*1000,'HH:mm:ss')}`
    : '—'
);
</script>

<template>
  <v-row :class="small ? 'my-0':'my-2'" justify="center">
    <v-col :cols="small ? 12 : 6">
      <v-card elevation="2" :color="small ? 'light-blue-darken-3' : 'light-blue'">
        <v-card-text :class="small ? `text-center d-flex justify-center align-center` : `text-center`">
          <v-icon :size="small ? 43 : 70">mdi-timer</v-icon><br v-if="!small">
          <span :class="small ? 'text-h5' : 'text-h2'">
            {{ duration.h ? `${duration.h}h ` : '' }}
            {{ duration.m ? `${duration.m}m ` : '' }}
            {{ duration.s }}s
          </span>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col :cols="small ? 12 : 6">
      <v-card elevation="2" :color="small ? 'cyan-darken-4' : 'cyan-darken-1'">
        <v-card-text :class="small ? `text-center d-flex justify-center align-center` : `text-center`">
          <v-icon :size="small ? 43 : 70">mdi-clock</v-icon><br v-if="!small">
          <span :class="small ? 'text-h5' : 'text-h2'">{{ timespan }}</span>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>