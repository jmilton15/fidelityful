import React, { useState } from 'react';
import { User } from '../types';
import { MobileAppModal } from './MobileAppModal';
import { formatPoints } from '../utils/format';
import {
  Wine,
  UserCheck,
  ShieldCheck,
  Plus,
  Sparkles,
  LogIn,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Crown,
  Shield,
  Smartphone,
} from 'lucide-react';

interface HeaderProps {
  currentRole: 'client' | 'staff' | 'admin';
  onChangeRole: (role: 'client' | 'staff' | 'admin') => void;
  currentUser: User | null;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onOpenNewUserModal: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onLogout?: () => void;
  onOpenAiAssistant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onChangeRole,
  currentUser,
  allUsers,
  onSelectUser,
  onOpenNewUserModal,
  onOpenAuthModal,
  onLogout,
  onOpenAiAssistant,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const clientUsers = allUsers.filter((u) => u.role === 'client');

  return (
    <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* ZONE 1: Brand & Venue */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/20 font-black text-base sm:text-lg">
              F
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Fidelity<span className="text-amber-400">Ful</span>
                </span>
                <span className="hidden md:inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-500/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Fulano Resto Bar · Madrid
                </span>
              </div>
            </div>
          </div>

          {/* ZONE 2: Role Switcher (Compact & Responsive) */}
          <nav className="flex items-center p-0.5 sm:p-1 bg-stone-900 border border-stone-800 rounded-xl">
            <button
              onClick={() => onChangeRole('client')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentRole === 'client'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Cliente</span>
            </button>

            <button
              onClick={() => onChangeRole('staff')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentRole === 'staff'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Wine className="w-3.5 h-3.5 shrink-0" />
              <span>TPV</span>
            </button>

            <button
              onClick={() => onChangeRole('admin')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentRole === 'admin'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Admin</span>
            </button>
          </nav>

          {/* ZONE 3: Auth & Client Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Botón destacado para abrir en móvil / ver QR */}
            <button
              onClick={() => setIsMobileModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xl transition-all cursor-pointer shadow-sm shadow-amber-500/10"
              title="Abrir en el teléfono móvil o escanear código QR"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="inline font-medium text-[11px] sm:text-xs">Móvil QR 📱</span>
            </button>

            {onOpenAiAssistant && (
              <button
                onClick={onOpenAiAssistant}
                className="flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 text-xs font-semibold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
                title="Abrir Asistente IA Fulano y Cobro BDP"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">IA & Cobro</span>
                <span className="sm:hidden">IA</span>
              </button>
            )}

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 bg-stone-900 hover:bg-stone-850 border border-stone-700/80 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <img
                    src={currentUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.name}`}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full bg-stone-800"
                  />
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-bold text-white text-[11px] leading-tight truncate max-w-[90px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-amber-400 leading-tight">
                      {currentUser.points} pts · {currentUser.level}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl py-2 z-50 text-xs"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-stone-800/80 mb-1">
                      <p className="font-bold text-white truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-stone-400 truncate">{currentUser.email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {currentUser.points} PUNTOS
                        </span>
                        <span className="text-[10px] text-stone-300 bg-stone-800 px-2 py-0.5 rounded-full">
                          Nivel {currentUser.level}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenAuthModal('login')}
                      className="w-full text-left px-3.5 py-1.5 text-stone-300 hover:text-white hover:bg-stone-800/80 flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Iniciar Sesión / Cambiar Cuenta</span>
                    </button>

                    <button
                      onClick={() => onOpenAuthModal('register')}
                      className="w-full text-left px-3.5 py-1.5 text-stone-300 hover:text-white hover:bg-stone-800/80 flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Registrar Nuevo Socio</span>
                    </button>

                    {/* Selector de socios de Supabase para pruebas */}
                    {clientUsers.length > 0 && (
                      <div className="pt-2 pb-1 px-3 border-t border-stone-800/80 mt-1">
                        <p className="text-[9px] uppercase font-bold text-stone-400 mb-1.5 tracking-wider">
                          Cambiar a Socio Registrado ({clientUsers.length}):
                        </p>
                        <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
                          {clientUsers.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                onSelectUser(u);
                                localStorage.setItem('fidelityful_active_user', JSON.stringify(u));
                                setIsUserMenuOpen(false);
                              }}
                              className={`w-full text-left px-2 py-1 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                                currentUser.id === u.id
                                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                              }`}
                            >
                              <span className="truncate max-w-[130px]">{u.name}</span>
                              <span className="text-[10px] text-amber-400 font-mono shrink-0 ml-1">
                                {formatPoints(u.points)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {onLogout && (
                      <div className="pt-1 border-t border-stone-800/80 mt-1">
                        <button
                          onClick={onLogout}
                          className="w-full text-left px-3.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* No user logged in: direct Auth CTA */
              <button
                onClick={() => onOpenAuthModal('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Acceder</span>
              </button>
            )}

            {/* Quick socio switcher for demo testing */}
            {currentRole === 'client' && (
              <div className="hidden lg:flex items-center">
                <select
                  value={currentUser?.id || ''}
                  onChange={(e) => {
                    const found = allUsers.find((u) => u.id === Number(e.target.value));
                    if (found) onSelectUser(found);
                  }}
                  className="bg-stone-900 border border-stone-800 text-stone-300 text-[11px] rounded-lg px-2 py-1 max-w-[130px] truncate focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  title="Cambio rápido de socio para pruebas"
                >
                  {clientUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.points} pts)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal con QR y enlace para el móvil */}
      <MobileAppModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
      />
    </header>
  );
};
