import { createServerClient } from './server.ts';

/**
 * Middleware helper para autenticación y actualización de sesiones con Supabase.
 * Para Next.js middleware.ts o Express middleware.
 */
export async function updateSession(req?: any) {
  const supabase = createServerClient();
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return { supabase, session };
  } catch (error) {
    return { supabase, session: null, error };
  }
}
