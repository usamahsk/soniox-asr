import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';
import { useToast } from './ui/Toast';
import type { AppLang, LangCode } from '../types';
import { makeT } from '../i18n';

interface UploadCardProps {
  lang: AppLang;
  uploading: boolean;
  uploadProgress: { pct: number; status: string };
  onUpload: (file: File, lang: LangCode) => Promise<void>;
}

const LANG_OPTIONS: { value: LangCode; labelKey: keyof ReturnType<typeof makeT> extends (k: infer K) => string ? K : never }[] = [
  { value: 'ur-ar', labelKey: 'langUrAr' },
  { value: 'ur', labelKey: 'langUr' },
  { value: 'ar', labelKey: 'langAr' },
  { value: 'hi', labelKey: 'langHi' },
  { value: 'gu', labelKey: 'langGu' },
  { value: 'multi', labelKey: 'langMulti' },
];

const MAX_SIZE = 100 * 1024 * 1024;

export function UploadCard({ lang, uploading, uploadProgress, onUpload }: UploadCardProps) {
  const t = makeT(lang);
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [lectureLang, setLectureLang] = useState<LangCode>('ur-ar');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.size > MAX_SIZE) { toast(t('fileTooLarge'), 'bad'); return; }
    setFile(f);
  }, [t, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast(t('selectFirst'), 'bad'); return; }
    try {
      await onUpload(file, lectureLang);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      toast(err?.message ?? t('error'), 'bad');
    }
  };

  const statusLabel = (() => {
    const s = uploadProgress.status;
    if (s === 'uploading') return t('uploading');
    if (s === 'processing') return t('processing');
    if (s === 'done') return t('done');
    if (s === 'error') return t('error');
    return '';
  })();

  return (
    <section className="card upload-card">
      <div className="card-header">
        <div className="card-header-icon">🎙️</div>
        <div>
          <h2 className="card-title">{t('newLecture')}</h2>
          <p className="card-subtitle">{t('fileHint')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        {/* Drop zone */}
        <div
          className={`drop-zone ${dragging ? 'drop-zone-active' : ''} ${file ? 'drop-zone-has-file' : ''}`}
          onDragEnter={e => { e.preventDefault(); setDragging(true); }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileRef.current?.click()}
          role="button"
          tabIndex={file ? -1 : 0}
          onKeyDown={e => e.key === 'Enter' && !file && fileRef.current?.click()}
          aria-label={t('selectFile')}
        >
          <input
            ref={fileRef} type="file" id="file-input" className="sr-only"
            accept="audio/*,.opus,.mp3,.m4a,.wav,.ogg,.mp4"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {file ? (
            <div className="file-info">
              <div className="file-info-icon">🎵</div>
              <div className="file-info-text">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{(file.size / 1048576).toFixed(1)} MB</div>
              </div>
              <button
                type="button" className="file-remove"
                onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                aria-label="Remove file"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ) : (
            <div className="drop-zone-empty">
              <div className="drop-zone-icon">{dragging ? '📂' : '📁'}</div>
              <div className="drop-zone-label">{dragging ? t('dropHere') : t('selectFile')}</div>
              <div className="drop-zone-hint">Click or drag & drop</div>
            </div>
          )}
        </div>

        {/* Language Select */}
        {file && (
          <div className="lang-select-group">
            <LabelPrimitive.Root htmlFor="lecture-lang" className="input-label">
              {t('langInLecture')}
            </LabelPrimitive.Root>
            <SelectPrimitive.Root value={lectureLang} onValueChange={(v) => setLectureLang(v as LangCode)}>
              <SelectPrimitive.Trigger id="lecture-lang" className="select-trigger" aria-label={t('langInLecture')}>
                <SelectPrimitive.Value />
                <SelectPrimitive.Icon className="select-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </SelectPrimitive.Icon>
              </SelectPrimitive.Trigger>
              <SelectPrimitive.Portal>
                <SelectPrimitive.Content className="select-content" position="popper" sideOffset={4}>
                  <SelectPrimitive.Viewport className="select-viewport">
                    {LANG_OPTIONS.map(opt => (
                      <SelectPrimitive.Item key={opt.value} value={opt.value} className="select-item">
                        <SelectPrimitive.ItemText>{t(opt.labelKey as any)}</SelectPrimitive.ItemText>
                        <SelectPrimitive.ItemIndicator className="select-indicator">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </SelectPrimitive.ItemIndicator>
                      </SelectPrimitive.Item>
                    ))}
                  </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
              </SelectPrimitive.Portal>
            </SelectPrimitive.Root>
          </div>
        )}

        {/* Upload button */}
        <Button
          type="submit" size="lg" loading={uploading}
          disabled={!file || uploading}
          className="w-full"
          icon={!uploading ? <span>⬆️</span> : undefined}
        >
          {uploading ? statusLabel || t('uploading') : t('uploadBtn')}
        </Button>

        {/* Progress */}
        {uploading && uploadProgress.pct > 0 && (
          <Progress value={uploadProgress.pct} label={statusLabel} className="mt-3" />
        )}
        {!uploading && uploadProgress.pct === 100 && (
          <div className="upload-done-banner">
            <span>✓</span> {t('done')}
          </div>
        )}
      </form>
    </section>
  );
}
