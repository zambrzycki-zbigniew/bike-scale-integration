import { ref, inject } from 'vue';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

/* wspólny, reaktywny “singleton” */
const ppm = ref(0);          // pulsesPerKm
let wired = false;           // podpinamy listener tylko raz

export function usePulsesPerKm() {
  const db = inject('db');   // dostarczony w main.js provide()

  if (!wired && db) {
    const cfgRef = doc(db, 'parameters', 'bike-metrics');

    /*  realtime – gdy ktoś zmieni wartość w bazie,
        ppm.value aktualizuje się w całej aplikacji  */
    onSnapshot(cfgRef, snap => {
      ppm.value = snap.data()?.pulsesPerKm ?? 0;
    });
    wired = true;
  }

  /* zapis nowej wartości (update) */
  async function save(newValue) {
    const cfgRef = doc(db, 'parameters', 'bike-metrics');
    await updateDoc(cfgRef, { pulsesPerKm: newValue });
  }

  return { ppm, save };
}