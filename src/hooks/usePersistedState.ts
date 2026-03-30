import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function upsertChunked(table: string, rows: any[], chunkSize = 500) {
  if (!supabase || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + chunkSize), { ignoreDuplicates: false });
    if (error) console.error(`[supabase] upsert ${table} chunk ${i}:`, error.message);
  }
}

async function insertChunked(table: string, rows: any[], chunkSize = 500) {
  if (!supabase || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + chunkSize));
    if (error) console.error(`[supabase] insert ${table} chunk ${i}:`, error.message);
  }
}

/**
 * Fetches ALL rows from a Supabase table, bypassing the default 1000-row cap
 * by paginating with .range() until fewer rows than PAGE_SIZE are returned.
 * Retries once after a short delay if the first attempt returns empty
 * (guards against truncate-insert race during another user's sync).
 */
async function fetchAllRows<T>(table: string, retry = true): Promise<T[]> {
  if (!supabase) return [];
  const PAGE_SIZE = 1000;
  const all: T[] = [];
  let from = 0;
  let hadError = false;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[supabase] fetchAllRows ${table}:`, error.message);
      hadError = true;
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break; // last page reached
    from += PAGE_SIZE;
  }
  // Retry once if empty (might be mid-sync from another user)
  if (all.length === 0 && !hadError && retry) {
    await new Promise(r => setTimeout(r, 1500));
    return fetchAllRows<T>(table, false);
  }
  return all;
}

// Tables whose primary key is NOT "id"
const PK_MAP: Record<string, string> = {
  motoristas: 'matricula',
  resumos_avaria: 'key',
  antt_code_descriptions: 'codigo',
};

function detectPkColumn(table: string): string {
  return PK_MAP[table] || 'id';
}

async function fetchAllPks(table: string): Promise<string[]> {
  if (!supabase) return [];
  const pkCol = detectPkColumn(table);
  const PAGE_SIZE = 1000;
  const all: string[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(pkCol)
      .range(from, from + PAGE_SIZE - 1);
    if (error) { console.error(`[supabase] fetchAllPks ${table}:`, error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data.map((r: any) => r[pkCol]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for `useState + useEffect(localStorage)`.
 *
 * – Fast initial render from localStorage (sync).
 * – If Supabase is configured, loads from remote and overwrites local state.
 * – On first run (Supabase empty), auto-migrates localStorage data to Supabase.
 * – Every state change is written to both localStorage (cache) and Supabase.
 * – If Supabase is NOT configured, behaves like plain localStorage persistence.
 */
export function usePersistedState<T>(
  table: string,
  lsKey: string,
  fallback: T[] = []
): [T[], Dispatch<SetStateAction<T[]>>, boolean] {
  // 1) Fast sync init from localStorage
  const [data, setData] = useState<T[]>(() => {
    try {
      const s = localStorage.getItem(lsKey);
      return s ? JSON.parse(s) : fallback;
    } catch {
      return fallback;
    }
  });

  const [loading, setLoading] = useState(isSupabaseConfigured);
  const ready = useRef(false);
  const echoRef = useRef<T[] | null>(null); // prevent sync-back of loaded data
  const chain = useRef(Promise.resolve()); // serial sync queue

  // 2) Load from Supabase on mount (async)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      ready.current = true;
      return;
    }

    let dead = false;

    (async () => {
      try {
        const rows = await fetchAllRows<T>(table);
        if (dead) return;

        if (rows.length > 0) {
          // Supabase has data → merge with localStorage to prevent data loss
          let merged = rows;
          try {
            const ls = localStorage.getItem(lsKey);
            if (ls) {
              const local: T[] = JSON.parse(ls);
              const pkCol = detectPkColumn(table);
              const remotePkSet = new Set(rows.map((r: any) => r[pkCol]));
              const localOnly = local.filter((item: any) => {
                const pk = (item as any)[pkCol];
                return pk && !remotePkSet.has(pk);
              });
              if (localOnly.length > 0) merged = [...rows, ...localOnly];
            }
          } catch { /* ignore */ }
          echoRef.current = merged;
          setData(merged);
        } else {
          // Supabase empty → seed with current localStorage / fallback
          try {
            const s = localStorage.getItem(lsKey);
            const parsed: T[] = s ? JSON.parse(s) : fallback;
            if (parsed.length > 0) await insertChunked(table, parsed as any[]);
          } catch {
            /* ignore migration error */
          }
        }
      } catch (e) {
        console.error(`[supabase] load ${table}:`, e);
      } finally {
        if (!dead) {
          ready.current = true;
          setLoading(false);
        }
      }
    })();

    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) Sync on every state change (after init)
  useEffect(() => {
    if (!ready.current) return;

    // Skip echo: data we just loaded from Supabase
    if (echoRef.current !== null && data === echoRef.current) {
      echoRef.current = null;
      return;
    }

    // Cache in localStorage (always, even without Supabase)
    try {
      localStorage.setItem(lsKey, JSON.stringify(data));
    } catch {
      /* quota exceeded — ignore */
    }

    // Sync to Supabase (fire and forget, queued)
    // Uses upsert + delete-stale instead of truncate+insert to avoid
    // a window where the table is empty (race condition for other users).
    if (isSupabaseConfigured && supabase) {
      const snapshot = data;
      chain.current = chain.current.then(async () => {
        try {
          if (snapshot.length === 0) {
            // All data removed — safe to truncate
            await supabase!.rpc('truncate_table', { tname: table });
          } else {
            // 1) Upsert all current rows (data is always present during this step)
            await upsertChunked(table, snapshot as any[]);
            // 2) Fetch remote PKs and delete stale ones
            const remotePks = await fetchAllPks(table);
            const localPks = new Set(snapshot.map((r: any) => r.id ?? r.matricula ?? r.key ?? r.codigo));
            const toDelete = remotePks.filter(pk => !localPks.has(pk));
            if (toDelete.length > 0) {
              const pkCol = detectPkColumn(table);
              for (let i = 0; i < toDelete.length; i += 500) {
                await supabase!.from(table).delete().in(pkCol, toDelete.slice(i, i + 500));
              }
            }
          }
        } catch (e) {
          console.error(`[supabase] sync ${table}:`, e);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return [data, setData, loading];
}
