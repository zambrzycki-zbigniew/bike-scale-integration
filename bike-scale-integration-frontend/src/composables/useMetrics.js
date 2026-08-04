import { inject, ref, watch } from 'vue';
import {
  collection, doc, onSnapshot, query, orderBy,
} from 'firebase/firestore';

/**
 *  useMetrics(sessionIdRef)
 *  • nasłuchuje /bike-sessions/{id}/pulses
 *  • przy każdej zmianie id czyści poprzednie dane (wysyła '__RESET__')
 *  • zwraca funkcję listen(onPulses) – callback dostaje {ts,p} lub '__RESET__'
 */
export function useMetrics(sessionIdRef) {
  const db     = inject('db');
  const stop   = ref(() => {});

  function attach(id, onPulses) {
    onPulses('__RESET__');               // zresetuj stare dane
    const q = query(
      collection(doc(db, 'bike-sessions', id), 'pulses'),
      orderBy('ts')
    );
    stop.value();                        // odłącz poprzedniego onSnapshot
    stop.value = onSnapshot(q, snap => {
      snap.docs.forEach(d => onPulses(d.data()));
    });
  }

  return function listen(onPulses) {
    watch(sessionIdRef, id => { if (id) attach(id, onPulses); }, { immediate:true });
    return () => stop.value();
  };
}