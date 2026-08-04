/* ------------------------------------------------------------------
 *  RE-CALC   /bike-sessions/*   – uaktualnienie statystyk
 * ------------------------------------------------------------------
 *  • Przechodzi po wszystkich dokumentach (oprócz "current")
 *  • Pobiera ich podkolekcje /pulses
 *  • Liczy: samples, imp, durationSec, distKm, avgKmh
 *  • Jeśli samples < 10  →  kasuje dokument i całą podkolekcję
 * ------------------------------------------------------------------ */

import { Firestore, Timestamp } from '@google-cloud/firestore';

const db             = new Firestore({ ignoreUndefinedProperties: true });
const PULSES_PER_KM  = 464;
const MIN_SAMPLES    = 10;

/* ---------- BulkWriter ---------- */
const bw = db.bulkWriter({ throttling: true });
bw.onWriteError(err => {
  console.error('❌', err.documentRef.path, err.message);
  return err.failedAttempts < 3;
});

/* ---------- MAIN ---------- */
(async () => {
  const sessSnap = await db.collection('bike-sessions')
                           .where('__name__', '!=', 'current')
                           .get();

  console.log(`🔍  Sessions to update: ${sessSnap.size}`);

  let updated = 0, removed = 0;

  for (const doc of sessSnap.docs) {
    const pulses = await doc.ref.collection('pulses')
                              .orderBy('ts')
                              .get();
    if (pulses.empty) continue;

    const samples = pulses.size;
    if (samples < MIN_SAMPLES) {
      // Kasujemy śmieciowe sesje + impulsy
      bw.delete(doc.ref);
      pulses.forEach(p => bw.delete(p.ref));
      removed++;
      continue;
    }

    const first = pulses.docs[0].data().ts;
    const last  = pulses.docs.at(-1).data().ts;

    let imp = 0;
    pulses.forEach(p => (imp += p.get('p')));

    const durationSec = last.seconds - first.seconds + 1;
    const distKm      = imp / PULSES_PER_KM;
    const avgKmh      = distKm / (durationSec / 3600);

    bw.update(doc.ref, {
      start:        first,
      end:          last,
      samples,
      imp,
      durationSec,
      distKm,
      avgKmh,
      recalculatedAt: Timestamp.now(),
    });
    updated++;
  }

  console.log('✍️  Committing …');
  await bw.close();
  console.log(`✅  Done. Updated: ${updated}  •  Removed (<${MIN_SAMPLES}): ${removed}`);
})();
