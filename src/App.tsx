import React, { useEffect, useState } from 'react';
import { ToastProvider } from './components/ui/Toast';
import { AuthView } from './components/AuthView';
import { AppShell } from './components/AppShell';
import { UploadCard } from './components/UploadCard';
import { JobsList } from './components/JobsList';
import { TranscriptViewer } from './components/TranscriptViewer';
import { useAuth } from './hooks/useAuth';
import { useJobs } from './hooks/useJobs';
import { useBalance } from './hooks/useBalance';
import { useToast } from './components/ui/Toast';
import type { AppLang } from './types';

function AppContent() {
  const { session, loading, login, signup, logout } = useAuth();
  const [lang, setLang] = useState<AppLang>('ur');
  const {
    jobs, jobsLoading, currentJob, fullText, uploadProgress, uploading,
    loadJobs, selectJob, uploadAndTranscribe, deleteJob,
  } = useJobs(session);
  const { balance, loading: balanceLoading, error: balanceError, refresh: refreshBalance } = useBalance(session);
  const { toast } = useToast();

  // Apply RTL/LTR + font
  useEffect(() => {
    document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }, [lang]);

  // Load jobs when session is ready
  useEffect(() => {
    if (session) loadJobs();
  }, [session, loadJobs]);

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteJob = async (job: typeof currentJob) => {
    if (!job) return;
    await deleteJob(job);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  if (!session) {
    return <AuthView onLogin={login} onSignup={signup} lang={lang} />;
  }

  return (
    <AppShell
      email={session.user.email ?? ''}
      lang={lang}
      onLangChange={setLang}
      onLogout={handleLogout}
      balance={balance}
      balanceLoading={balanceLoading}
      balanceError={balanceError}
      onBalanceRefresh={refreshBalance}
    >
      <div className="content-grid">
        <UploadCard
          lang={lang}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onUpload={async (file, lcode) => {
            try {
              await uploadAndTranscribe(file, lcode);
              toast(lang === 'ur' ? 'ٹرانسکرپشن شروع ہو گئی' : 'Transcription started', 'ok');
            } catch (err: any) {
              toast(err?.message, 'bad');
            }
          }}
        />
        <JobsList
          jobs={jobs}
          loading={jobsLoading}
          currentJobId={currentJob?.id ?? null}
          lang={lang}
          onSelect={selectJob}
          onDelete={deleteJob}
        />
        {currentJob && fullText && (
          <TranscriptViewer
            job={currentJob}
            fullText={fullText}
            lang={lang}
            onDeleteJob={handleDeleteJob}
          />
        )}
      </div>

    </AppShell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
