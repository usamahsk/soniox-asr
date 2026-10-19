import { useState, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb, config } from '../supabase';
import type { Job, LangCode } from '../types';

interface UploadProgress { pct: number; status: string; }

export function useJobs(session: Session | null) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [fullText, setFullText] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ pct: 0, status: '' });
  const [uploading, setUploading] = useState(false);
  const pollingRef = useRef(false);
  const currentJobIdRef = useRef<string | null>(null);

  const loadJobs = useCallback(async () => {
    const { data } = await sb.from('jobs')
      .select('id,file_name,status,created_at,audio_path,transcript_text,error')
      .order('created_at', { ascending: false })
      .limit(30);
    setJobs(data as Job[] ?? []);
    setJobsLoading(false);
  }, []);

  const selectJob = useCallback((job: Job) => {
    currentJobIdRef.current = job.id;
    setCurrentJob(job);
    if (job.transcript_text) {
      setFullText(job.transcript_text);
    } else if (job.status === 'processing' || job.status === 'uploading') {
      pollStatus(job.id);
    }
  }, []); // eslint-disable-line

  const pollStatus = useCallback(async (jobId: string) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    const tryPoll = async () => {
      try {
        const { data: { session: s } } = await sb.auth.getSession();
        if (!s) { pollingRef.current = false; return; }
        const res = await fetch(`${config.SUPABASE_URL}/functions/v1/${config.STATUS_FN}`, {
          method: 'POST',
          headers: { apikey: config.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jobId }),
        });
        const j = await res.json();
        if (j.status === 'completed') {
          setFullText(j.text ?? '');
          setUploadProgress({ pct: 100, status: 'done' });
          pollingRef.current = false;
          loadJobs();
          setCurrentJob(prev => prev?.id === jobId ? { ...prev, status: 'completed', transcript_text: j.text } : prev);
        } else if (j.status === 'error' || j.error) {
          setUploadProgress({ pct: 0, status: 'error' });
          pollingRef.current = false;
          loadJobs();
        } else {
          setTimeout(() => { pollingRef.current = false; tryPoll(); }, 10000);
        }
      } catch {
        setTimeout(() => { pollingRef.current = false; tryPoll(); }, 15000);
      }
    };
    await tryPoll();
  }, [loadJobs]);

  const uploadAndTranscribe = useCallback(async (file: File, lang: LangCode) => {
    if (!session) throw new Error('not logged in');
    setUploading(true);
    setUploadProgress({ pct: 5, status: 'uploading' });
    try {
      const path = `${session.user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await sb.storage.from('lectures').upload(path, file, { upsert: false });
      if (upErr) throw new Error('Storage: ' + upErr.message);

      setUploadProgress({ pct: 55, status: 'uploading' });
      const { data: job, error: dbErr } = await sb.from('jobs')
        .insert({ audio_path: path, file_name: file.name, user_id: session.user.id, status: 'uploading' })
        .select().single();
      if (dbErr) throw new Error(dbErr.message);

      setUploadProgress({ pct: 70, status: 'processing' });
      const r = await fetch(`${config.SUPABASE_URL}/functions/v1/${config.TRANSCRIBE_FN}`, {
        method: 'POST',
        headers: { apikey: config.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, lang }),
      });
      if (!r.ok) throw new Error('Transcribe start failed: ' + await r.text());

      setUploadProgress({ pct: 85, status: 'processing' });
      currentJobIdRef.current = job.id;
      setCurrentJob(job as Job);
      loadJobs();
      pollStatus(job.id);
    } finally {
      setUploading(false);
    }
  }, [session, loadJobs, pollStatus]);

  const deleteJob = useCallback(async (job: Job) => {
    await sb.storage.from('lectures').remove([job.audio_path]);
    await sb.from('jobs').delete().eq('id', job.id);
    if (currentJob?.id === job.id) {
      setCurrentJob(null);
      setFullText('');
    }
    loadJobs();
  }, [currentJob, loadJobs]);

  return {
    jobs, jobsLoading, currentJob, fullText, uploadProgress, uploading,
    loadJobs, selectJob, uploadAndTranscribe, deleteJob, pollStatus,
  };
}
