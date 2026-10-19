import { useMemo } from 'react';

export interface MilestoneInfo {
  currentTier: string;
  nextTier: string | null;
  pointsNeeded: number;
  progressPercent: number;
  message: string;
  targetPoints: number;
  currentLevelBase: number;
  pointsEarnedInTier: number;
  span: number;
  nextTierBonusPct: number;
  nextTierBenefits: string[];
  encouragementTip: string;
}

/**
 * Calcula el progreso, puntos restantes y mensaje motivacional hacia el siguiente nivel VIP
 * Niveles de Fulano Resto Bar:
 * - Bronce: 0 - 999 pts (Multiplicador base)
 * - Plata: 1.000 - 2.999 pts (+5% bonus en consumos)
 * - Oro: 3.000 - 6.999 pts (+10% bonus en consumos)
 * - VIP: 7.000+ pts (+20% bonus VIP máximo en consumos)
 */
export function calculateMilestone(points: number, level: string): MilestoneInfo {
  const safePoints = Math.max(0, Number(points) || 0);
  let nextTier: string | null = 'Plata';
  let target = 1000;
  let currentLevelBase = 0;
  let nextTierBonusPct = 5;
  let nextTierBenefits = [
    '+5% extra en todos tus consumos',
    'Acceso a canjes exclusivos de cócteles clásicos',
    'Atención prioritaria los fines de semana',
  ];
  let encouragementTip = '¡Equivale a disfrutar un buen asado o 2 tapas con amigos!';

  if (level === 'Bronce' || safePoints < 1000) {
    nextTier = 'Plata';
    target = 1000;
    currentLevelBase = 0;
    nextTierBonusPct = 5;
    nextTierBenefits = [
      '+5% de puntos extra en cada visita',
      'Desbloqueo de cócteles clásicos en el catálogo de premios',
      'Regalo de bienvenida de cortesía',
    ];
    encouragementTip = '¡Pedí un plato principal y un trago de autor para sumar hasta 400 pts!';
  } else if (level === 'Plata' || (safePoints >= 1000 && safePoints < 3000)) {
    nextTier = 'Oro';
    target = 3000;
    currentLevelBase = 1000;
    nextTierBonusPct = 10;
    nextTierBenefits = [
      '+10% de puntos extra en cada ticket',
      'Canjes de cortes premium de carne argentina',
      'Reserva de mesa preferencial en salón o terraza',
      'Degustaciones y catas de vinos Malbec guiadas',
    ];
    encouragementTip = '¡Estás a pocas visitas de disfrutar de los cortes más exclusivos!';
  } else if (level === 'Oro' || (safePoints >= 3000 && safePoints < 7000)) {
    nextTier = 'VIP';
    target = 7000;
    currentLevelBase = 3000;
    nextTierBonusPct = 20;
    nextTierBenefits = [
      '+20% máximo de puntos extra en todo consumo',
      'Mesa VIP garantizada sin espera',
      'Botella de vino o espumante de bienvenida en eventos especiales',
      'Acceso a experiencias secretas de coctelería y carnes maduradas',
    ];
    encouragementTip = '¡El estatus VIP supremo de Fulano Resto Bar está a tu alcance!';
  } else {
    // Rango máximo VIP alcanzado
    return {
      currentTier: 'VIP',
      nextTier: null,
      pointsNeeded: 0,
      progressPercent: 100,
      message: '¡Felicitaciones! Has alcanzado el rango máximo VIP en Fulano Resto Bar.',
      targetPoints: 7000,
      currentLevelBase: 7000,
      pointsEarnedInTier: safePoints - 7000,
      span: 0,
      nextTierBonusPct: 20,
      nextTierBenefits: [
        'Estatus VIP supremo permanente',
        '+20% en cada visita a Fulano',
        'Atención de mozo dedicado y regalos sorpresa',
      ],
      encouragementTip: '¡Sos parte de la mesa chica de Fulano! Seguí disfrutando de tus beneficios VIP.',
    };
  }

  const pointsNeeded = Math.max(0, target - safePoints);
  const span = target - currentLevelBase;
  const earnedInLevel = safePoints - currentLevelBase;
  const rawProgress = span > 0 ? (earnedInLevel / span) * 100 : 100;
  const progressPercent = Math.min(Math.max(Math.round(rawProgress), 0), 100);

  return {
    currentTier: level,
    nextTier,
    pointsNeeded,
    progressPercent,
    message: `¡Estás a solo ${pointsNeeded} puntos de alcanzar el Nivel ${nextTier} y desbloquear mejores beneficios!`,
    targetPoints: target,
    currentLevelBase,
    pointsEarnedInTier: earnedInLevel,
    span,
    nextTierBonusPct,
    nextTierBenefits,
    encouragementTip,
  };
}

/**
 * Hook para calcular y reactivar hitos en componentes React
 */
export function useMilestones(points: number, level: string): MilestoneInfo {
  return useMemo(() => calculateMilestone(points, level), [points, level]);
}

export default useMilestones;
