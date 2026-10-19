import React, { useState, useEffect } from 'react';
import { User, SystemConfig, BdpOrder } from './types';
import { fetchConfig, fetchUsers, syncOAuthUserApi } from './api';
import { Header } from './components/Header';
import { ClientView } from './components/ClientView';
import { StaffPosView } from './components/StaffPosView';
import { AdminView } from './components/AdminView';
import { NewUserModal } from './components/NewUserModal';
import { AuthModal } from './components/AuthModal';
import { ClientAuthManager } from './components/ClientAuthManager';
import { BdpPaymentModal } from './components/BdpPaymentModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { Wine, AlertCircle, RefreshCw, Sparkles, CheckCircle2, LogIn, UserPlus } from 'lucide-react';
import { supabase, getCurrentSupabaseSession, signOutUser } from '../utils/supabase/client';

export default function App() {
  const [currentRole, setCurrentRole] = useState<'client' | 'staff' | 'admin'>('client');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

  // Authentication Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // BDP Payment & AI Assistant state
  const [activeBdpOrder, setActiveBdpOrder] = useState<BdpOrder | null>(null);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  useEffect(() => {
    initApp();

    // Escuchar eventos de autenticación de Supabase (Google OAuth, Magic Link, Email/Password)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        try {
          const authUser = session.user;
          const email = authUser.email;
          if (email) {
            const meta = authUser.user_metadata || {};
            const name = meta.name || meta.full_name || email.split('@')[0];
            const avatarUrl = meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

            const syncRes = await syncOAuthUserApi({
              email,
              name,
              avatar_url: avatarUrl,
              phone: meta.phone || authUser.phone || undefined,
            });

            if (syncRes.user) {
              setCurrentUser(syncRes.user);
              if (syncRes.user.role) {
                setCurrentRole(syncRes.user.role);
              }
              localStorage.setItem('fidelityful_active_user', JSON.stringify(syncRes.user));

              // Refrescar lista general de usuarios para incluirlo en todas las vistas
              const updatedUsers = await fetchUsers();
              setAllUsers(updatedUsers);
            }
          }

          // Limpiar parámetros OAuth de la barra de direcciones del navegador
          if (
            typeof window !== 'undefined' &&
            (window.location.hash.includes('access_token') || window.location.search.includes('code='))
          ) {
            window.history.replaceState(null, document.title, window.location.pathname);
          }

          setIsAuthModalOpen(false);
        } catch (syncErr) {
          console.warn('Error sincronizando usuario autenticado:', syncErr);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function initApp() {
    setLoading(true);
    setError(null);
    try {
      const [cfg, users] = await Promise.all([fetchConfig(), fetchUsers()]);
      setConfig(cfg);
      setAllUsers(users);

      // 1. Comprobar si hay una sesión activa de Supabase Auth
      let sessionUser: User | null = null;
      try {
        const activeSbSession = await getCurrentSupabaseSession();
        if (activeSbSession?.user?.email) {
          const activeEmail = activeSbSession.user.email.toLowerCase();
          const foundInUsers = users.find((u) => u.email.toLowerCase() === activeEmail);
          if (foundInUsers) {
            sessionUser = foundInUsers;
          } else {
            const syncRes = await syncOAuthUserApi({
              email: activeEmail,
              name: activeSbSession.user.user_metadata?.name || activeSbSession.user.user_metadata?.full_name,
              avatar_url: activeSbSession.user.user_metadata?.avatar_url || activeSbSession.user.user_metadata?.picture,
            });
            if (syncRes.user) {
              sessionUser = syncRes.user;
              users.unshift(syncRes.user);
              setAllUsers([...users]);
            }
          }
        }
      } catch (_sbErr) {
        // Fallback a localStorage
      }

      // 2. Si no hay sesión Supabase, comprobar usuario guardado en localStorage
      if (!sessionUser) {
        const savedUserStr = localStorage.getItem('fidelityful_active_user');
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            const found = users.find((u) => u.email.toLowerCase() === parsed.email.toLowerCase() || u.id === parsed.id);
            if (found) {
              sessionUser = found;
            } else {
              sessionUser = parsed;
            }
          } catch (_e) {
            // ignore parsing error
          }
        }
      }

      if (sessionUser) {
        setCurrentUser(sessionUser);
        if (sessionUser.role) {
          setCurrentRole(sessionUser.role);
        }
        localStorage.setItem('fidelityful_active_user', JSON.stringify(sessionUser));
      } else {
        // Default to Mateo García for quick demo showcase
        const clients = users.filter((u) => u.role === 'client');
        if (clients.length > 0) {
          const defaultClient = clients.find((c) => c.name.includes('Mateo')) || clients[0];
          setCurrentUser(defaultClient);
        }
      }
    } catch (err: any) {
      console.error('Initialization error:', err);
      setError(err.message || 'Error al conectar con el backend de Fulano Restobar');
    } finally {
      setLoading(false);
    }
  }

  const handleRefreshAll = async () => {
    try {
      const [cfg, users] = await Promise.all([fetchConfig(), fetchUsers()]);
      setConfig(cfg);
      setAllUsers(users);
      if (currentUser) {
        const updated = users.find((u) => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (updated) {
          setCurrentUser(updated);
          localStorage.setItem('fidelityful_active_user', JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error('Refresh error:', err);
    }
  };

  const handleUserCreated = (newUser: User) => {
    setAllUsers((prev) => [newUser, ...prev]);
    setCurrentUser(newUser);
    setCurrentRole('client');
    localStorage.setItem('fidelityful_active_user', JSON.stringify(newUser));
  };

  const handleAuthSuccess = (user: User, role?: 'client' | 'staff' | 'admin') => {
    setCurrentUser(user);
    if (role) {
      setCurrentRole(role);
    } else if (user.role) {
      setCurrentRole(user.role);
    }
    // Update users list if this is a newly registered user
    setAllUsers((prev) => {
      const exists = prev.some((u) => u.email.toLowerCase() === user.email.toLowerCase());
      if (exists) {
        return prev.map((u) => (u.email.toLowerCase() === user.email.toLowerCase() ? user : u));
      }
      return [user, ...prev];
    });
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (_e) {
      // ignore
    }
    localStorage.removeItem('fidelityful_active_user');
    // Deslogueo completo: redirige a pantalla de bienvenida / login (Modo Bar seguro)
    setCurrentUser(null);
    setCurrentRole('client');
  };

  if (loading && !config) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-2xl shadow-amber-500/20 font-bold text-3xl animate-pulse">
          F
        </div>
        <h2 className="font-display font-bold text-white text-xl mt-4">FidelityFul</h2>
        <p className="text-xs text-stone-400 mt-1">Conectando con Fulano Restobar Madrid...</p>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-display font-bold text-white text-lg mt-3">Error de Conexión</h2>
        <p className="text-xs text-stone-400 mt-1 max-w-sm">{error}</p>
        <button
          onClick={initApp}
          className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
      
      {/* Top Header */}
      <Header
        currentRole={currentRole}
        onChangeRole={(role) => setCurrentRole(role)}
        currentUser={currentUser}
        allUsers={allUsers}
        onSelectUser={(u) => {
          setCurrentUser(u);
          localStorage.setItem('fidelityful_active_user', JSON.stringify(u));
        }}
        onOpenNewUserModal={() => setIsNewUserModalOpen(true)}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode || 'login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Active Role Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-stone-900/60 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {currentRole === 'client' && '👤'}
              {currentRole === 'staff' && '🍸'}
              {currentRole === 'admin' && '🛡️'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">
                  {currentRole === 'client' && `Panel de Cliente: ${currentUser?.name || 'Cliente'}`}
                  {currentRole === 'staff' && 'TPV de Barra & Personal de Sala'}
                  {currentRole === 'admin' && 'Panel de Administración & Control Económico'}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {currentRole === 'client' ? `Nivel ${currentUser?.level || 'Bronce'}` : currentRole.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {currentRole === 'client' &&
                  'Consulta tus puntos acumulados, recompensas, bono de cumpleaños y pase QR para barra.'}
                {currentRole === 'staff' &&
                  'Registra consumos en mesa o barra, aplica multiplicadores por categoría y valida canjes.'}
                {currentRole === 'admin' &&
                  'Supervisa métricas de facturación, pasarela BDP, auditoría de puntos y reglas de fidelidad.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <button
              onClick={() => setIsAiAssistantOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-3 py-1.5 rounded-full shadow-sm shadow-amber-500/20 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Asistente IA & BDP</span>
            </button>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1.5 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Supabase Cloud Conectado
            </span>
          </div>
        </div>

        {/* ROLE 1: CLIENT DASHBOARD */}
        {currentRole === 'client' && config && (
          currentUser ? (
            <ClientView
              user={currentUser}
              currentUser={currentUser}
              config={config}
              onRefreshUser={handleRefreshAll}
              onOpenPaymentModal={(order) => setActiveBdpOrder(order)}
              onOpenAuth={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              onLogout={handleLogout}
            />
          ) : (
            <div className="py-6">
              <ClientAuthManager
                onLoginSuccess={(user) => {
                  if (user) handleAuthSuccess(user, user.role);
                  else handleRefreshAll();
                }}
              />
            </div>
          )
        )}

        {/* ROLE 2: STAFF / WAITER POS */}
        {currentRole === 'staff' && config && (
          <StaffPosView
            allUsers={allUsers}
            config={config}
            onRefreshAll={handleRefreshAll}
            onOpenBdpPaymentModal={(order: BdpOrder) => setActiveBdpOrder(order)}
          />
        )}

        {/* ROLE 3: ADMIN & OWNER */}
        {currentRole === 'admin' && config && (
          <AdminView
            config={config}
            onRefreshConfig={handleRefreshAll}
            onRefreshAll={handleRefreshAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-stone-300">Fulano Restobar</span>
            <span>·</span>
            <span>Paseo Imperial 35, Madrid</span>
          </div>
          <p className="text-[11px] text-stone-400">
            FidelityFul · Supabase Auth & Cloud Database + Pasarela BDP
          </p>
        </div>
      </footer>

      {/* Auth Modal (Login & Register con Supabase) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
        currentUser={currentUser}
      />

      {/* New Client Modal (Quick creation) */}
      <NewUserModal
        isOpen={isNewUserModalOpen}
        onClose={() => setIsNewUserModalOpen(false)}
        onUserCreated={handleUserCreated}
      />

      {/* AI Assistant Modal (Gemini 3.8 Flash + BDP) */}
      {isAiAssistantOpen && (
        <AiAssistantModal
          currentUser={currentUser}
          onClose={() => setIsAiAssistantOpen(false)}
          onRefreshUser={handleRefreshAll}
          onOpenPaymentModal={(order) => {
            setIsAiAssistantOpen(false);
            setActiveBdpOrder(order);
          }}
        />
      )}

      {/* BDP Payment Gateway Modal */}
      {activeBdpOrder && (
        <BdpPaymentModal
          order={activeBdpOrder}
          currentUser={currentUser}
          onClose={() => setActiveBdpOrder(null)}
          onPaymentSuccess={() => {
            handleRefreshAll();
          }}
        />
      )}
    </div>
  );
}
