import React, { useEffect, useState, useCallback, useRef } from 'react';
import { sb } from '../supabase';
import { Spinner } from './ui/Spinner';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioPath: string;
  fileName?: string;
}

const SPEEDS = [1, 1.25, 1.5, 2];

function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return (h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + ':' + String(sec).padStart(2, '0');
}

export function AudioPlayer({ audioPath, fileName }: AudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchSignedUrl = useCallback(async () => {
    if (!audioPath) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await sb.storage.from('lectures').createSignedUrl(audioPath, 60 * 60);
      if (error) throw error;
      setAudioUrl(data.signedUrl);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load audio');
    } finally {
      setLoading(false);
    }
  }, [audioPath]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  const audio = audioRef.current;

  useEffect(() => {
    if (audio) audio.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx, audio]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const seek = (v: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = v;
    setTime(v);
  };

  const cycleSpeed = () => setSpeedIdx(i => (i + 1) % SPEEDS.length);

  if (!audioUrl && !loading) return null;

  return (
    <div className="audio-player" dir="ltr">
      {loading ? (
        <div className="audio-loading">
          <Spinner size="sm" className="audio-spinner" />
          <span>Loading audio…</span>
        </div>
      ) : error ? (
        <div className="audio-error">{error}</div>
      ) : (
        <>
          <div className="audio-top">
            <button
              className="audio-play-btn"
              onClick={toggle}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={17} strokeWidth={2.4} /> : <Play size={17} strokeWidth={2.4} />}
            </button>
            <div className="audio-title" title={fileName}>{fileName ?? 'Audio'}</div>
            <span className="audio-time">{fmtTime(time)} / {dur ? fmtTime(dur) : '--:--'}</span>
            <button className="audio-speed-btn" onClick={cycleSpeed} title="Playback speed">
              {SPEEDS[speedIdx]}×
            </button>
          </div>
          <input
            type="range"
            className="audio-seek"
            min={0}
            max={dur || 0}
            step={0.1}
            value={time}
            disabled={!dur}
            onChange={e => seek(parseFloat(e.target.value))}
            aria-label="Seek"
          />
          <audio
            ref={audioRef}
            src={audioUrl ?? undefined}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); }}
            onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={e => setDur(e.currentTarget.duration)}
            style={{ display: 'none' }}
          />
        </>
      )}
    </div>
  );
}
