import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BdpOrder, User } from '../types';
import { simulateBdpPayment } from '../api';
import confetti from 'canvas-confetti';
import { formatCurrency, formatPoints } from '../utils/format';
import {
  CreditCard,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  X,
  ExternalLink,
  ShieldCheck,
  Receipt,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface BdpPaymentModalProps {
  order: BdpOrder;
  currentUser: User | null;
  onClose: () => void;
  onPaymentSuccess: (result: any) => void;
}

export const BdpPaymentModal: React.FC<BdpPaymentModalProps> = ({
  order,
  currentUser,
  onClose,
  onPaymentSuccess,
}) => {
  const [processing, setProcessing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

  const handleCopyLink = () => {
    if (order.pay_url) {
      navigator.clipboard.writeText(order.pay_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePay = async (method: string) => {
    setProcessing(true);
    setErrorMsg(null);
    try {
      const res = await simulateBdpPayment(order.order_code, method);
      setPaymentResult(res);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
      });

      onPaymentSuccess(res);
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMsg(err.message || 'Error al procesar cobro en BDP');
    } finally {
      setProcessing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-850 to-amber-950/30 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-white">Pasarela BDP • TPV</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {order.order_code}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Fulano Restobar • {order.table_number || 'Mesa 4'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success View */}
        {paymentResult ? (
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h4 className="text-xl font-bold font-display text-white">¡Pago Aprobado por BDP!</h4>
              <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                La pasarela BDP ha confirmado la transacción y notificado al backend mediante Webhook.
              </p>
            </div>

            {/* Loyalty points banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 text-amber-300">
              <div className="flex items-center justify-center gap-2 font-bold text-lg">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>+{formatPoints(paymentResult.pointsEarned)} FidelityFul Acreditados</span>
              </div>
              <p className="text-xs text-stone-300 mt-1">
                Cliente: <strong className="text-white">{paymentResult.user?.name}</strong> • Nivel:{' '}
                <strong className="text-amber-400">{paymentResult.user?.level}</strong> (Total:{' '}
                {formatPoints(paymentResult.user?.points)})
              </p>
            </div>

            {/* Milestone coupon if earned */}
            {paymentResult.awardedCoupon && (
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs text-left">
                <div className="font-bold flex items-center gap-1.5">
                  <span>🎉</span>
                  <span>{paymentResult.awardedCoupon.title}</span>
                </div>
                <p className="mt-1 text-purple-200/90">{paymentResult.awardedCoupon.description}</p>
                <div className="mt-2 font-mono font-bold bg-purple-950/60 px-2.5 py-1 rounded inline-block text-purple-200">
                  CÓDIGO: {paymentResult.awardedCoupon.code}
                </div>
              </div>
            )}

            {/* Transaction audit */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-400 flex items-center justify-between">
              <span>Recibo TPV BDP:</span>
              <span className="font-mono text-stone-300 font-semibold">
                {paymentResult.transaction?.transaction_code}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm rounded-xl cursor-pointer transition-colors"
            >
              Cerrar y Ver Mi Saldo
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Architecture Banner */}
            <div className="px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Backend Orchestrator • Gemini AI + BDP</span>
              </span>
              <span className="font-mono text-amber-400 font-semibold">{order.status.toUpperCase()}</span>
            </div>

            {/* Breakdown & Points summary */}
            <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
              <div className="flex justify-between items-center text-xs text-stone-400 pb-2 border-b border-stone-800/80">
                <span>Comanda ({rawItems.length} ítems):</span>
                <span>{order.table_number} {order.terrace_service ? '• Terraza (+10%)' : ''}</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs pr-1">
                {rawItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-stone-300">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-mono">{formatCurrency(item.subtotal || item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400">Total a Pagar:</span>
                  <div className="text-2xl font-bold font-mono text-white">
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-amber-400/90 font-medium flex items-center justify-end gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Puntos FidelityFul:
                  </span>
                  <div className="text-lg font-bold font-mono text-amber-400">
                    +{formatPoints(order.points_preview)}
                  </div>
                </div>
              </div>
            </div>

            {/* QR de Pago BDP */}
            <div className="text-center p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
              <div className="text-xs text-stone-400 font-medium">
                Escanea con tu móvil o TPV para cobrar con BDP:
              </div>
              {order.qr_code_data ? (
                <div className="p-3 bg-white rounded-2xl inline-block shadow-lg mx-auto">
                  <img
                    src={order.qr_code_data}
                    alt="QR de Pago BDP"
                    className="w-36 h-36 sm:w-44 sm:h-44 object-contain"
                  />
                </div>
              ) : (
                <div className="w-36 h-36 bg-stone-800 rounded-2xl flex items-center justify-center text-stone-500 mx-auto">
                  <QrCode className="w-10 h-10" />
                </div>
              )}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Link de Cobro BDP'}</span>
                </button>
              </div>
            </div>

            {/* Error display */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Payment Actions / Simulation Buttons */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider text-center">
                Simulación Directa de Cobro en Pasarela BDP
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={processing}
                  onClick={() => handlePay('tpv_contactless_tarjeta')}
                  className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{processing ? 'Procesando...' : 'Cobrar Tarjeta TPV'}</span>
                </button>
                <button
                  disabled={processing}
                  onClick={() => handlePay('bizum_bdp')}
                  className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border border-stone-700 disabled:opacity-50"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>{processing ? 'Procesando...' : 'Pagar con Bizum'}</span>
                </button>
              </div>
              <button
                disabled={processing}
                onClick={() => handlePay('webhook_simulated')}
                className="w-full py-2 bg-stone-950 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-800 rounded-xl text-[11px] font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3 text-amber-400" />
                <span>Disparar Webhook BDP (event: payment.success)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
