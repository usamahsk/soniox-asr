import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { config } from '../supabase';

export interface SonioxBalance {
  available_balance_usd: string | null;
  free_balance_usd: string | null;
  used_balance_usd: string | null;
  invoice_billing_enabled: boolean;
  balance_exhausted: boolean;
  autopay_enabled: boolean;
  autopay_threshold_usd: string | null;
  autopay_amount_usd: string | null;
  has_payment_method: boolean;
  has_payment_error: boolean;
}

export function useBalance(session: Session | null) {
  const [balance, setBalance] = useState<SonioxBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const fn = (config as Record<string, string>).BALANCE_FN ?? 'balance';
      const res = await fetch(`${config.SUPABASE_URL}/functions/v1/${fn}`, {
        method: 'POST',
        headers: {
          apikey: config.SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + session.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error ?? 'balance failed');
      setBalance(j as SonioxBalance);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'balance failed');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) refresh();
    else { setBalance(null); setError(null); }
  }, [session, refresh]);

  return { balance, loading, error, refresh };
}
