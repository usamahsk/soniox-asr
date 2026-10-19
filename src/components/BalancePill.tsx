import React from 'react';
import type { SonioxBalance } from '../hooks/useBalance';
import type { AppLang } from '../types';
import { makeT } from '../i18n';

interface BalancePillProps {
  balance: SonioxBalance | null;
  loading: boolean;
  error: string | null;
  lang: AppLang;
  onRefresh: () => void;
}

export function BalancePill({ balance, loading, error, lang, onRefresh }: BalancePillProps) {
  const t = makeT(lang);

  const available = balance?.available_balance_usd != null ? parseFloat(balance.available_balance_usd) : null;
  const low = available != null && available < 2 && !balance?.invoice_billing_enabled;
  const exhausted = balance?.balance_exhausted;

  const label = loading
    ? '…'
    : error
      ? '!'
      : balance?.invoice_billing_enabled
        ? 'INV'
        : available != null
          ? `$${available.toFixed(2)}`
          : '?';

  const title = error
    ? `${t('balanceFailed')}: ${error}`
    : balance
      ? `${t('balance')}: $${balance.available_balance_usd ?? '?'} (free $${balance.free_balance_usd ?? '0'} • used $${balance.used_balance_usd ?? '0'})${balance.autopay_enabled ? ` • autopay $${balance.autopay_amount_usd} @ $${balance.autopay_threshold_usd}` : ''}`
      : t('balance');

  return (
    <button
      type="button"
      className={`balance-pill ${low || exhausted ? 'balance-pill-low' : ''}`}
      title={title}
      onClick={onRefresh}
      aria-label={title}
    >
      <span className={`balance-dot ${loading ? 'balance-dot-pulse' : ''} ${low || exhausted ? 'balance-dot-low' : 'balance-dot-ok'}`} />
      <span className="balance-amount">{label}</span>
    </button>
  );
}
