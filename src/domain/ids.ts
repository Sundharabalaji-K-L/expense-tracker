let counter = 0;

/** Compact unique id: time component + random + monotonic counter. */
export function newId(prefix = ''): string {
  counter = (counter + 1) % 1000;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${time}${rand}${counter.toString(36)}`;
}
