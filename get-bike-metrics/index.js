import { Firestore, Timestamp } from '@google-cloud/firestore';
import { CloudTasksClient }     from '@google-cloud/tasks';
import functions                from '@google-cloud/functions-framework';

const PULSES_PER_KM = 464;
const REGION        = process.env.TASKS_REGION  || 'europe-west3';
const QUEUE_NAME    = process.env.TASKS_QUEUE   || 'finalize-queue';
const SERVICE_URL   = process.env.SERVICE_URL;
const SA_EMAIL      = process.env.SA_EMAIL;

const db     = new Firestore();
const tasks  = new CloudTasksClient();

/* ---------- lazy queuePath ---------- */
let queuePath;
async function getQueuePath() {
  if (queuePath) return queuePath;
  const pid   = await tasks.getProjectId();
  queuePath   = tasks.queuePath(pid, REGION, QUEUE_NAME);
  return queuePath;
}

/* ---------- zamknięcie sesji ---------- */
async function finalizeCurrent() {
  const curRef  = db.doc('bike-sessions/current');
  const curSnap = await curRef.get();
  if (!curSnap.exists) return;

  const pulsesSnap = await curRef.collection('pulses').get();
  const samples    = pulsesSnap.size;
  if (samples < 10) {                      // za krótkie → kasujemy
    const batch = db.batch();
    pulsesSnap.forEach(p => batch.delete(p.ref));
    batch.delete(curRef);
    await batch.commit();
    return;
  }

  let imp = 0;
  pulsesSnap.forEach(d => (imp += d.get('p')));

  const { start, lastPulse } = curSnap.data();
  const durationSec = lastPulse.seconds - start.seconds + 1;
  const distKm      = imp / PULSES_PER_KM;
  const avgKmh      = distKm / (durationSec / 3600);

  const sid     = String(start.seconds);
  const sessRef = db.doc(`bike-sessions/${sid}`);

  await db.runTransaction(async trx => {
    trx.set(sessRef, { start, end: lastPulse, samples, imp, distKm, durationSec, avgKmh });
    pulsesSnap.forEach(p => {
      trx.set(sessRef.collection('pulses').doc(p.id), p.data());
      trx.delete(p.ref);
    });
    trx.delete(curRef);
  });
}

/* ---------- główna funkcja ---------- */
functions.http('telemetry', async (req, res) => {

  /* ─ finalize from Cloud Tasks ─ */
  if ('finalize' in req.query) {
    const cur = await db.doc('bike-sessions/current').get();
    if (!cur.exists) return res.sendStatus(204);
    const last = cur.get('lastPulse').seconds;
    if (Math.floor(Date.now() / 1000) - last < 60) return res.sendStatus(204);
    await finalizeCurrent();
    return res.sendStatus(200);
  }

  /* ─ impuls z ESP32 ─ */
  const p = Number(req.query.p ?? req.body?.p);
  const t = Number(req.query.t ?? req.body?.t);
  if (!Number.isFinite(p) || !Number.isFinite(t)) {
    return res.status(400).send('missing p or t');
  }

  const nowTs      = new Timestamp(t, 0);
  const currentRef = db.doc('bike-sessions/current');

  await db.runTransaction(async trx => {
    const cur = await trx.get(currentRef);
    if (!cur.exists) trx.set(currentRef, { start: nowTs, lastPulse: nowTs });
    else             trx.update(currentRef, { lastPulse: nowTs });
    trx.set(currentRef.collection('pulses').doc(), { ts: nowTs, p });
  });

  /* ---------- schedule następnego finalize ---------- */
  const qPath = await getQueuePath();

  const eta   = t + 61;                                 // za minutę + 1 s
  const task  = {
    parent: qPath,
    task: {
      name: `${qPath}/tasks/finalize-${eta}`,            // unikalna nazwa
      scheduleTime: { seconds: eta },
      httpRequest: {
        httpMethod: 'POST',
        url:        `${SERVICE_URL}?finalize=1`,
        headers:    { 'Content-Type': 'application/json' },
        oidcToken:  { serviceAccountEmail: SA_EMAIL },
      },
    },
  };

  try {
    await tasks.createTask(task);
  } catch (err) {
    // jeśli dwa impulsy w tej samej sekundzie → zadanie już istnieje
    if (err.code !== 6) throw err;   // 6 = ALREADY_EXISTS, ignorujemy
  }

  res.sendStatus(200);
});
