import { defineStore } from 'pinia';
import { ref } from 'vue';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

/*  Pinia store – jeden reaktywny stan pulsesPerKm dla całej aplikacji  */
export const usePulsesPerKm = defineStore('pulsesPerKm', () => {
  const ppm = ref(0);
  const cfgRef = doc(db, 'parameters', 'bike-metrics');

  /*  realtime – gdy ktoś zmieni wartość w bazie,
      ppm.value aktualizuje się w całej aplikacji  */
  onSnapshot(cfgRef, snap => {
    ppm.value = snap.data()?.pulsesPerKm ?? 0;
  });

  /* zapis nowej wartości (update) */
  async function save(newValue) {
    await updateDoc(cfgRef, { pulsesPerKm: newValue });
  }

  return { ppm, save };
});