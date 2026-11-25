import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || rawAnonKey;

// Sanitização estrita: remove espaços, aspas e quebras de linha acidentais
const supabaseUrl = rawUrl.trim().replace(/['"]/g, '');
const supabaseAnonKey = rawAnonKey.trim().replace(/['"]/g, '');
const supabaseServiceKey = rawServiceKey.trim().replace(/['"]/g, '');

// Cliente público para Browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo com privilégio elevado para Webhooks e Server Actions
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== '' &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  );
};
