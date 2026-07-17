export function readStoredJson(key, fallback, storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key, value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStoredValue(key, storage = globalThis.localStorage) {
  try {
    storage?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
