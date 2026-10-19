import { createClient } from '@supabase/supabase-js';

// Compatible tanto con Next.js (process.env.NEXT_PUBLIC_*) como con Vite (import.meta.env.VITE_*)
const getEnvVar = (name: string, fallback: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
      // @ts-ignore
      return import.meta.env[name];
    }
  } catch (_e) {
    // ignore
  }
  return fallback;
};

const supabaseUrl =
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL', '') ||
  getEnvVar('VITE_SUPABASE_URL', '') ||
  'https://rwgcstupksblybgmpuse.supabase.co';

const supabaseAnonKey =
  getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', '') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '') ||
  getEnvVar('VITE_SUPABASE_ANON_KEY', '') ||
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', '') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3Z2NzdHVwa3NibHliZ21wdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTA0MjEsImV4cCI6MjEwNzI4NjQyMX0.yDYTwBV35G_lj7v4wmlcXmCKBNSSoi4xQQ9sfjXyAGU';

/**
 * Cliente Supabase oficial para navegador / cliente (Next.js Client Components o Vite React SPA)
 */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createBrowserClient();

export interface SignUpUserData {
  email: string;
  password?: string;
  name: string;
  phone?: string;
  birthday?: string;
  role?: 'client' | 'staff' | 'admin';
}

/**
 * Registra un nuevo usuario en Supabase Auth y garantiza su inserción inmediata
 * en la tabla personalizada public.users de FidelityFul.
 */
export async function signUpUserWithProfile(data: SignUpUserData) {
  const { email, password = 'FulanoPassword2024!', name, phone, birthday, role = 'client' } = data;

  // 1. Registro en el sistema de autenticación (auth.users)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
        birthday,
        role,
      },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  // 2. Inserción explícita en la tabla public.users de FidelityFul
  const generatedUid = `USR-CLI-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

  const { data: publicUser, error: dbError } = await supabase
    .from('users')
    .upsert(
      {
        uid: generatedUid,
        name,
        email,
        phone: phone || null,
        birthday: birthday || null,
        points: 0,
        total_spent: 0,
        total_visits: 0,
        level: 'Bronce',
        role,
        avatar_url: avatarUrl,
      },
      { onConflict: 'email' }
    )
    .select()
    .single();

  if (dbError) {
    console.warn('Advertencia al insertar en public.users:', dbError.message);
  }

  return {
    authUser: authData.user,
    publicUser,
    session: authData.session,
  };
}

/**
 * Iniciar sesión con email y contraseña en Supabase Auth
 */
export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Iniciar sesión con Enlace Mágico (Magic Link) sin necesidad de recordar contraseña
 */
export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Iniciar sesión con Google OAuth
 */
export async function signInWithGoogleOAuth(options?: { redirectTo?: string; skipBrowserRedirect?: boolean }) {
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const redirectTarget = options?.redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTarget,
      skipBrowserRedirect: options?.skipBrowserRedirect ?? isIframe,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Cerrar sesión en Supabase Auth
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Obtener la sesión actual de Supabase
 */
export async function getCurrentSupabaseSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('Error fetching Supabase session:', error.message);
    return null;
  }
  return data.session;
}

/**
 * Obtener el perfil del usuario desde public.users a partir de su email
 */
export async function getPublicUserProfile(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (error) return null;
  return data;
}

