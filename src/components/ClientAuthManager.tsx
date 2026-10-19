import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { User } from '../types';
import { fetchUserProfileByEmail, loginWithApi } from '../api';
import { Shield, Wine, UserCheck } from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot' | 'magic';

interface ClientAuthManagerProps {
  onLoginSuccess: (user?: User) => void;
  onClose?: () => void;
  initialView?: AuthView;
}

export function ClientAuthManager({ onLoginSuccess, onClose, initialView = 'login' }: ClientAuthManagerProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const [googleOAuthUrl, setGoogleOAuthUrl] = useState<string | null>(null);

  // Limpiar mensajes al cambiar de vista
  const switchView = (newView: AuthView) => {
    setView(newView);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Helper para recuperar perfil de public.users tras login
  const fetchAndSaveUserProfile = async (userEmail: string) => {
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      // 1. Intentar API local
      try {
        const localUser = await fetchUserProfileByEmail(cleanEmail);
        if (localUser) {
          localStorage.setItem('fidelityful_active_user', JSON.stringify(localUser));
          onLoginSuccess(localUser);
          return localUser;
        }
      } catch (_e) {
        // Fallback a Supabase
      }

      // 2. Intentar Supabase public.users
      const { data: sbUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (sbUser) {
        localStorage.setItem('fidelityful_active_user', JSON.stringify(sbUser));
        onLoginSuccess(sbUser);
        return sbUser;
      }
    } catch (_err) {
      console.warn('Error fetching user profile:', _err);
    }
    onLoginSuccess();
  };

  // 1. Manejo de Login y Registro con Email/Password
  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (view === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          // Intentar fallback con API backend
          try {
            const apiRes = await loginWithApi(email, password);
            if (apiRes.user) {
              localStorage.setItem('fidelityful_active_user', JSON.stringify(apiRes.user));
              onLoginSuccess(apiRes.user);
              return;
            }
          } catch (_fallbackErr) {
            throw error;
          }
        }

        if (data?.user?.email) {
          await fetchAndSaveUserProfile(data.user.email);
        } else {
          onLoginSuccess();
        }
      } else if (view === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }

        const cleanEmail = email.trim().toLowerCase();
        const userName = name.trim() || cleanEmail.split('@')[0];
        const generatedUid = `USR-CLI-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName)}`;

        // Registro en Supabase Auth
        const { data: authData, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: userName,
              phone: phone ? phone.trim() : null,
              uid: generatedUid,
              role: 'client',
            },
          },
        });
        if (error) throw error;

        // Inserción en public.users con bono de bienvenida de 100 puntos
        const { data: insertedUser } = await supabase
          .from('users')
          .upsert(
            {
              uid: generatedUid,
              name: userName,
              email: cleanEmail,
              phone: phone ? phone.trim() : null,
              points: 100,
              total_spent: 0,
              total_visits: 0,
              level: 'Bronce',
              role: 'client',
              avatar_url: avatarUrl,
            },
            { onConflict: 'email' }
          )
          .select()
          .maybeSingle();

        setSuccessMsg('¡Cuenta creada con éxito! Se han acreditado +100 puntos de bienvenida. Ya puedes iniciar sesión.');
        
        // Auto-login si la sesión quedó activa
        if (authData.session && insertedUser) {
          localStorage.setItem('fidelityful_active_user', JSON.stringify(insertedUser));
          setTimeout(() => {
            onLoginSuccess(insertedUser);
          }, 800);
        } else {
          setView('login');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error en la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Acceso por Magic Link (Sin contraseña)
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setSuccessMsg('¡Enlace mágico enviado! Revisa tu bandeja de entrada y haz clic en el enlace para entrar sin contraseña.');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo enviar el enlace mágico.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Inicio de Sesión con Google OAuth
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isIframe,
        },
      });

      if (error) throw error;

      if (isIframe && data?.url) {
        setGoogleOAuthUrl(data.url);
        setShowGoogleModal(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con Google.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Recuperación de Contraseña
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccessMsg('Hemos enviado las instrucciones para restablecer tu contraseña a tu correo electrónico.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  // Acceso rápido demo con 1 clic para testing
  const handleQuickDemo = async (demoEmail: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const cleanEmail = demoEmail.trim().toLowerCase();
      const passwords = ['FulanoPass2024!', 'FulanoPassword2024!'];
      let loggedInUser: any = null;

      // 1. Intentar con Supabase Auth primero
      for (const pass of passwords) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: pass,
          });
          if (!error && data?.user?.email) {
            loggedInUser = await fetchAndSaveUserProfile(data.user.email);
            if (loggedInUser) break;
          }
        } catch (_e) {}
      }

      // 2. Si no, intentar con API backend
      if (!loggedInUser) {
        for (const pass of passwords) {
          try {
            const res = await loginWithApi(cleanEmail, pass);
            if (res?.user) {
              localStorage.setItem('fidelityful_active_user', JSON.stringify(res.user));
              onLoginSuccess(res.user);
              loggedInUser = res.user;
              break;
            }
          } catch (_e) {}
        }
      }

      // 3. Fallback directo buscando el perfil
      if (!loggedInUser) {
        loggedInUser = await fetchAndSaveUserProfile(cleanEmail);
      }

      if (!loggedInUser) {
        throw new Error('No se pudo iniciar sesión con la cuenta de prueba.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al entrar en cuenta demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl border border-amber-100 text-stone-900 relative">
      {/* Botón de Cerrar si se abre en modal */}
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          title="Cerrar"
        >
          ✕
        </button>
      )}

      {/* Cabecera */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-black text-xl mx-auto mb-2 shadow-inner">
          F
        </div>
        <h2 className="text-2xl font-black text-amber-900 tracking-tight">
          Fulano Resto Bar
        </h2>
        <p className="text-xs text-amber-700/80 font-medium uppercase tracking-wider">
          Paseo Imperial 35 · Madrid
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {view === 'login' && 'Inicia sesión en tu billetera de puntos'}
          {view === 'register' && 'Regístrate y comienza a ganar recompensas (+100 pts)'}
          {view === 'magic' && 'Entra al instante sin recordar contraseñas'}
          {view === 'forgot' && 'Recupera el acceso a tu cuenta'}
        </p>
      </div>

      {/* Alertas de Error y Éxito */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
          {successMsg}
        </div>
      )}

      {/* Formulario Principal (Login / Registro) */}
      {(view === 'login' || view === 'register') && (
        <form onSubmit={handleEmailPassword} className="space-y-3.5">
          {view === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Mariano Mereb"
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Teléfono Móvil</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-gray-500 uppercase">Contraseña</label>
              {view === 'login' && (
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-xs text-amber-600 hover:underline font-semibold cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900"
              required
            />
          </div>

          {view === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Confirmar Contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-900/20 transition duration-200 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? 'Procesando en Supabase...' : view === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta Gratis (+100 pts)'}
          </button>
        </form>
      )}

      {/* Formulario Magic Link */}
      {view === 'magic' && (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Tu Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm rounded-xl shadow-lg transition duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Enviando enlace...' : 'Enviar Enlace Mágico'}
          </button>
        </form>
      )}

      {/* Formulario Recuperar Contraseña */}
      {view === 'forgot' && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Correo Electrónico de la Cuenta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-stone-900"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm rounded-xl shadow-lg transition duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Enviando instrucciones...' : 'Restablecer Contraseña'}
          </button>
        </form>
      )}

      {/* Proveedores Externos (Google OAuth & Magic Link) */}
      {(view === 'login' || view === 'register') && (
        <>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-medium">o continúa con</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center py-2.5 px-4 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => switchView('magic')}
              className="flex items-center justify-center py-2.5 px-4 border border-amber-200 bg-amber-50/50 hover:bg-amber-50 rounded-xl text-xs font-bold text-amber-900 transition cursor-pointer"
            >
              ✨ Enlace Mágico
            </button>
          </div>
        </>
      )}

      {/* Modal para completar inicio de sesión con Google en ventana independiente si está en iframe */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-100 text-stone-900 relative space-y-4">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base leading-tight">Acceder con Google</h3>
                <span className="text-[11px] text-emerald-700 font-semibold">Autenticación Segura Supabase</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-950 space-y-2 leading-relaxed">
              <p>
                Para proteger tus credenciales, Google requiere abrir la pantalla de consentimiento en una ventana completa.
              </p>
              <p className="text-[11px] text-amber-800">
                Haz clic en el botón a continuación para autorizar tu cuenta con Google. Al terminar, tu sesión se iniciará automáticamente.
              </p>
            </div>

            {/* Supabase URL guidance */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600 space-y-1.5">
              <p className="font-bold text-stone-800 flex items-center gap-1">
                <span>⚙️ Para que vuelva a la app en lugar de localhost:</span>
              </p>
              <p className="text-[10px] leading-tight text-stone-500">
                En tu consola de Supabase (<strong>Authentication &gt; URL Configuration</strong>), pon la URL de tu app en <strong>Site URL</strong> y en <strong>Redirect URLs</strong>:
              </p>
              <code className="block p-1.5 bg-stone-900 text-amber-300 font-mono text-[10px] rounded break-all select-all">
                {typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-wrphcwscpzbtm55sfxocib-155619916328.europe-west2.run.app'}
              </code>
            </div>

            <div className="space-y-2 pt-1">
              {googleOAuthUrl && (
                <a
                  href={googleOAuthUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowGoogleModal(false)}
                  className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  </svg>
                  <span>Abrir Ventana de Google</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowGoogleModal(false);
                  switchView('magic');
                }}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-stone-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                O usar Enlace Mágico por Correo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accesos Rápidos de Prueba (Demo Testing) */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider text-center mb-2">
          Acceso rápido para pruebas de sala:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
          <button
            type="button"
            onClick={() => handleQuickDemo('admin@fulano.com')}
            className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-amber-900 transition cursor-pointer"
          >
            🛡️ Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('staff@fulano.com')}
            className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-cyan-900 transition cursor-pointer"
          >
            🍸 Mozo
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('mateo@ejemplo.com')}
            className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 transition cursor-pointer"
          >
            🥈 Mateo (1.420 pts)
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('mariano.mereb@fulano.com')}
            className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg text-[10px] font-bold text-amber-900 transition cursor-pointer"
          >
            ⭐ Mariano (2.596 pts)
          </button>
        </div>
      </div>

      {/* Navegación Inferior entre vistas */}
      <div className="mt-5 text-center space-y-2">
        {view === 'login' && (
          <p className="text-xs text-gray-500">
            ¿No tienes una cuenta?{' '}
            <button
              type="button"
              onClick={() => switchView('register')}
              className="text-amber-700 font-bold hover:underline cursor-pointer"
            >
              Regístrate aquí (+100 pts)
            </button>
          </p>
        )}

        {(view === 'register' || view === 'magic' || view === 'forgot') && (
          <p className="text-xs text-gray-500">
            ¿Ya tienes cuenta o prefieres volver?{' '}
            <button
              type="button"
              onClick={() => switchView('login')}
              className="text-amber-700 font-bold hover:underline cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
