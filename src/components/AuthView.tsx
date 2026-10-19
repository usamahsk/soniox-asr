import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import type { AppLang } from '../types';
import { BookOpenText } from 'lucide-react';
import { makeT } from '../i18n';

interface AuthViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string) => Promise<void>;
  lang: AppLang;
}

export function AuthView({ onLogin, onSignup, lang }: AuthViewProps) {
  const t = makeT(lang);
  const { toast } = useToast();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [semail, setSemail] = useState('');
  const [spassword, setSpassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!email) errs.email = 'Required';
    if (!password) errs.password = 'Required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      toast(err?.message ?? 'Login failed', 'bad');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!semail) errs.semail = 'Required';
    if (!spassword || spassword.length < 6) errs.spassword = 'Min 6 characters';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await onSignup(semail, spassword);
      toast(t('accountCreated'), 'ok');
      setTab('login');
      setEmail(semail);
    } catch (err: any) {
      toast(err?.message ?? 'Signup failed', 'bad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-pattern" aria-hidden="true" />
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon"><BookOpenText size={30} strokeWidth={2} /></div>
          <h1 className="auth-title">{t('appTitle')}</h1>
          <p className="auth-subtitle">{t('appSub')}</p>
        </div>

        {/* Tabs */}
        <Tabs.Root value={tab} onValueChange={(v) => setTab(v as 'login' | 'signup')} className="auth-tabs">
          <Tabs.List className="auth-tabs-list" aria-label="Authentication">
            <Tabs.Trigger value="login" className="auth-tab">{t('login')}</Tabs.Trigger>
            <Tabs.Trigger value="signup" className="auth-tab">{t('signUp')}</Tabs.Trigger>
          </Tabs.List>

          {/* Login */}
          <Tabs.Content value="login" className="auth-tab-content">
            <form onSubmit={handleLogin} className="auth-form" noValidate>
              <Input
                label={t('emailLabel')} type="email" inputMode="email"
                placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)}
                error={errors.email} autoComplete="email"
              />
              <Input
                label={t('passLabel')} type="password"
                placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                error={errors.password} autoComplete="current-password"
              />
              <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
                {t('login')}
              </Button>
            </form>
          </Tabs.Content>

          {/* Signup */}
          <Tabs.Content value="signup" className="auth-tab-content">
            <form onSubmit={handleSignup} className="auth-form" noValidate>
              <Input
                label={t('emailLabel')} type="email" inputMode="email"
                placeholder="you@example.com" value={semail}
                onChange={e => setSemail(e.target.value)}
                error={errors.semail} autoComplete="email"
              />
              <Input
                label={t('passLabel')} type="password"
                placeholder="••••••••" value={spassword}
                onChange={e => setSpassword(e.target.value)}
                error={errors.spassword} autoComplete="new-password"
              />
              <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
                {t('signup')}
              </Button>
            </form>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
