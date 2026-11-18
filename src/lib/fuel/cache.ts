type Entry<T> = { expires: number; value: T };

const store = new Map<string, Entry<unknown>>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<{ value: T; cached: boolean }> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    return Promise.resolve({ value: hit.value as T, cached: true });
  }
  return load().then((value) => {
    store.set(key, { expires: Date.now() + ttlMs, value });
    return { value, cached: false };
  });
}

export function roundArea(lat: number, lng: number) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}
