import { createClient } from '@supabase/supabase-js';

const C = window.APP_CONFIG;
export const sb = createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
export const config = C;
