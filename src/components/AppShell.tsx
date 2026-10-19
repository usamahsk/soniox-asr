import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Avatar from '@radix-ui/react-avatar';
import type { AppLang } from '../types';
import type { SonioxBalance } from '../hooks/useBalance';
import { BalancePill } from './BalancePill';
import { makeT } from '../i18n';

interface AppShellProps {
  email: string;
  lang: AppLang;
  onLangChange: (lang: AppLang) => void;
  onLogout: () => void;
  children: React.ReactNode;
  balance: SonioxBalance | null;
  balanceLoading: boolean;
  balanceError: string | null;
  onBalanceRefresh: () => void;
}

function getInitials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

export function AppShell({ email, lang, onLangChange, onLogout, children, balance, balanceLoading, balanceError, onBalanceRefresh }: AppShellProps) {
  const t = makeT(lang);
  const isUrdu = lang === 'ur';

  return (
    <div className="app-shell-root">
      {/* Sticky Header */}
      <header className="app-header">
        <div className="app-header-inner">
          {/* Logo */}
          <div className="app-logo">
            <div className="app-logo-icon">📖</div>
            <div>
              <div className="app-logo-title">{t('appTitle')}</div>
              <div className="app-logo-sub">درس • Lecture</div>
            </div>
          </div>

          {/* Right side */}
          <div className="app-header-right">
            <BalancePill
              balance={balance}
              loading={balanceLoading}
              error={balanceError}
              lang={lang}
              onRefresh={onBalanceRefresh}
            />
            {/* Language Toggle */}
            <div className="lang-toggle" role="group" aria-label="Language">
              <button
                className={`lang-btn ${!isUrdu ? 'lang-btn-active' : ''}`}
                onClick={() => onLangChange('en')}
                aria-pressed={!isUrdu}
              >EN</button>
              <button
                className={`lang-btn ${isUrdu ? 'lang-btn-active' : ''}`}
                onClick={() => onLangChange('ur')}
                aria-pressed={isUrdu}
              >UR</button>
            </div>

            {/* User Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="user-menu-trigger" aria-label={t('userMenu')}>
                  <Avatar.Root className="avatar">
                    <Avatar.Fallback className="avatar-fallback">
                      {getInitials(email)}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <span className="user-email-short">{email.split('@')[0]}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="user-chevron">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="dropdown-content" align="end" sideOffset={6}>
                  <div className="dropdown-user-info">
                    <div className="dropdown-email">{email}</div>
                  </div>
                  <DropdownMenu.Separator className="dropdown-separator" />
                  <DropdownMenu.Item className="dropdown-item dropdown-item-danger" onSelect={onLogout}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    {t('logout')}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
