import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, MenuItem, SystemConfig, BdpOrder } from '../types';
import {
  fetchMenu,
  registerConsumption,
  claimRedemptionInBar,
  redeemCouponInBar,
  createBdpOrder,
  claimBdpTicketDirectly,
} from '../api';
import confetti from 'canvas-confetti';
import { formatCurrency, formatPoints } from '../utils/format';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Wine,
  UserCheck,
  Search,
  Sparkles,
  Award,
  AlertCircle,
  Receipt,
  ScanLine,
  X,
  ChevronUp,
  CreditCard,
  UserX,
} from 'lucide-react';

interface StaffPosViewProps {
  allUsers: User[];
  config: SystemConfig;
  onRefreshAll: () => void;
  onOpenBdpPaymentModal?: (order: BdpOrder) => void;
  onOpenAiAssistant?: () => void;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export const StaffPosView: React.FC<StaffPosViewProps> = ({
  allUsers,
  config,
  onRefreshAll,
  onOpenBdpPaymentModal,
  onOpenAiAssistant,
}) => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNotes, setTableNotes] = useState('Mesa 4');
  const [isTerrace, setIsTerrace] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [txReceipt, setTxReceipt] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Bar validation tool
  const [validationCode, setValidationCode] = useState('');
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetchMenu()
      .then((items) => setMenu(items))
      .catch((err) => console.error('Error fetching menu:', err));

    const clients = allUsers.filter((u) => u.role === 'client');
    if (clients.length > 0 && !selectedUser) {
      const mateo = clients.find((c) => c.name.includes('Mateo')) || clients[0];
      setSelectedUser(mateo);
    }
  }, [allUsers]);

  const filteredUsers = allUsers
    .filter((u) => u.role === 'client')
    .filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchQuery)) ||
        u.uid.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const categories = [
    { id: 'all', label: 'Todos', emoji: '🍽️' },
    { id: 'plato_asado', label: 'Sale Asadito', emoji: '🥩' },
    { id: 'plato_pizza', label: 'Pizzas Argentinas', emoji: '🍕' },
    { id: 'plato_milanga', label: 'Milangas XXL', emoji: '🍖' },
    { id: 'plato_cordoba', label: 'Córdoba & Abuela', emoji: '🥪' },
    { id: 'plato_empanada', label: 'Empanadas (4€)', emoji: '🥟' },
    { id: 'bebidas', label: 'Bebidas & Tragos', emoji: '🍺' },
    { id: 'postre', label: 'Postres', emoji: '🍮' },
  ];

  const filteredMenu = menu.filter((item) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'bebidas') return item.category.startsWith('bebida');
    if (selectedCategory === 'postre') return item.category === 'postre';
    return item.category === selectedCategory;
  });

  const getMultiplier = (category: string): number => {
    const cat = category.toLowerCase();
    if (cat.includes('coctel') || cat.includes('cóctel')) return Number(config.multiplier_coctel);
    if (cat.includes('postre')) return Number(config.multiplier_postre);
    if (
      cat.includes('plato') ||
      cat.includes('asado') ||
      cat.includes('pizza') ||
      cat.includes('milanga') ||
      cat.includes('cordoba') ||
      cat.includes('empanada')
    ) {
      return Number(config.multiplier_plato);
    }
    return Number(config.multiplier_bebida);
  };

  const getTierBonusPct = (level?: string): number => {
    if (!level) return 0;
    if (level === 'VIP') return Number(config.level_vip_bonus_pct);
    if (level === 'Oro') return Number(config.level_oro_bonus_pct);
    if (level === 'Plata') return Number(config.level_plata_bonus_pct);
    return 0;
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => setCart([]);

  // Subtotals and points calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const terraceSurcharge = isTerrace ? Math.round(rawSubtotal * 0.10 * 100) / 100 : 0;
  const finalTotalEuros = rawSubtotal + terraceSurcharge;

  const basePoints = cart.reduce((sum, item) => {
    const mult = getMultiplier(item.category);
    const itemSubtotal = Number(item.price) * item.quantity;
    return sum + Math.round(itemSubtotal * Number(config.euro_to_points) * mult);
  }, 0);

  const tierBonusPct = getTierBonusPct(selectedUser?.level);
  const tierBonusPoints = Math.round(basePoints * (tierBonusPct / 100));
  const totalPointsToCredit = basePoints + tierBonusPoints;

  const handleCharge = async () => {
    if (!selectedUser) {
      setErrorMsg('Selecciona un cliente antes de cobrar.');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('Añade al menos un producto a la comanda.');
      return;
    }

    setProcessing(true);
    setErrorMsg(null);

    try {
      const payload = {
        userId: selectedUser.id,
        staffName: 'Lucía Santos (Caja)',
        notes: `${tableNotes}${isTerrace ? ' (Terraza +10%)' : ''}`,
        isTerrace,
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          price: Number(i.price),
          quantity: i.quantity,
        })),
      };

      const result = await registerConsumption(payload);
      // Guardar nombre y nivel del cliente en el recibo para mostrarlo en el modal
      result.clientName = selectedUser.name;
      result.clientLevel = selectedUser.level;
      setTxReceipt(result);

      // Opción A: Reseteo inmediato y automático para agilidad en barra de bar
      clearCart();
      setSelectedUser(null);
      setTableNotes('');
      setIsMobileCartOpen(false);

      if (result.awardedCoupon || result.levelUpgraded) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      }

      onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar cobro');
    } finally {
      setProcessing(false);
    }
  };

  const handleChargeWithBdp = async () => {
    if (!selectedUser || cart.length === 0) return;
    setProcessing(true);
    setErrorMsg(null);
    try {
      const itemsPayload = cart.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        price: Number(item.price),
      }));

      const res = await createBdpOrder({
        userId: selectedUser.id,
        tableNumber: tableNotes || 'Mesa 4',
        items: itemsPayload,
        terraceService: isTerrace,
        paymentMethod: 'tpv_qr',
      });

      if (onOpenBdpPaymentModal) {
        onOpenBdpPaymentModal(res.order);
        clearCart();
        setSelectedUser(null);
        setTableNotes('');
      }
    } catch (err: any) {
      console.error('Error creating BDP order:', err);
      setErrorMsg(err.message || 'Error al conectar con pasarela BDP');
    } finally {
      setProcessing(false);
    }
  };

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = validationCode.trim();
    if (!rawInput) return;

    setValidating(true);
    setValidationResult(null);

    try {
      // 1. Is it a user UID or User QR (e.g., FUL-MATEO-... or matches any user.uid)?
      const foundUser = allUsers.find(
        (u) =>
          u.uid.toLowerCase() === rawInput.toLowerCase() ||
          rawInput.toLowerCase().includes(u.uid.toLowerCase()) ||
          (u.phone && rawInput === u.phone)
      );

      if (foundUser) {
        setSelectedUser(foundUser);
        setValidationResult(`✓ Socio asignado al TPV: ${foundUser.name} (${foundUser.level}) · Saldo: ${formatPoints(foundUser.points)}`);
        confetti({ particleCount: 60, spread: 60 });
        setValidationCode('');
        return;
      }

      // 2. Is it a BDP ticket URL or parameters (e.g. canjear?t=F2026-004821&m=9.90 or t=...&m=...)?
      if (rawInput.includes('t=') || rawInput.includes('canjear') || (rawInput.includes('&m=') && rawInput.includes('F2026'))) {
        let ticketId = '';
        let amount = 0;
        try {
          const urlObj = new URL(rawInput.startsWith('http') ? rawInput : `https://dummy.local/?${rawInput}`);
          ticketId = urlObj.searchParams.get('t') || '';
          amount = parseFloat(urlObj.searchParams.get('m') || '0');
        } catch {
          const tMatch = rawInput.match(/t=([^&]+)/);
          const mMatch = rawInput.match(/m=([0-9.]+)/);
          ticketId = tMatch ? tMatch[1] : '';
          amount = mMatch ? parseFloat(mMatch[1]) : 0;
        }

        if (ticketId && amount > 0) {
          if (!selectedUser) {
            throw new Error('Asigna primero un socio para acreditar los puntos del ticket BDP.');
          }
          const clientName = selectedUser.name;
          const res = await claimBdpTicketDirectly({
            ticket_id: ticketId,
            amount,
            userId: selectedUser.id,
            date_str: new Date().toLocaleDateString('es-ES'),
          });
          setValidationResult(`✓ Ticket BDP #${ticketId} (${formatCurrency(amount)}) canjeado con éxito. +${formatPoints(res.points_awarded)} acreditados a ${clientName}. TPV listo para siguiente cliente.`);
          confetti({ particleCount: 80, spread: 70 });
          clearCart();
          setSelectedUser(null);
          setTableNotes('');
          onRefreshAll();
          setValidationCode('');
          return;
        }
      }

      // 3. Is it a Redemption voucher (RDM-XXXX) or Coupon code (CFUL-XXXX)?
      const code = rawInput.toUpperCase();
      if (code.startsWith('RDM-') || code.startsWith('RDM')) {
        const res = await claimRedemptionInBar(code);
        setValidationResult(`✓ ${res.message} · TPV listo para siguiente cliente.`);
        confetti({ particleCount: 60, spread: 60 });
        clearCart();
        setSelectedUser(null);
        setTableNotes('');
        onRefreshAll();
      } else if (code.startsWith('CFUL-') || code.startsWith('CFUL')) {
        const res = await redeemCouponInBar(code);
        setValidationResult(`✓ ${res.message} · TPV listo para siguiente cliente.`);
        confetti({ particleCount: 60, spread: 60 });
        clearCart();
        setSelectedUser(null);
        setTableNotes('');
        onRefreshAll();
      } else {
        // Fallback attempt: voucher or coupon
        try {
          const res = await claimRedemptionInBar(code);
          setValidationResult(`✓ ${res.message} · TPV listo para siguiente cliente.`);
          clearCart();
          setSelectedUser(null);
          setTableNotes('');
          onRefreshAll();
        } catch {
          const res2 = await redeemCouponInBar(code);
          setValidationResult(`✓ ${res2.message} · TPV listo para siguiente cliente.`);
          clearCart();
          setSelectedUser(null);
          setTableNotes('');
          onRefreshAll();
        }
      }
      setValidationCode('');
    } catch (err: any) {
      setValidationResult(`✗ Error: ${err.message || 'Código inválido o ya canjeado'}`);
    } finally {
      setValidating(false);
    }
  };

  // Reusable Cart Content JSX
  const cartContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-400" />
          <h3 className="font-display font-bold text-white text-base">Comanda / Ticket</h3>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-stone-400 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar</span>
          </button>
        )}
      </div>

      {/* Table & Terrace Option (Automated +10% Surcharge) */}
      <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">
            Zona & Suplemento Terraza
          </span>
          {isTerrace ? (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
              ☀️ +10% Terraza Automático
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-stone-400 bg-stone-900 px-2 py-0.5 rounded-full border border-stone-800">
              🏠 Sala Interior (Sin recargo)
            </span>
          )}
        </div>

        {/* Large Tactile Zone Switcher */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsTerrace(false);
              if (tableNotes.includes('Terraza')) setTableNotes('Mesa 4');
            }}
            className={`py-2 px-3 rounded-xl font-bold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              !isTerrace
                ? 'bg-stone-800 text-white border-stone-600 shadow-sm'
                : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
            }`}
          >
            <span>🏠</span>
            <span>Sala / Barra (0%)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsTerrace(true);
              if (!tableNotes.includes('Terraza')) setTableNotes('Terraza T1');
            }}
            className={`py-2 px-3 rounded-xl font-bold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              isTerrace
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
            }`}
          >
            <span>☀️</span>
            <span>Terraza (+10%)</span>
          </button>
        </div>

        {/* Quick Table Presets (Auto-selects Terrace / Sala) */}
        <div>
          <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block mb-1">
            Mesa Seleccionada
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {[
              { name: 'Mesa 1', terrace: false },
              { name: 'Mesa 2', terrace: false },
              { name: 'Mesa 3', terrace: false },
              { name: 'Mesa 4', terrace: false },
              { name: 'Barra', terrace: false },
              { name: 'Terraza T1', terrace: true },
              { name: 'Terraza T2', terrace: true },
              { name: 'Terraza T3', terrace: true },
              { name: 'Terraza T4', terrace: true },
            ].map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => {
                  setTableNotes(t.name);
                  setIsTerrace(t.terrace);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                  tableNotes === t.name
                    ? t.terrace
                      ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow-sm'
                      : 'bg-stone-700 text-white border-stone-600 font-bold'
                    : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                }`}
              >
                {t.terrace ? `☀️ ${t.name}` : `🏠 ${t.name}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart items list */}
      {cart.length > 0 ? (
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {cart.map((item) => {
            const mult = getMultiplier(item.category);
            const subtotal = Number(item.price) * item.quantity;
            const itemPoints = Math.round(subtotal * Number(config.euro_to_points) * mult);
            return (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                  <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                    <span className="tabular-nums">{formatCurrency(item.price)}</span>
                    <span className="text-amber-400 font-mono">x{mult}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-white w-4 text-center tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right shrink-0 min-w-14">
                  <span className="text-xs font-bold font-display text-white block tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold block tabular-nums">
                    +{formatPoints(itemPoints)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-stone-500 text-xs border border-dashed border-stone-800 rounded-2xl">
          Selecciona platos o bebidas de la carta para añadirlos.
        </div>
      )}

      {/* Calculations Summary */}
      <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5 text-xs">
        <div className="flex justify-between text-stone-400">
          <span>Subtotal Carta:</span>
          <span className="font-bold text-white tabular-nums">{formatCurrency(rawSubtotal)}</span>
        </div>

        {isTerrace && (
          <div className="flex justify-between text-amber-400/90 text-[11px]">
            <span>Recargo Terraza (10%):</span>
            <span className="font-bold tabular-nums">+{formatCurrency(terraceSurcharge)}</span>
          </div>
        )}

        <div className="flex justify-between text-stone-400">
          <span>Puntos Base (Carta):</span>
          <span className="tabular-nums">{formatPoints(basePoints)}</span>
        </div>

        <div className="flex justify-between text-stone-400">
          <span>Bonus Nivel {selectedUser?.level || 'Bronce'} (+{tierBonusPct}%):</span>
          <span className="text-amber-400 tabular-nums">+{formatPoints(tierBonusPoints)}</span>
        </div>

        <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 block uppercase">Total a Cobrar</span>
            <span className="text-lg font-extrabold text-white font-display tabular-nums">
              {formatCurrency(finalTotalEuros)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-stone-400 block uppercase">Puntos a Acreditar</span>
            <span className="text-lg font-extrabold text-amber-400 font-display tabular-nums">
              +{formatPoints(totalPointsToCredit)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <button
          onClick={handleCharge}
          disabled={processing || cart.length === 0}
          className={`w-full py-2.5 text-xs font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            cart.length > 0 && !processing
              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>
            {processing ? 'Registrando...' : `Cobrar ${formatCurrency(finalTotalEuros)} (Directo TPV)`}
          </span>
        </button>

        <button
          onClick={handleChargeWithBdp}
          disabled={processing || cart.length === 0}
          className={`w-full py-2.5 text-xs font-bold rounded-2xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
            cart.length > 0 && !processing
              ? 'bg-stone-850 hover:bg-stone-800 text-amber-400 border-amber-500/30'
              : 'bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cobrar con Pasarela BDP (QR / Contactless)</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-0">
      
      {/* Top Banner: Active Cashier & Quick Voucher Validator */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl p-1.5 rounded-xl bg-stone-950 border border-stone-800">
            🥩
          </span>
          <div>
            <h2 className="font-display font-bold text-white text-sm sm:text-base">
              TPV Fulano Resto Bar · Madrid
            </h2>
            <p className="text-[11px] text-stone-400">
              Operador: <strong>Lucía Santos</strong> · Carta de Parrilla, Pizzas & Milangas
            </p>
          </div>
        </div>

        {/* Quick Voucher Validator & AI Assistant trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenAiAssistant && (
            <button
              onClick={onOpenAiAssistant}
              className="px-3 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 shrink-0"
              title="Tomar comanda por IA y enviar a BDP"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Comandas IA</span>
            </button>
          )}

          <form onSubmit={handleValidateCode} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <ScanLine className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Validar canje (RDM-XXXX)"
              value={validationCode}
              onChange={(e) => setValidationCode(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-xl pl-8 pr-2.5 py-1.5 sm:py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={validating}
            className="px-3 py-1.5 sm:py-2 bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold rounded-xl border border-stone-700 transition-colors cursor-pointer shrink-0"
          >
            {validating ? '...' : 'Validar'}
          </button>
        </form>
        </div>
      </div>

      {validationResult && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
            validationResult.startsWith('✓')
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          <span>{validationResult}</span>
          <button onClick={() => setValidationResult(null)} className="underline ml-4 cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="underline ml-4 cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* Main Grid: Left Column (Client + Menu) | Right Column (Desktop Cart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: CLIENT & MENU */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-5">
          
          {/* Client Selector Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Cliente Asignado</span>
              </span>
              {selectedUser && (
                <span className="text-stone-400 text-[11px]">
                  Visita #{selectedUser.total_visits + 1} ({10 - (selectedUser.total_visits % 10)} para cupón)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar socio por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <select
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setSelectedUser(null);
                  } else {
                    const u = allUsers.find((user) => user.id === Number(val));
                    if (u) setSelectedUser(u);
                  }
                }}
                className="w-full bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium cursor-pointer"
              >
                <option value="">-- Esperando siguiente cliente en barra --</option>
                {filteredUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.level} ({formatPoints(u.points)})
                  </option>
                ))}
              </select>
            </div>

            {selectedUser ? (
              <div className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{selectedUser.name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedUser.level}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="text-[10px] text-stone-400 hover:text-rose-400 underline ml-2 cursor-pointer flex items-center gap-0.5"
                    title="Deseleccionar cliente y esperar siguiente"
                  >
                    <UserX className="w-3 h-3" />
                    <span>Liberar cliente</span>
                  </button>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-amber-400 tabular-nums">
                    {formatPoints(selectedUser.points)}
                  </span>
                  <span className="text-[10px] text-emerald-400 ml-1.5">
                    (+{getTierBonusPct(selectedUser.level)}% bonus)
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-stone-950/40 border border-stone-800/60 text-center text-xs text-stone-400">
                Esperando siguiente cliente en fila · Escanea pase QR en barra o selecciona socio arriba
              </div>
            )}
          </div>

          {/* Menu Category Large Tactile Buttons (Rush Hour Optimized) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Categorías de Carta (Acceso Táctil Rápido)
              </span>
              <span className="text-[11px] text-amber-400 font-mono font-bold">
                {filteredMenu.length} ítems
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`min-h-[56px] p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-2.5 text-xs sm:text-sm font-bold border shadow-sm active:scale-95 text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 border-amber-300 shadow-md shadow-amber-500/20 font-extrabold'
                        : 'bg-stone-900/90 hover:bg-stone-850 text-stone-200 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{cat.emoji}</span>
                    <span className="truncate leading-tight font-display">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Items Grid with Big Touch Targets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {filteredMenu.map((item) => {
              const mult = getMultiplier(item.category);
              const pointsPerUnit = Math.round(Number(item.price) * Number(config.euro_to_points) * mult);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-850 text-left transition-all flex flex-col justify-between cursor-pointer active:scale-98 shadow-sm group min-h-[120px]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl p-1.5 rounded-xl bg-stone-950 border border-stone-800">
                        {item.image_emoji}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        x{mult}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">{item.description}</p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-stone-800 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold font-display text-white tabular-nums block">
                        {formatCurrency(item.price)}
                      </span>
                      <span className="text-[10px] font-bold text-amber-400 tabular-nums">
                        +{formatPoints(pointsPerUnit)}
                      </span>
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 group-hover:bg-amber-500 text-amber-400 group-hover:text-stone-950 flex items-center justify-center font-bold text-sm transition-colors">
                      +
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: DESKTOP CART (HIDDEN ON MOBILE, SEEN ON LG) */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="p-5 rounded-3xl bg-stone-900 border border-stone-800 sticky top-20">
            {cartContent}
          </div>
        </div>

      </div>

      {/* MOBILE STICKY FLOATING CART BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 p-3 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 font-bold text-sm shrink-0">
            {cart.reduce((sum, i) => sum + i.quantity, 0)}
          </div>
          <div>
            <div className="text-xs font-extrabold text-white font-display tabular-nums">
              {formatCurrency(finalTotalEuros)}
            </div>
            <span className="text-[10px] text-amber-400 font-semibold tabular-nums">
              +{formatPoints(totalPointsToCredit)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Ver Comanda</span>
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* MOBILE CART MODAL / BOTTOM SHEET VIA PORTAL */}
      {isMobileCartOpen &&
        createPortal(
          <div className="lg:hidden fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex flex-col justify-end p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Revisar Comanda · Fulano Restobar
                </span>
                <button
                  onClick={() => setIsMobileCartOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white bg-stone-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {cartContent}
            </div>
          </div>,
          document.body
        )}

      {/* TRANSACTION SUCCESS RECEIPT MODAL VIA PORTAL */}
      {txReceipt &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 sm:p-6 text-center space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle className="w-5 h-5" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  ¡Consumo Registrado!
                </span>
                <h3 className="font-display font-bold text-white text-lg mt-0.5">
                  +{formatPoints(txReceipt.pointsEarned)} Acreditados
                </h3>
                <p className="text-xs text-stone-300 mt-0.5">
                  {txReceipt.clientName || txReceipt.user?.name || selectedUser?.name || 'Cliente'} · Ticket #{txReceipt.transaction?.transaction_code}
                </p>
              </div>

              {txReceipt.levelUpgraded && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-400/50 text-left text-xs">
                  <span className="font-bold text-amber-300 block">🎉 ¡SUBIDA DE NIVEL!</span>
                  <p className="text-stone-200 mt-0.5">
                    El socio ha ascendido a <strong>{txReceipt.newLevel}</strong>. Ahora disfruta de un +{getTierBonusPct(txReceipt.newLevel)}% de bonificación.
                  </p>
                </div>
              )}

              {txReceipt.awardedCoupon && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-amber-500/20 border border-pink-500/40 text-left text-xs">
                  <span className="font-bold text-pink-300 block">🎁 ¡CUPÓN 10ª VISITA EMITIDO!</span>
                  <p className="text-stone-200 mt-0.5">
                    Código: <strong className="font-mono text-amber-400">{txReceipt.awardedCoupon.code}</strong> guardado en su cuenta.
                  </p>
                </div>
              )}

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-left text-xs space-y-1">
                <div className="flex justify-between text-stone-400">
                  <span>Total Facturado:</span>
                  <span className="font-bold text-white">{formatCurrency(txReceipt.transaction?.total_euros)}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Bonus de Nivel ({txReceipt.levelBonusPct}%):</span>
                  <span className="text-amber-400">+{formatPoints(txReceipt.bonusPoints)}</span>
                </div>
                <div className="flex justify-between text-stone-400 pt-1 border-t border-stone-800">
                  <span>Nuevo Saldo:</span>
                  <span className="font-bold text-amber-400">{formatPoints(txReceipt.user?.points)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setTxReceipt(null);
                  setSelectedUser(null);
                  clearCart();
                  setTableNotes('');
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar y Siguiente Cliente
              </button>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};
