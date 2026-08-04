/**
 *  hybridSeries v3–tunable
 *  • ostatni tailSec sekund    → odstęp = minStep
 *  • najstarsze dane           → odstęp = maxStep
 *  • pomiędzy                  → odstęp rośnie liniowo
 *
 *  @param {number}  startTs     (pozostawiony dla zgodności – nieużywany)
 *  @param {{t:number,p:number}[]} pulses   tablica {t – epoch-s, p – impulsy}
 *  @param {number}  ppm         pulses-per-km
 *  @param {number}  tailSec     długość hi-res (domyślnie 60 s)
 *  @param {number}  minStep     odstęp (s) dla najnowszych punktów    – domyślnie 10
 *  @param {number}  maxStep     odstęp (s) dla najstarszych punktów   – domyślnie 60
 *  @return {{ distPoints:{x:number,y:number}[], speedPoints:{x:number,y:number}[] }}
 */
export function hybridSeries(
  startTs,
  pulses,
  ppm,
  tailSec  = 60,
  minStep,
  maxStep
) {
  if (!pulses?.length) return { distPoints: [], speedPoints: [] };
  maxStep = pulses.length < maxStep ? pulses.length : maxStep
  minStep = minStep < pulses.length/300 ? pulses.length/300 : minStep

  const distPoints  = [];
  const speedPoints = [];
  const queue = [];
  let   sum   = 0;
  let   kmC   = 0;

  const total = pulses.length;
  let lastPlottedTs = pulses[0].t;

  const calcKmh = (imp, secs) => (ppm ? (imp * 3600) / (ppm * secs) : 0);

  for (let i = 0; i < total; i++) {
    const p    = pulses[i];
    const tsMs = p.t * 1000;
    queue.push(p);
    sum += p.p;
    if (queue.length > tailSec) sum -= queue.shift().p;
    kmC += p.p;
    const ageRatio = (total - 1 - i) / (total - 1);
    const step     = Math.round(
      minStep + (maxStep - minStep) * ageRatio
    );
    if (p.t - lastPlottedTs < step) continue;
    lastPlottedTs = p.t;

    const seconds = queue[queue.length - 1].t - queue[0].t || 1;
    const kmh     = calcKmh(sum, seconds);

    distPoints .push({ x: tsMs, y: ppm ? kmC / ppm : 0 });
    speedPoints.push({ x: tsMs, y: kmh });
  }

  return { distPoints, speedPoints };
}