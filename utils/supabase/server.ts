import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)) ||
  'https://rwgcstupksblybgmpuse.supabase.co';

const supabaseKey =
  (typeof process !== 'undefined' &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3Z2NzdHVwa3NibHliZ21wdXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcxMDQyMSwiZXhwIjoyMTA3Mjg2NDIxfQ.1vlnnqKKjDAg5cS4B2D3bapLO5a5tQGDDTLqCBYhWEs';

/**
 * Supabase client configurado para operaciones en el servidor (Node.js / Next.js Server Components / API Routes).
 * Utiliza la Service Role Key para operaciones administrativas o acceso completo de base de datos de Fulano Resto Bar.
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabaseServer = createServerClient();
