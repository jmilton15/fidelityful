import React, { useState } from 'react';
import { MilestoneInfo } from '../hooks/useMilestones';
import { Sparkles, Trophy, ChevronRight, Award, Zap, CheckCircle2 } from 'lucide-react';

interface MilestoneBannerProps {
  milestone: MilestoneInfo;
  userPoints: number;
  userName?: string;
  onViewPerks?: () => void;
}

export const MilestoneBanner: React.FC<MilestoneBannerProps> = ({
  milestone,
  userPoints,
  userName,
  onViewPerks,
}) => {
  const [showBenefits, setShowBenefits] = useState(false);
  const isVip = milestone.currentTier === 'VIP';

  // Badges & styling according to next tier
  const getNextTierTheme = () => {
    switch (milestone.nextTier) {
      case 'VIP':
        return {
          border: 'border-amber-400/50',
          bg: 'from-amber-950/40 via-stone-900/90 to-purple-950/30',
          barGradient: 'from-amber-500 via-amber-400 to-purple-400',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
          glow: 'shadow-purple-500/10',
          accent: 'text-amber-400',
        };
      case 'Oro':
        return {
          border: 'border-amber-500/50',
          bg: 'from-amber-950/40 via-stone-900/90 to-amber-900/30',
          barGradient: 'from-amber-500 via-yellow-400 to-amber-300',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
          glow: 'shadow-amber-500/15',
          accent: 'text-amber-400',
        };
      case 'Plata':
      default:
        return {
          border: 'border-stone-500/40',
          bg: 'from-stone-900/90 via-stone-900 to-stone-800/40',
          barGradient: 'from-stone-400 via-amber-300 to-stone-200',
          badgeBg: 'bg-stone-500/20 text-stone-200 border-stone-400/40',
          glow: 'shadow-stone-500/10',
          accent: 'text-stone-300',
        };
    }
  };

  const theme = getNextTierTheme();

  if (isVip) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-amber-950/40 via-stone-900/95 to-purple-950/40 border border-amber-400/50 shadow-xl shadow-amber-500/10">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black text-xl shadow-lg shadow-amber-500/20 shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  RANGO MÁXIMO VIP
                </span>
                <span className="text-xs text-amber-400 font-bold">+20% Bonus Activo</span>
              </div>
              <h3 className="font-display font-bold text-white text-sm sm:text-base mt-0.5">
                {milestone.message}
              </h3>
              <p className="text-xs text-stone-300 mt-0.5">
                {milestone.encouragementTip}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Socio de Honor</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-r ${theme.bg} border ${theme.border} shadow-xl ${theme.glow} transition-all`}
    >
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-stone-300">
                Tu Nivel: {milestone.currentTier}
              </span>
              <span className="text-stone-400 text-xs">➔</span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                Próximo: {milestone.nextTier} (+{milestone.nextTierBonusPct}% bonus)
              </span>
            </div>
            <h3 className="font-display font-bold text-white text-sm sm:text-base mt-1">
              ¡Estás a solo <span className="text-amber-400 font-extrabold">{milestone.pointsNeeded.toLocaleString('es-ES')} puntos</span> de alcanzar el Nivel {milestone.nextTier}!
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              {milestone.encouragementTip}
            </p>
          </div>
        </div>

        {/* Next Tier target badge */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={() => setShowBenefits(!showBenefits)}
            className="px-3 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/40 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>{showBenefits ? 'Ocultar beneficios' : `Beneficios Nivel ${milestone.nextTier}`}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showBenefits ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-stone-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Progreso actual: <strong className="text-white">{userPoints.toLocaleString('es-ES')} pts</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-extrabold">{milestone.progressPercent}%</span>
            <span className="text-stone-400">/ Meta: {milestone.targetPoints.toLocaleString('es-ES')} pts</span>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="w-full h-3 bg-stone-950/80 rounded-full p-0.5 border border-stone-800 overflow-hidden shadow-inner relative">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${theme.barGradient} transition-all duration-700 ease-out shadow-sm`}
            style={{ width: `${Math.max(4, milestone.progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Collapsible Benefits of next tier */}
      {showBenefits && (
        <div className="mt-3.5 pt-3 border-t border-stone-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs animate-in fade-in duration-200">
          {milestone.nextTierBenefits.map((benefit, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-stone-300 text-[11px] leading-snug">{benefit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MilestoneBanner;
