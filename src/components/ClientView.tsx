import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Reward, UserDetailsResponse, SystemConfig } from '../types';
import { fetchUserDetails, fetchRewards, redeemReward, claimBirthdayBonus, saveUserBirthday } from '../api';
import confetti from 'canvas-confetti';
import { ClientQR } from './ClientQR';
import { useMilestones } from '../hooks/useMilestones';
import { MilestoneBanner } from './MilestoneBanner';
import { formatCurrency, formatPoints } from '../utils/format';
import {
  Award,
  Sparkles,
  QrCode,
  History,
  Gift,
  ChevronRight,
  Cake,
  TrendingUp,
  CheckCircle,
  Copy,
  Clock,
  Wine,
  Utensils,
  AlertCircle,
  Percent,
  CreditCard,
  Bot,
  Camera,
  Receipt,
  ShieldCheck,
  Calendar,
  X,
  LogOut,
} from 'lucide-react';

interface ClientViewProps {
  user?: User;
  currentUser?: User;
  config: SystemConfig;
  onRefreshUser: () => void;
  onOpenAiAssistant?: () => void;
  onOpenPaymentModal?: (order: any) => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const ClientView: React.FC<ClientViewProps> = (props) => {
  const user = props.user || props.currentUser;
  const { config, onRefreshUser, onOpenAiAssistant, onOpenPaymentModal, onOpenAuth, onLogout } = props;
  const [activeTab, setActiveTab] = useState<'puntos' | 'premios' | 'qr' | 'historial' | 'cupones' | 'niveles'>('puntos');
  const [details, setDetails] = useState<UserDetailsResponse | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<Reward | null>(null);
  const [redemptionSuccess, setRedemptionSuccess] = useState<any | null>(null);
  const [birthdayClaiming, setBirthdayClaiming] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isQuickQrModalOpen, setIsQuickQrModalOpen] = useState(false);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
  const [inputBirthday, setInputBirthday] = useState(user?.birthday || '');
  const [savingBirthday, setSavingBirthday] = useState(false);

  // Hook dinámico de alertas de hitos de fidelidad
  const milestone = useMilestones(user?.points || 0, user?.level || 'Bronce');

  useEffect(() => {
    if (user?.id) {
      loadData();
      if (user.birthday) {
        setInputBirthday(user.birthday);
      }
    }
  }, [user?.id, user?.birthday]);

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [uDetails, rList] = await Promise.all([
        fetchUserDetails(user.id),
        fetchRewards(),
      ]);
      setDetails(uDetails);
      setRewards(rList);
    } catch (err) {
      console.error('Error loading client details:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="p-8 text-center bg-stone-900 border border-stone-800 rounded-3xl max-w-md mx-auto space-y-4 my-8">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Wine className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Inicia sesión en Fulano Resto Bar</h3>
        <p className="text-xs text-stone-400">
          Accede a tu billetera de puntos, catálogo de recompensas de coctelería y tarjeta digital QR.
        </p>
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            Iniciar Sesión / Registrarme
          </button>
        )}
      </div>
    );
  }

  const handleRedeem = async (reward: Reward) => {
    try {
      const result = await redeemReward(user.id, reward.id);
      setRedemptionSuccess(result);
      setRedeeming(null);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onRefreshUser();
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error al canjear' });
    }
  };

  const handleBirthdayClaim = async () => {
    setBirthdayClaiming(true);
    setFeedbackMsg(null);
    try {
      const res = await claimBirthdayBonus(user.id);
      confetti({ particleCount: 110, spread: 85, origin: { y: 0.5 } });
      setFeedbackMsg({ type: 'success', text: res.message });
      onRefreshUser();
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error al reclamar bono' });
    } finally {
      setBirthdayClaiming(false);
    }
  };

  const handleSaveBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputBirthday) return;
    setSavingBirthday(true);
    try {
      const res = await saveUserBirthday(user.id, inputBirthday);
      setFeedbackMsg({ type: 'success', text: '¡Fecha de cumpleaños guardada con éxito!' });
      setIsBirthdayModalOpen(false);
      onRefreshUser();
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error al guardar fecha de cumpleaños' });
    } finally {
      setSavingBirthday(false);
    }
  };

  const isBirthdayEligible = () => {
    if (!user.birthday) return false;
    const parts = String(user.birthday).split('-');
    let birthMonth: number = 0;
    let birthDay: number = 1;
    if (parts.length >= 3) {
      birthMonth = parseInt(parts[1], 10) - 1;
      birthDay = parseInt(parts[2], 10);
    } else if (parts.length === 2) {
      birthMonth = parseInt(parts[0], 10) - 1;
      birthDay = parseInt(parts[1], 10);
    } else {
      const parsed = new Date(user.birthday);
      if (!isNaN(parsed.getTime())) {
        birthMonth = parsed.getMonth();
        birthDay = parsed.getDate();
      }
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Misma mes o margen de 7 días (semana de cumpleaños)
    const isSameMonth = birthMonth === currentMonth;
    const thisYearBirthDate = new Date(currentYear, birthMonth, birthDay);
    const dayDiff = Math.abs(Math.round((now.getTime() - thisYearBirthDate.getTime()) / (1000 * 60 * 60 * 24)));
    return isSameMonth || dayDiff <= 7;
  };

  const alreadyClaimedBirthdayThisYear = () => {
    return user.birthday_bonus_year === new Date().getFullYear();
  };

  const getTierGradient = (level: string) => {
    switch (level) {
      case 'VIP':
        return 'from-[#2c0817] via-[#1a050e] to-[#14050b] border-amber-400/50 shadow-amber-500/20';
      case 'Oro':
        return 'from-[#2c1308] via-[#1e0e06] to-[#14080a] border-amber-400/40 shadow-amber-500/20';
      case 'Plata':
        return 'from-[#1c1926] via-[#14101d] to-[#120a14] border-stone-400/40 shadow-stone-500/10';
      default:
        return 'from-[#1c0813] via-[#14060d] to-[#0c0409] border-stone-800 shadow-stone-900/20';
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between border text-xs sm:text-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="underline ml-4 cursor-pointer text-xs">
            Cerrar
          </button>
        </div>
      )}

      {/* SALUDO Y ACCESO RÁPIDO AL QR (MOBILE-FIRST) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-malbec-950 via-[#1e0712] to-charcoal-900 border border-malbec-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-bold text-xl shadow-md shadow-amber-500/20 shrink-0">
            {user.avatar_emoji || '🥩'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold font-display text-white">
                ¡Hola, {user.name.split(' ')[0]}! Tienes <span className="text-amber-400 font-extrabold">{formatPoints(user.points)}</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Nivel {user.level}
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              {user.level === 'VIP'
                ? '¡Eres socio VIP! Multiplicas por 2 tus puntos en cada visita a Fulano.'
                : `Te faltan ${details?.levelDetails?.pointsToNext || 50} pts para tu próximo nivel (${details?.levelDetails?.nextLevel || 'Plata'}).`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setIsQuickQrModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Mostrar Pase QR ⚡</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-stone-900/80 hover:bg-rose-950/60 border border-stone-800 hover:border-rose-500/40 text-stone-400 hover:text-rose-300 transition-all cursor-pointer"
              title="Cerrar sesión de cliente en este dispositivo"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1. ALERTA DE HITOS MOTIVACIONAL (PROGRESO HACIA EL SIGUIENTE NIVEL VIP) */}
      <MilestoneBanner
        milestone={milestone}
        userPoints={user.points}
        userName={user.name}
        onViewPerks={() => setActiveTab('niveles')}
      />

      {/* 2. BONO DE CUMPLEAÑOS AUTOMÁTICO - BANNER ACTIVO */}
      {isBirthdayEligible() && !alreadyClaimedBirthdayThisYear() && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-pink-500/15 to-amber-500/20 border border-amber-400/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-xl shadow-amber-500/10 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center text-stone-950 text-2xl shadow-lg shadow-pink-500/20 shrink-0">
              🎂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-400/40">
                  ¡SEMANA DE CUMPLEAÑOS!
                </span>
                <span className="text-xs text-amber-300 font-bold">+150 Puntos de Regalo</span>
              </div>
              <h3 className="font-display font-bold text-white text-sm sm:text-base mt-0.5">
                ¡Muy feliz cumpleaños, {user.name.split(' ')[0]}!
              </h3>
              <p className="text-xs text-stone-300 mt-0.5">
                Fulano Resto Bar te regala <strong className="text-amber-400">+150 puntos extra</strong> para que brindes con lo mejor de nuestra barra y cocina.
              </p>
            </div>
          </div>
          <button
            onClick={handleBirthdayClaim}
            disabled={birthdayClaiming}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <span>{birthdayClaiming ? 'Acreditando puntos...' : '🎁 Reclamar +150 Pts de Regalo'}</span>
          </button>
        </div>
      )}

      {/* 3. INVITACIÓN A REGISTRAR FECHA DE CUMPLEAÑOS (SI AÚN NO LA TIENE) */}
      {!user.birthday && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
              🎁
            </span>
            <div>
              <h4 className="font-display font-bold text-white text-xs sm:text-sm">
                ¿Cuándo cumplís años?
              </h4>
              <p className="text-[11px] text-stone-400">
                Registrá tu fecha para recibir automáticamente tu bono anual de <strong>150 puntos de regalo</strong> en Fulano.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBirthdayModalOpen(true)}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-stone-800 hover:bg-stone-750 border border-stone-700 hover:border-amber-500/40 text-amber-400 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0"
          >
            Configurar fecha ➔
          </button>
        </div>
      )}

      {/* Sub Navigation Bar - Clean, Horizontal Scroll with Touch */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-900/90 border border-stone-800 rounded-2xl overflow-x-auto scrollbar-none">
        {[
          { id: 'puntos', label: 'Mi Tarjeta', icon: Award },
          { id: 'premios', label: `Canjeá Premios (${rewards.filter((r) => r.active).length})`, icon: Gift },
          { id: 'qr', label: 'Pase QR', icon: QrCode },
          { id: 'historial', label: `Historial (${details?.transactions?.length || 0})`, icon: History },
          { id: 'cupones', label: `Tus Cupones (${details?.coupons?.length || 0})`, icon: Sparkles },
          { id: 'niveles', label: 'Niveles VIP', icon: Percent },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MI SALDO & TARJETA VIP                           */}
      {/* ======================================================== */}
      {activeTab === 'puntos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* DIGITAL VIP LOYALTY CARD (WALLET STYLE) */}
          <div className="lg:col-span-1 space-y-4">
            <div
              className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${getTierGradient(
                user.level
              )} border shadow-2xl flex flex-col justify-between min-h-[220px] text-white`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-extrabold text-base tracking-wider">FULANO</span>
                    <span className="text-[9px] tracking-widest text-amber-400/90 uppercase font-semibold">RESTO BAR</span>
                  </div>
                  <p className="text-[10px] text-stone-400">Madrid · Huertas</p>
                </div>

                <div className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {user.level}
                </div>
              </div>

              {/* Card Chip & Number */}
              <div className="my-3 flex items-center justify-between">
                <div className="w-9 h-6 rounded bg-gradient-to-r from-amber-300 to-amber-400 border border-amber-200/50 shadow-inner flex items-center justify-center">
                  <div className="w-5 h-3 border border-amber-800/40 rounded-sm"></div>
                </div>
                <div className="text-amber-400/70 text-[11px] font-mono">
                  {user.uid}
                </div>
              </div>

              {/* Balance */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-medium">Saldo de Puntos</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display tabular-nums text-white">
                    {user.points.toLocaleString('es-ES')}
                  </span>
                  <span className="text-xs font-bold text-amber-400">PUNTOS</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-2.5 text-xs">
                <div>
                  <span className="text-[9px] text-stone-400 block uppercase">Socio</span>
                  <span className="font-bold text-white tracking-wide text-xs">{user.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-stone-400 block uppercase">Bonus</span>
                  <span className="font-bold text-amber-400 text-xs">
                    +{details?.levelDetails?.bonusPct || 0}% por consumo
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800">
                <span className="text-stone-400 text-[11px] block">Visitas</span>
                <span className="text-xl font-bold font-display text-white mt-0.5 block tabular-nums">
                  {user.total_visits}
                </span>
                <span className="text-[10px] text-amber-400 mt-0.5 block">
                  {10 - (user.total_visits % 10)} para cupón sorpresa
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800">
                <span className="text-stone-400 text-[11px] block">Gasto Total</span>
                <span className="text-xl font-bold font-display text-white mt-0.5 block tabular-nums">
                  {formatCurrency(user.total_spent)}
                </span>
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  En Fulano Resto Bar
                </span>
              </div>
            </div>

            {/* Birthday Status Pill */}
            <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🎂</span>
                <div>
                  <span className="text-stone-400 text-[10px] uppercase font-semibold block">Cumpleaños (+150 pts)</span>
                  <span className="text-xs font-bold text-white">
                    {user.birthday ? user.birthday : 'Sin configurar'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsBirthdayModalOpen(true)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
              >
                {user.birthday ? 'Modificar' : 'Configurar'}
              </button>
            </div>

            {/* GOOGLE AI STUDIO & BDP PAYMENT INTEGRATION CARD */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/40 border border-amber-500/30 space-y-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-white text-xs sm:text-sm">
                    IA Sommelier & Cobro BDP
                  </h4>
                  <p className="text-[10px] text-stone-400">
                    Google AI Studio • Pasarela TPV BDP
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                Consulta recomendaciones de la carta, calcula tus puntos FidelityFul y genera el pago de tu mesa con la pasarela BDP.
              </p>

              {onOpenAiAssistant && (
                <div className="space-y-2">
                  <button
                    onClick={onOpenAiAssistant}
                    className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Asistente Sommelier & Comandas</span>
                  </button>
                  <button
                    onClick={onOpenAiAssistant}
                    className="w-full py-2 px-3 bg-stone-900 hover:bg-stone-850 text-amber-400 hover:text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Canjear Ticket BDP (Foto / QR)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* LEVEL PROGRESSION & FEATURED PERKS */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Progression Box */}
            <div className="p-5 sm:p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Progreso de Nivel</span>
                  <h3 className="text-base sm:text-lg font-bold font-display text-white mt-0.5">
                    {milestone.nextTier ? `Hacia Nivel ${milestone.nextTier}` : 'Estatus Máximo VIP'}
                  </h3>
                </div>
                <span className="text-xl sm:text-2xl font-extrabold font-display text-white tabular-nums">
                  {milestone.progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-stone-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, milestone.progressPercent)}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
                <span>Nivel actual: <strong className="text-white">{user.level}</strong></span>
                {milestone.nextTier ? (
                  <span>
                    Faltan <strong className="text-amber-400 tabular-nums">{milestone.pointsNeeded.toLocaleString('es-ES')} pts</strong> para {milestone.nextTier}
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold">¡Rango Máximo VIP en Fulano!</span>
                )}
              </div>
            </div>

            {/* Quick Rewards Grid */}
            <div className="p-5 sm:p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold font-display text-white">Premios Disponibles</h3>
                <button
                  onClick={() => setActiveTab('premios')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Ver carta de premios</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rewards.slice(0, 4).map((reward) => {
                  const canAfford = user.points >= reward.cost_points && reward.stock > 0;
                  return (
                    <div
                      key={reward.id}
                      className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800/80 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl p-1 rounded-xl bg-stone-900 border border-stone-800 shrink-0">
                          {reward.image_emoji}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{reward.name}</h4>
                          <span className="text-xs text-amber-400 font-bold tabular-nums">
                            {reward.cost_points} pts
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setRedeeming(reward)}
                        disabled={!canAfford}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        Canjeá
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: RECOMPENSAS COMPLETO                             */}
      {/* ======================================================== */}
      {activeTab === 'premios' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display text-white">Recompensas para la Barra</h2>
              <p className="text-xs text-stone-400">Canjea tus puntos por consumiciones y merchandising oficial.</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-400 uppercase block">Tu Saldo</span>
              <span className="text-sm font-extrabold text-amber-400 font-display tabular-nums">
                {user.points.toLocaleString('es-ES')} pts
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {rewards.map((reward) => {
              const canAfford = user.points >= reward.cost_points && reward.stock > 0;
              return (
                <div
                  key={reward.id}
                  className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl p-1.5 rounded-xl bg-stone-950 border border-stone-800">
                        {reward.image_emoji}
                      </span>
                      <span className="text-[10px] text-stone-400 bg-stone-950 px-2 py-0.5 rounded-full border border-stone-800">
                        Stock: {reward.stock}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm">{reward.name}</h3>
                    <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-2">{reward.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                    <span className="text-base font-extrabold font-display text-amber-400 tabular-nums">
                      {reward.cost_points} <span className="text-xs font-semibold">pts</span>
                    </span>

                    <button
                      onClick={() => setRedeeming(reward)}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Canjear' : 'Faltan pts'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Vouchers */}
          {details?.redemptions && details.redemptions.length > 0 && (
            <div className="p-5 rounded-3xl bg-stone-900 border border-stone-800 space-y-3">
              <h3 className="font-display font-bold text-white text-sm">Mis Vouchers Canjeados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {details.redemptions.map((rdm) => (
                  <div
                    key={rdm.id}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{rdm.reward_name}</span>
                      <span className="font-mono text-[11px] text-amber-400 font-bold">
                        {rdm.redemption_code}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rdm.status === 'active'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-stone-900 text-stone-500'
                      }`}
                    >
                      {rdm.status === 'active' ? 'Pendiente' : 'Entregado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MI PASE DIGITAL QR                               */}
      {/* ======================================================== */}
      {activeTab === 'qr' && (
        <ClientQR user={user} />
      )}

      {/* ======================================================== */}
      {/* TAB 4: HISTORIAL DE CONSUMOS                            */}
      {/* ======================================================== */}
      {activeTab === 'historial' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold font-display text-white">Historial de Consumo</h2>

          {details?.transactions && details.transactions.length > 0 ? (
            <div className="space-y-2.5">
              {details.transactions.map((tx) => {
                const itemsList = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                      <div>
                        <span className="font-mono font-bold text-white block">{tx.transaction_code}</span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(tx.created_at).toLocaleDateString()} · {tx.notes || 'Comanda'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 text-sm block tabular-nums">
                          +{formatPoints(tx.points_earned)}
                        </span>
                        <span className="text-[11px] text-stone-400 tabular-nums">
                          {formatCurrency(tx.total_euros)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      {Array.isArray(itemsList) &&
                        itemsList.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-stone-300">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="text-amber-400 tabular-nums">+{item.points} pts</span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-center text-xs text-stone-400">
              No hay consumos previos registrados todavía.
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: CUPONES SORPRESA POR VISITAS                      */}
      {/* ======================================================== */}
      {activeTab === 'cupones' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold font-display text-white">Cupones Sorpresa (Hito 10 Visitas)</h2>

          {details?.coupons && details.coupons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {details.coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    coupon.is_used
                      ? 'bg-stone-900/60 border-stone-800 opacity-60'
                      : 'bg-stone-900 border-amber-500/40'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        {coupon.code}
                      </span>
                      <span className="text-[10px] font-bold text-stone-400">
                        {coupon.is_used ? 'Canjeado' : 'Disponible'}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-xs">{coupon.title}</h3>
                    <p className="text-[11px] text-stone-300 mt-0.5">{coupon.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-center text-xs text-stone-400">
              Llevas <strong>{user.total_visits} visitas</strong>. ¡A las 10 visitas recibirás tu primer cupón sorpresa!
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: NIVELES & VENTAJAS                               */}
      {/* ======================================================== */}
      {activeTab === 'niveles' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-white">Escala de Niveles & Multiplicadores</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { level: 'Bronce', pts: '0–999 pts', bonus: '+0% bonus', desc: '1€ = 10 puntos base en carta' },
              { level: 'Plata', pts: '1.000–2.999 pts', bonus: '+5% bonus', desc: '+5% puntos extra en consumiciones' },
              { level: 'Oro', pts: '3.000–6.999 pts', bonus: '+10% bonus', desc: '+10% puntos extra en consumiciones' },
              { level: 'VIP', pts: '7.000+ pts', bonus: '+20% bonus', desc: '+20% puntos extra y beneficios VIP' },
            ].map((t) => (
              <div key={t.level} className="p-4 rounded-2xl bg-stone-900 border border-stone-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  {t.bonus}
                </span>
                <h3 className="font-bold font-display text-white text-base mt-0.5">{t.level}</h3>
                <span className="text-xs text-stone-400 block mt-0.5">{t.pts}</span>
                <p className="text-[11px] text-stone-300 mt-2">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON: 1-TAP QR ACCESS (MOBILE & DESKTOP) */}
      <button
        onClick={() => setIsQuickQrModalOpen(true)}
        className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-40 px-4 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-2xl shadow-amber-500/40 flex items-center gap-2 border border-amber-300/60 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Mostrar mi Pase QR"
      >
        <QrCode className="w-5 h-5 text-stone-950" />
        <span className="tracking-tight">Mostrar QR</span>
      </button>

      {/* QUICK QR MODAL (1-TAP DIRECT ACCESS VIA PORTAL) */}
      {isQuickQrModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 sm:p-6 text-center space-y-4 shadow-2xl relative my-auto max-h-[94vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsQuickQrModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-xl bg-stone-800/80 hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Pase de Fidelidad Digital
                </span>
                <h3 className="font-display font-bold text-white text-lg mt-0.5">
                  {user.name}
                </h3>
                <p className="text-xs text-stone-300">
                  Muestra este QR al camarero o lector de barra para sumar puntos o canjear tus premios.
                </p>
              </div>

              <ClientQR user={user} compact={true} />

              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Nivel</span>
                  <span className="font-bold text-white">{user.level}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block uppercase">Saldo</span>
                  <span className="font-bold text-amber-400 tabular-nums">
                    {formatPoints(user.points)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsQuickQrModalOpen(false)}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Pase
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL REDEEM CONFIRMATION VIA PORTAL */}
      {redeeming &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-xs w-full p-5 text-center space-y-3 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="text-4xl">{redeeming.image_emoji}</div>
              <h3 className="font-bold text-white text-sm">{redeeming.name}</h3>
              <p className="text-xs text-stone-400">Costo: <strong className="text-amber-400">{formatPoints(redeeming.cost_points)}</strong></p>
              <p className="text-[11px] text-stone-300">¿Quieres canjear este premio ahora?</p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setRedeeming(null)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-400 bg-stone-800 hover:bg-stone-700 rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRedeem(redeeming)}
                  className="flex-1 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer transition-colors"
                >
                  ¡Sí, Canjear!
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL SUCCESS VOUCHER VIA PORTAL */}
      {redemptionSuccess &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-6 text-center space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-200">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-white text-base">¡Canje Realizado con Éxito!</h3>
              <p className="text-xs text-stone-300">Muestra este código en barra o al camarero:</p>
              <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 font-mono text-xl font-bold text-amber-400 tracking-wider">
                {redemptionSuccess.redemption?.redemption_code}
              </div>
              <button
                onClick={() => setRedemptionSuccess(null)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL CONFIGURAR CUMPLEAÑOS VIA PORTAL */}
      {isBirthdayModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
                    🎂
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-base">Bono de Cumpleaños</h3>
                    <p className="text-[11px] text-stone-400">Fulano Resto Bar • +150 Pts</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBirthdayModalOpen(false)}
                  className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                Ingresa tu fecha de cumpleaños. Durante la semana de tu cumpleaños, el sistema te acreditará automáticamente <strong>+150 puntos de regalo</strong> para disfrutar en el salón o barra.
              </p>

              <form onSubmit={handleSaveBirthday} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={inputBirthday}
                    onChange={(e) => setInputBirthday(e.target.value)}
                    required
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsBirthdayModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingBirthday}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-stone-950 text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {savingBirthday ? 'Guardando...' : 'Guardar y Activar'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};
