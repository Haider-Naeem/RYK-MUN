/* ── In-memory cache (same interface, now Supabase-backed) ────── */
import { supabase } from '../supabase/config';

const store = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 min

/* ── snake_case → camelCase converter ─────────────────────────── */
function toCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function keysToCamel(v) {
  if (Array.isArray(v)) return v.map(keysToCamel);
  if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
    return Object.fromEntries(
      Object.entries(v).map(([k, val]) => [toCamel(k), keysToCamel(val)])
    );
  }
  return v;
}

/* ── Cache primitives ─────────────────────────────────────────── */
export const cache = {
  get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
    return entry.data;
  },
  set(key, data, ttl = DEFAULT_TTL) {
    store.set(key, { data, expiresAt: Date.now() + ttl });
    return data;
  },
  del(key)       { store.delete(key); },
  invalidate(prefix) {
    for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
  },
  clear() { store.clear(); },
};

/* ── Cached Supabase helpers ──────────────────────────────────── */

/** Fetch all rows of a table, cache, and camelCase keys. */
export async function cachedCollection(table, ttl = DEFAULT_TTL) {
  const key = `col:${table}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;

  return cache.set(key, keysToCamel(data), ttl);
}

/**
 * Fetch rows filtered by one field (use snake_case field name).
 * e.g. cachedWhere('committees', 'event_id', eventId)
 */
export async function cachedWhere(table, field, value, ttl = DEFAULT_TTL) {
  const key = `col:${table}:${field}:${value}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { data, error } = await supabase
    .from(table).select('*').eq(field, value);
  if (error) throw error;

  return cache.set(key, keysToCamel(data), ttl);
}

export function invalidateCollection(table) {
  cache.invalidate(`col:${table}`);
}