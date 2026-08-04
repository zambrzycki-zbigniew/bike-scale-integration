// approximate MET brackets for cycling by average speed (compendium of physical activities)
export const MET_BRACKETS = [
  { min: 0, met: 4.0 },
  { min: 16, met: 6.8 },
  { min: 19, met: 8.0 },
  { min: 22.4, met: 10.0 },
  { min: 25.6, met: 12.0 },
];

export function metForSpeed(kmh) {
  let met = MET_BRACKETS[0].met;
  for (const bracket of MET_BRACKETS) {
    if (kmh >= bracket.min) met = bracket.met;
    else break;
  }
  return met;
}

// the next-higher MET bracket above the given speed, or null if already at the top tier
export function nextTier(kmh) {
  return MET_BRACKETS.find((bracket) => bracket.min > kmh) ?? null;
}
