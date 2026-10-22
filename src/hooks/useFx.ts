import { useState, useEffect } from 'react';

const FALLBACK_RATE = 88;
const CACHE_KEY = 'usd_inr_rate';
const CACHE_TTL = 12 * 60 * 60 * 1000;

function readCache(): number {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    if (c && typeof c.r === 'number' && c.r > 0 && Date.now() - c.t < CACHE_TTL) return c.r;
  } catch {}
  return FALLBACK_RATE;
}

export function useUsdToInr() {
  const [rate, setRate] = useState<number>(readCache);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR');
        const j = await res.json();
        const r = j?.rates?.INR;
        if (alive && typeof r === 'number' && r > 0) {
          setRate(r);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ r, t: Date.now() })); } catch {}
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  return rate;
}

export function usdToInr(usd: string | number | null | undefined, rate: number): number | null {
  if (usd == null) return null;
  const v = typeof usd === 'number' ? usd : parseFloat(usd);
  return Number.isFinite(v) ? v * rate : null;
}

export function fmtInr(v: number | null): string {
  if (v == null) return '?';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
