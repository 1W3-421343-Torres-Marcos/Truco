import type { StorageAdapter } from './types.ts';

/**
 * Crea un adaptador de almacenamiento en memoria (ideal para tests o entornos sin localStorage).
 */
export function createMemoryStorage(initial?: Readonly<Record<string, string>>): StorageAdapter {
  const map = new Map<string, string>(initial ? Object.entries(initial) : undefined);

  return {
    getItem(key: string): string | null {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
    removeItem(key: string): void {
      map.delete(key);
    },
  };
}

const fallbackMemoryStorage = createMemoryStorage();

/**
 * Devuelve `globalThis.localStorage` si está disponible y accesible,
 * o un almacenamiento en memoria compartido como respaldo.
 */
export function getDefaultStorage(): StorageAdapter {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage !== null &&
      typeof window.localStorage.getItem === 'function'
    ) {
      return window.localStorage;
    }
  } catch {
    // Entornos con localStorage restringido (modo privado estricto / iframe)
  }
  return fallbackMemoryStorage;
}

/**
 * Lee y parsea JSON de una clave de forma segura.
 * Si el JSON es inválido o el storage falla, loguea un warning y devuelve `null`.
 */
export function safeReadJson(key: string, storage: StorageAdapter = getDefaultStorage()): unknown {
  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as unknown;
  } catch (err) {
    console.warn(`[persistence] Error al leer o parsear clave "${key}":`, err);
    try {
      storage.removeItem(key);
    } catch {
      // Ignorar error de limpieza
    }
    return null;
  }
}

/**
 * Serializa y guarda JSON de forma segura sin romper la aplicación si el storage falla.
 */
export function safeWriteJson(
  key: string,
  value: unknown,
  storage: StorageAdapter = getDefaultStorage(),
): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[persistence] Error al guardar clave "${key}":`, err);
    return false;
  }
}

/**
 * Elimina una clave del storage de forma segura.
 */
export function safeRemoveKey(key: string, storage: StorageAdapter = getDefaultStorage()): void {
  try {
    storage.removeItem(key);
  } catch (err) {
    console.warn(`[persistence] Error al borrar clave "${key}":`, err);
  }
}
