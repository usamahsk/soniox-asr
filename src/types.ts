export interface Job {
  id: string;
  user_id: string;
  audio_path: string;
  file_name: string | null;
  soniox_id: string | null;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  transcript_text: string | null;
  error: string | null;
  created_at: string;
}

export type AppLang = 'ur' | 'en';
export type LangCode = 'ur-ar' | 'ur' | 'ar' | 'hi' | 'gu' | 'multi';

declare global {
  interface Window {
    APP_CONFIG: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
      TRANSCRIBE_FN: string;
      STATUS_FN: string;
      BALANCE_FN: string;
      TRANSLIT_FN: string;
      LLM_API_BASE: string;
      LLM_MODEL: string;
    };
  }
}
