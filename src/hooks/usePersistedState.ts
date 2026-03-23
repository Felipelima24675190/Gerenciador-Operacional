import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
 */
async function fetchAllRows<T>(table: string): Promise<T[]> {
  if (!supabase) return [];
  const PAGE_SIZE = 1000;
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[supabase] fetchAllRows ${table}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break; // last page reached
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
          // Supabase has data → use it
          echoRef.current = rows;
          setData(rows);
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
    if (isSupabaseConfigured && supabase) {
      const snapshot = data;
      chain.current = chain.current.then(async () => {
        try {
          await supabase!.rpc('truncate_table', { tname: table });
          if (snapshot.length > 0) {
            await insertChunked(table, snapshot as any[]);
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
