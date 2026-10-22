import React from 'react';
import { Button } from './ui/Button';
import { useDownload } from '../hooks/useDownload';
import { useTranslit, type DisplayScript } from '../hooks/useTranslit';
import { useToast } from './ui/Toast';
import { AudioPlayer } from './AudioPlayer';
import type { Job, AppLang } from '../types';
import { FileText, FileDiff, Printer, Copy, Share2, Trash2, Languages } from 'lucide-react';
import { makeT } from '../i18n';

interface TranscriptViewerProps {
  job: Job | null;
  fullText: string;
  lang: AppLang | 'auto';
  onDeleteJob: (job: Job) => Promise<void>;
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// Helper to determine text direction dynamically
function getTextDirection(text: string, lang: string): 'rtl' | 'ltr' {
  const rtlLangs = ['ur', 'ar', 'fa', 'he'];
  if (rtlLangs.includes(lang)) return 'rtl';

  const isRTLText = /[\u0590-\u05FF\u0600-\u06FF]/.test(text);
  const isIndicText = /[\u0900-\u097F\u0A80-\u0AFF]/.test(text); // Devanagari / Gujarati blocks
  if (lang === 'auto') return isRTLText && !isIndicText ? 'rtl' : 'ltr';
  return isRTLText && !isIndicText ? 'rtl' : 'ltr';
}

export function TranscriptViewer({ job, fullText, lang, onDeleteJob }: TranscriptViewerProps) {
  const t = makeT(lang as AppLang);
  const { toast } = useToast();
  const fullName = job?.file_name?.replace(/\.[^.]+$/, '') ?? 'lecture';
  
  // 1. Strip out the [ur], [ar], [en] tags cleanly
  const cleanText = fullText.replace(/\[[a-zA-Z]{2}\]\s*/g, '').trim();

  // 2. Transliteration toggle — original (Urdu/Arabic) or a phonetic script
  const { script, routes, busy, displayText, selectScript } = useTranslit(job, cleanText);
  const shown = displayText ?? cleanText;
  const textDir = getTextDirection(shown, lang);
  const { downloadTxt, downloadDoc, downloadPdf, copyToClipboard, share, docBusy } = useDownload(shown, fullName, textDir);
  const scriptFont = script === 'gu' ? 'var(--font-gujarati)' : script === 'dev' ? 'var(--font-devanagari)' : undefined;
  const routeFont = (id: string) => id === 'gu' ? 'var(--font-gujarati)' : id === 'dev' ? 'var(--font-devanagari)' : undefined;

  const switchScript = async (next: DisplayScript) => {
    try { await selectScript(next); } catch (e: any) { toast(e?.message ?? t('translitFailed'), 'bad'); }
  };

  if (!job || !fullText) return null;

  const handleCopy = async () => {
    const ok = await copyToClipboard();
    toast(ok ? t('copied') : t('copyFailed'), ok ? 'ok' : 'bad');
  };

  const handleShare = async () => {
    const result = await share();
    if (result === 'failed') toast(t('shareFailed'), 'bad');
    else toast(t('copied'), 'ok');
  };

  const handleDownloadPdf = () => downloadPdf();
  
  // textDir computed above for downloads + rendering

  return (
    <section className="card transcript-card">
      {/* Header */}
      <div className="transcript-header">
        <div>
          <h2 className="card-title transcript-title">
            <span className="transcript-icon"><FileText size={19} strokeWidth={2.2} /></span>
            {fullName}
          </h2>
          <div className="transcript-meta">
            {wordCount(shown).toLocaleString()} words · {shown.length.toLocaleString()} chars
          </div>
        </div>
      </div>

      {/* Audio player */}
      <AudioPlayer audioPath={job.audio_path} fileName={job.file_name ?? undefined} />

      {/* Action buttons */}
      <div className="transcript-actions">
        {/* Script toggle — driven by SCRIPT_ROUTES, add future scripts in useTranslit */}
        <Button variant={script === 'original' ? 'primary' : 'outline'} size="sm"
          icon={<Languages size={14} />} disabled={busy}
          onClick={() => switchScript('original')}>
          {t('original')}
        </Button>
        {routes.map((r) => (
          <Button key={r.id} variant={script === r.id ? 'primary' : 'outline'} size="sm"
            loading={busy && script === r.id} disabled={busy && script !== r.id}
            onClick={() => switchScript(r.id)}>
            <span style={{ fontFamily: routeFont(r.id), fontSize: '1.05em' }}>{r.label}</span>
          </Button>
        ))}
      </div>

      <div className="transcript-actions">
        <Button variant="outline" size="sm" onClick={downloadTxt}
          icon={<FileText size={14} />}>
          .txt
        </Button>
        <Button variant="outline" size="sm" onClick={downloadDoc} loading={docBusy}
          icon={<FileDiff size={14} />}>
          .docx
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}
          icon={<Printer size={14} />}>
          PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy}
          icon={<Copy size={14} />}>
          {t('copyTxt')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}
          icon={<Share2 size={14} />}>
          {t('shareTxt')}
        </Button>
      </div>

      {/* Transcript body — native scrollbar matching the jobs list */}
      <div className="transcript-scroll" dir={textDir}>
        <div
          className="transcript-text"
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: '2',
              fontFamily: scriptFont,
              textAlign: textDir === 'rtl' ? 'right' : 'left',
            }}
        >
          {shown}
        </div>
      </div>

      {/* Footer */}
      <div className="transcript-footer">
        <span className="transcript-filename">{job.file_name}</span>
        <button
          className="transcript-delete-btn"
          onClick={() => onDeleteJob(job)}
          aria-label={t('delete')}
        >
          <Trash2 size={13} />
          {t('delete')}
        </button>
      </div>
    </section>
  );
}