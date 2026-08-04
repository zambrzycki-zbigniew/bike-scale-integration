import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

/*  Pinia store – Withings body-composition history, synced by get-body-metrics  */
export const useBodyMetrics = defineStore('bodyMetrics', () => {
  const entries = ref([]); // [{ date, weightKg, fatRatioPct, muscleMassKg, hydrationPct, boneMassKg }]

  onSnapshot(
    query(collection(db, 'body-metrics'), orderBy('date')),
    snap => {
      entries.value = snap.docs.map(d => d.data());
    }
  );

  const latest = computed(() => entries.value.at(-1) ?? null);

  const weightSeries = computed(() =>
    entries.value
      .filter(e => e.weightKg != null)
      .map(e => ({ x: e.date * 1000, y: e.weightKg }))
  );

  return { entries, latest, weightSeries };
});
