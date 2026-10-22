import React from 'react';
import type { SonioxBalance } from '../hooks/useBalance';
import { useUsdToInr, usdToInr, fmtInr } from '../hooks/useFx';
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
  const rate = useUsdToInr();

  const available = usdToInr(balance?.available_balance_usd, rate);
  const low = available != null && available < 200 && !balance?.invoice_billing_enabled;
  const exhausted = balance?.balance_exhausted;

  const label = loading
    ? '…'
    : error
      ? '!'
      : balance?.invoice_billing_enabled
        ? 'INV'
        : available != null
          ? fmtInr(available)
          : '?';

  const title = error
    ? `${t('balanceFailed')}: ${error}`
    : balance
      ? `${t('balance')}: ${fmtInr(available)} (free ${fmtInr(usdToInr(balance.free_balance_usd, rate))} • used ${fmtInr(usdToInr(balance.used_balance_usd, rate))})${balance.autopay_enabled ? ` • autopay ${fmtInr(usdToInr(balance.autopay_amount_usd, rate))} @ ${fmtInr(usdToInr(balance.autopay_threshold_usd, rate))}` : ''}`
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
