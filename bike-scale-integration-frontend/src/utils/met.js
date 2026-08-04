// approximate MET for cycling by average speed (compendium of physical activities)
export function metForSpeed(kmh) {
  if (kmh < 16) return 4.0;
  if (kmh < 19) return 6.8;
  if (kmh < 22.4) return 8.0;
  if (kmh < 25.6) return 10.0;
  return 12.0;
}
