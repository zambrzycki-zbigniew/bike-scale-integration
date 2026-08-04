import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  collection, query, orderBy, where, onSnapshot, doc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '@/firebase';
import { useMetrics } from '@/composables/useMetrics';
import { usePulsesPerKm } from '@/stores/usePulsesPerKm';

const FALLBACK_PPM = 464;   // used only if Firestore config hasn't loaded yet
const MIN_SAMPLES  = 10;

export const useSession = defineStore('session', () => {
  /* ────────── konfiguracja tylko raz (Pinia gwarantuje singleton) ────────── */
  const { ppm } = usePulsesPerKm();

  const sessions    = ref([]);      // zamknięte + ewent. current
  const timeline    = ref([]);      // [{ t, p }]
  const currentLive = ref(null);    // 'current' lub null
  const selectedId  = ref(null);    // id z picker-a

  /* 1) zamknięte sesje */
  onSnapshot(
    query(
      collection(db, 'bike-sessions'),
      where('__name__', '!=', 'current'),
      orderBy('start')
    ),
    snap => {
      sessions.value = snap.docs
        .map(d => ({
          id: d.id,
          ...d.data(),
          start: d.data().start.seconds,
          end:   d.data().end.seconds,
        }))
        .filter(s => (s.samples ?? 0) >= MIN_SAMPLES);
    }
  );

  /* 2) istnienie "current" */
  onSnapshot(doc(db, 'bike-sessions', 'current'), d => {
    currentLive.value = d.exists() ? 'current' : null;
  });

  /* 3) ID strumienia */
  const streamId = computed(() =>
    currentLive.value ??
    selectedId.value ??
    sessions.value.at(-1)?.id ?? null
  );

  /* 4) impulsy */
  const lastEpoch = ref(null);
  const listenRaw = useMetrics(streamId);
  listenRaw(data => {
    if (data === '__RESET__') { timeline.value = []; lastEpoch.value = null; return; }
    const { ts, p } = data;
    if (lastEpoch.value !== null && ts <= lastEpoch.value) return;

    const dayKey = format(ts * 1000, 'yyyy-MM-dd');
    if (timeline.value[0] && format(timeline.value[0].t * 1000, 'yyyy-MM-dd') !== dayKey) {
      timeline.value = [];
    }
    timeline.value.push({ t: ts, p });
    lastEpoch.value = ts;
  });

  /* 5) liczniki */
  const effectivePpm = computed(() => ppm.value || FALLBACK_PPM);
  const speedNow = computed(() => {
    if (!timeline.value.length) return 0;
    const wnd = timeline.value.filter(v => v.t >= lastEpoch.value - 60);
    const imp = wnd.reduce((a,b)=>a+b.p,0);
    const sec = wnd.at(-1).t - wnd[0].t || 1;
    return (imp*3600)/(effectivePpm.value*sec);
  });
  const distNow = computed(() =>
    timeline.value.reduce((a,b)=>a+b.p,0) / effectivePpm.value
  );

  /* 6) aktualnie pokazywana sesja */
  const currentSession = computed(() => {
    const selId = selectedId.value ?? streamId.value;
    const found = sessions.value.find(s => s.id === selId);
    if (found) return found;

    // 🆕 fallback dla sesji „current” jeszcze niezakończonej
    if (selId === 'current' && timeline.value.length) {
      return {
        id: 'current',
        start: timeline.value[0].t,   // początek z pierwszego impulsu
      };
    }
    return null;
  });

  const isLive = computed(() => !!currentLive.value);

  function selectSession(id) { selectedId.value = id; }

  return {
    sessions,
    timeline,
    currentSession,
    speedNow,
    distNow,
    isLive,
    selectSession,
    selectedId,
  };
});