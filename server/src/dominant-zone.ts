export type Zone = 1 | 2 | 3 | 4 | 5;

export type ZoneTimes = readonly [number, number, number, number, number];

export function dominantZone(seconds: ZoneTimes): Zone | null {
  let bestIndex = 0;
  for (let index = 1; index < seconds.length; index += 1) {
    const candidate = seconds[index];
    const best = seconds[bestIndex];
    if (candidate !== undefined && best !== undefined && candidate >= best) {
      bestIndex = index;
    }
  }

  const best = seconds[bestIndex];
  if (best === undefined || best === 0) {
    return null;
  }

  return zoneAt(bestIndex);
}

function zoneAt(index: number): Zone {
  const zone = index + 1;
  if (zone === 1 || zone === 2 || zone === 3 || zone === 4 || zone === 5) {
    return zone;
  }
  throw new Error(`Zone index ${index} is outside 1 through 5`);
}
