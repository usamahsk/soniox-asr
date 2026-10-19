import React from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { Button } from './ui/Button';
import { useDownload } from '../hooks/useDownload';
import { useToast } from './ui/Toast';
import type { Job, AppLang } from '../types';
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

  if (lang === 'auto') {
    const isRTLText = /[\u0590-\u05FF\u0600-\u06FF]/.test(text);
    return isRTLText ? 'rtl' : 'ltr';
  }
  return 'ltr';
}

export function TranscriptViewer({ job, fullText, lang, onDeleteJob }: TranscriptViewerProps) {
  const t = makeT(lang as AppLang);
  const { toast } = useToast();
  const fullName = job?.file_name?.replace(/\.[^.]+$/, '') ?? 'lecture';
  
  // 1. Strip out the [ur], [ar], [en] tags cleanly
  const cleanText = fullText.replace(/\[[a-zA-Z]{2}\]\s*/g, '').trim();

  // 2. Pass cleanText to download hooks so downloads don't have tags either
  const textDir = getTextDirection(cleanText, lang);
  const { downloadTxt, downloadDoc, downloadPdf, copyToClipboard, share, docBusy } = useDownload(cleanText, fullName, textDir);

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
            <span className="transcript-icon">📄</span>
            {fullName}
          </h2>
          <div className="transcript-meta">
            {wordCount(cleanText).toLocaleString()} words · {cleanText.length.toLocaleString()} chars
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="transcript-actions">
        <Button variant="outline" size="sm" onClick={downloadTxt}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>
          .txt
        </Button>
        <Button variant="outline" size="sm" onClick={downloadDoc} loading={docBusy}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}>
          .docx
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>}>
          PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}>
          {t('copyTxt')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>}>
          {t('shareTxt')}
        </Button>
      </div>

      {/* Transcript body */}
      <ScrollArea.Root className="transcript-scroll" type="auto" dir={textDir}>
        <ScrollArea.Viewport className="transcript-body" dir={textDir}>
          <div 
            className="transcript-text" 
            style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word', 
              overflowWrap: 'break-word',
              lineHeight: '2' 
            }}
          >
            {cleanText}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="scrollbar">
          <ScrollArea.Thumb className="scrollbar-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* Footer */}
      <div className="transcript-footer">
        <span className="transcript-filename">{job.file_name}</span>
        <button
          className="transcript-delete-btn"
          onClick={() => onDeleteJob(job)}
          aria-label={t('delete')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
          {t('delete')}
        </button>
      </div>
    </section>
  );
}