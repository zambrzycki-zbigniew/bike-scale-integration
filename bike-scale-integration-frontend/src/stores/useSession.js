import { ref, computed, inject } from 'vue';
import {
  collection, query, orderBy, where, onSnapshot, doc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { useMetrics } from '@/composables/useMetrics';

const PPM         = 464;
const MIN_SAMPLES = 10;

/* ── singleton reactive state ── */
const sessions    = ref([]);      // zamknięte + ewent. current
const timeline    = ref([]);      // [{ t, p }]
const currentLive = ref(null);    // 'current' lub null
const selectedId  = ref(null);    // id z picker-a
let   wired       = false;
let   api;                        

export function useSession() {
  if (wired) return api;          // zwracamy już istniejący obiekt

  /* ────────── konfiguracja tylko raz ────────── */
  const db = inject('db');

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
  const speedNow = computed(() => {
    if (!timeline.value.length) return 0;
    const wnd = timeline.value.filter(v => v.t >= lastEpoch.value - 60);
    const imp = wnd.reduce((a,b)=>a+b.p,0);
    const sec = wnd.at(-1).t - wnd[0].t || 1;
    return (imp*3600)/(PPM*sec);
  });
  const distNow = computed(() =>
    timeline.value.reduce((a,b)=>a+b.p,0) / PPM
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

  /* 7) public API */
  api = {
    sessions,
    timeline,
    currentSession,
    speedNow,
    distNow,
    isLive:  computed(() => !!currentLive.value),
    selectSession(id) { selectedId.value = id; },
    selectedId,
  };

  wired = true;
  return api;
}