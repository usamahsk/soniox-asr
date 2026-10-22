import { useCallback, useEffect, useRef, useState } from 'react';
import { sb, config } from '../supabase';
import type { Job } from '../types';

// Script toggle routes — add a future script with ONE entry here.
// `aksharamukha` value must match the SCRIPTS registry in supabase/functions/transliterate-text.
export const SCRIPT_ROUTES = [
  { id: 'gu', aksharamukha: 'Gujarati', label: 'ગુજરાતી' },
  { id: 'dev', aksharamukha: 'Devanagari', label: 'देवनागरी' },
  { id: 'en', aksharamukha: 'English', label: 'English' },
] as const;

const SOURCE_SCRIPT = 'Urdu';

export type DisplayScript = typeof SCRIPT_ROUTES[number]['id'] | 'original';

export function useTranslit(job: Job | null, text: string) {
  const [script, setScript] = useState<DisplayScript>('original');
  const [busy, setBusy] = useState(false);
  const cacheRef = useRef(new Map<string, string>());
  const busyRef = useRef(false);

  // New job/text → back to original (cache is keyed by jobId so it survives switching)
  useEffect(() => {
    setScript('original');
    busyRef.current = false;
    setBusy(false);
  }, [job?.id, text]);

  const selectScript = useCallback(async (next: DisplayScript) => {
    if (!job || !text || next === 'original') { setScript(next); return; }
    setScript(next);
    if (busyRef.current) return;
    const code = SCRIPT_ROUTES.find((r) => r.id === next)?.aksharamukha;
    if (!code) throw new Error('unknown script route: ' + next);
    const key = `${job.id}:${next}`;
    if (cacheRef.current.has(key)) return;

    busyRef.current = true;
    setBusy(true);
    try {
      // 1. Persisted earlier? (RLS: only this user's jobs are readable)
      const { data: rows } = await sb.from('transcripts').select('script,text').eq('record_id', job.id);
      const hit = rows?.find((r) => r.script === code);
      if (hit?.text) {
        cacheRef.current.set(key, hit.text);
        return;
      }
      // 2. Edge function
      const { data: { session: s } } = await sb.auth.getSession();
      if (!s) throw new Error('not logged in');
      const res = await fetch(`${config.SUPABASE_URL}/functions/v1/${config.TRANSLIT_FN}`, {
        method: 'POST',
        headers: { apikey: config.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, text, sourceScript: SOURCE_SCRIPT, targetScripts: [code] }),
      });
      const j: any = await res.json();
      if (!res.ok || !j.results?.[0]?.text) throw new Error(j.error || j.failed?.[0]?.error || 'transliteration failed');
      cacheRef.current.set(key, j.results[0].text);
    } catch (e) {
      setScript('original');
      throw e;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [job, text]);

  const displayText = script === 'original' ? text : cacheRef.current.get(`${job?.id}:${script}`) ?? null;
  return { script, routes: SCRIPT_ROUTES, busy, displayText, selectScript };
}
