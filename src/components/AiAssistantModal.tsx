import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, BdpOrder, ClaimTicketResult } from '../types';
import { chatWithAi } from '../api';
import confetti from 'canvas-confetti';
import { formatCurrency, formatPoints } from '../utils/format';
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  CreditCard,
  X,
  ArrowRight,
  Flame,
  Wine,
  Pizza,
  Receipt,
  CheckCircle2,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  AlertTriangle,
  Gift,
  QrCode,
} from 'lucide-react';

interface AiAssistantModalProps {
  currentUser: User | null;
  onClose: () => void;
  onOpenPaymentModal: (order: BdpOrder) => void;
  onRefreshUser?: () => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  bdpOrder?: BdpOrder;
  claimedTicketResult?: ClaimTicketResult;
  imagePreview?: string;
  time: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  currentUser,
  onClose,
  onOpenPaymentModal,
  onRefreshUser,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-init',
      sender: 'ai',
      text: `¡Hola ${currentUser?.name || 'che'}! Soy el Sommelier y Asistente Virtual de **Fulano Resto Bar** en Paseo Imperial 35.

Conozco toda nuestra carta auténtica de parrillada argentina, milangas XXL, pizzas y las 13 variedades de empanadas (4 €/ud). Además, puedo **procesar y canjear tus tickets de BDP** mediante foto o enlace QR (?t=...&m=...) para acreditar tus puntos **FidelityFul** al instante (Nivel ${currentUser?.level || 'Bronce'}). ¿Qué deseas hacer hoy?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    data: string;
    mimeType: string;
    previewUrl: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableNum, setTableNum] = useState('Mesa 4');
  const [isTerrace, setIsTerrace] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setSelectedImage({
        data: base64Data,
        mimeType: file.type || 'image/jpeg',
        previewUrl: result,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  const handleSend = async (customText?: string, imageOverride?: typeof selectedImage) => {
    const textToSend = customText !== undefined ? customText : inputVal.trim();
    const activeImage = imageOverride !== undefined ? imageOverride : selectedImage;

    if (!textToSend && !activeImage) return;
    if (loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend || (activeImage ? '📸 Foto de comprobante de ticket BDP adjuntada' : ''),
      imagePreview: activeImage ? activeImage.previewUrl : undefined,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (customText === undefined) setInputVal('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const res = await chatWithAi({
        message: textToSend,
        userId: currentUser?.id,
        tableNumber: tableNum,
        isTerrace,
        image: activeImage
          ? {
              data: activeImage.data,
              mimeType: activeImage.mimeType,
            }
          : undefined,
      });

      if (res.claimedTicketResult?.success) {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        onRefreshUser?.();
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        bdpOrder: res.bdpOrder,
        claimedTicketResult: res.claimedTicketResult,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: 'Disculpá che, hubo un pequeño corte en la conexión. Pero podés volver a preguntarme o subir la foto de tu ticket de nuevo.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    {
      label: '📸 Canjear Ticket QR (?t=F2026-004821&m=9.90)',
      text: 'https://app.fulanorestobar.com/canjear?t=F2026-004821&m=9.90&f=1710000000',
    },
    {
      label: '🎫 Canjear Ticket BDP 005-1650 (18.50 €)',
      text: 'Quiero canjear mi ticket BDP número 005-1650-081026 por un importe de 18.50 euros consumido hoy',
    },
    {
      label: '🥩 Asado Argentino',
      text: 'Recomiéndame una buena carne argentina y dime cuántos puntos gano',
    },
    {
      label: '🍖 Milanga XXL + Empanadas',
      text: 'Quiero pedir una Milanesa Napolitana XXL, 2 empanadas de carne y 2 cañas Mahou en Mesa 4',
    },
    {
      label: '💳 Cobrar Cuenta con BDP',
      text: 'Por favor, prepárame la cuenta de Mesa 4 para pagar con tarjeta BDP',
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-stone-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl h-[94vh] sm:h-[84vh] max-h-[780px] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-850 to-amber-950/40 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20 font-bold">
                <Sparkles className="w-5 h-5 text-stone-950" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-stone-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-white text-base sm:text-lg">
                  Fulano Sommelier IA
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium hidden sm:inline-block">
                  Gemini 3.8 Flash • Ticket Claim & TPV BDP
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Paseo Imperial 35 • Validador de Tickets BDP & FidelityFul
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

        {/* Location selector sub-bar */}
        <div className="px-4 py-2 bg-stone-950/70 border-b border-stone-800/80 flex items-center justify-between text-xs text-stone-400 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span>Ubicación:</span>
            <input
              type="text"
              value={tableNum}
              onChange={(e) => setTableNum(e.target.value)}
              className="bg-stone-900 border border-stone-800 rounded-lg px-2 py-0.5 text-xs text-white w-24 font-mono focus:outline-none focus:border-amber-500"
              placeholder="Mesa 4"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-amber-400 font-medium">
              Socio: {currentUser?.name} ({currentUser?.level})
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-stone-300">
              <input
                type="checkbox"
                checked={isTerrace}
                onChange={(e) => setIsTerrace(e.target.checked)}
                className="rounded bg-stone-800 border-stone-700 text-amber-500 focus:ring-0"
              />
              <span>Terraza (+10%)</span>
            </label>
          </div>
        </div>

        {/* Chat message list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-stone-950 font-medium rounded-tr-sm ml-auto'
                    : 'bg-stone-850 border border-stone-800 text-stone-200 rounded-tl-sm shadow-md'
                }`}
              >
                {/* Image preview in chat message */}
                {msg.imagePreview && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-black/10 bg-black/20 max-w-xs">
                    <img
                      src={msg.imagePreview}
                      alt="Ticket BDP adjuntado"
                      className="max-h-52 w-auto object-cover rounded-xl"
                    />
                    <div className="p-1.5 text-[10px] bg-stone-900/90 text-stone-300 font-mono flex items-center gap-1">
                      <Camera className="w-3 h-3 text-amber-400" />
                      <span>Comprobante BDP procesado con Gemini Vision</span>
                    </div>
                  </div>
                )}

                <div className="whitespace-pre-line">{msg.text}</div>

                {/* If AI validated a Claimed BDP Ticket */}
                {msg.claimedTicketResult && (
                  <div
                    className={`mt-3 p-3.5 rounded-xl border text-white space-y-2.5 ${
                      msg.claimedTicketResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-950/50'
                        : 'bg-rose-950/40 border-rose-500/40 shadow-lg shadow-rose-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/10">
                      <div className="flex items-center gap-1.5 font-bold">
                        {msg.claimedTicketResult.success ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Comprobante BDP Validado</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span className="text-rose-400">Ticket Duplicado / Rechazado</span>
                          </>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-stone-300">
                        #{msg.claimedTicketResult.ticket_id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-stone-400 block uppercase">Importe Ticket</span>
                        <span className="text-base font-bold font-mono text-white">
                          {Number(msg.claimedTicketResult.amount).toFixed(2)} €
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 block uppercase">
                          Multiplicador ({msg.claimedTicketResult.userLevel})
                        </span>
                        <span className="text-base font-bold font-mono text-amber-400">
                          x{msg.claimedTicketResult.multiplier}
                        </span>
                      </div>
                    </div>

                    {msg.claimedTicketResult.success && (
                      <div className="p-2 rounded-lg bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-between">
                        <span className="text-xs text-stone-300">Puntos Acreditados:</span>
                        <span className="text-base font-black font-display text-emerald-400">
                          +{msg.claimedTicketResult.points_awarded} PTS
                        </span>
                      </div>
                    )}

                    {msg.claimedTicketResult.awardedCoupon && (
                      <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-200">
                        <Gift className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <div>
                          <span className="font-bold block">¡Premio 10ª Visita Desbloqueado!</span>
                          <span className="text-[10px] font-mono text-amber-300">
                            {msg.claimedTicketResult.awardedCoupon.code}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-stone-400 flex justify-between items-center pt-1 border-t border-white/10 font-mono">
                      <span>Transacción: {msg.claimedTicketResult.transactionCode || 'Auditada'}</span>
                      <span className="text-emerald-400 font-bold">Estado: REGISTRADO</span>
                    </div>
                  </div>
                )}

                {/* If AI generated a BDP Order card */}
                {msg.bdpOrder && (
                  <div className="mt-3 p-3.5 rounded-xl bg-stone-950 border border-amber-500/30 text-white space-y-2.5">
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-stone-800">
                      <span className="font-mono text-amber-400 font-bold">
                        {msg.bdpOrder.order_code}
                      </span>
                      <span className="text-stone-400">{msg.bdpOrder.table_number}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-stone-400">Total Comanda:</div>
                        <div className="text-xl font-bold font-mono text-white">
                          {Number(msg.bdpOrder.total_amount).toFixed(2)} €
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-amber-400 font-medium">Puntos a Ganar:</div>
                        <div className="text-lg font-bold font-mono text-amber-400">
                          +{msg.bdpOrder.points_preview} pts
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenPaymentModal(msg.bdpOrder!)}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Completar Pago con Pasarela BDP</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                    </button>
                  </div>
                )}

                <div
                  className={`text-[10px] mt-1.5 ${
                    msg.sender === 'user' ? 'text-stone-800 text-right' : 'text-stone-500'
                  }`}
                >
                  {msg.time}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-stone-850 border border-stone-800 rounded-2xl flex items-center gap-1.5 text-stone-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse [animation-delay:0.4s]" />
                <span className="ml-2 text-stone-400 text-xs">Gemini está analizando el comprobante BDP y calculando puntos...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Selected image preview chip */}
        {selectedImage && (
          <div className="px-4 py-2 bg-stone-950/80 border-t border-stone-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <img
                src={selectedImage.previewUrl}
                alt="Miniatura"
                className="w-8 h-8 rounded-lg object-cover border border-amber-500/40"
              />
              <div>
                <span className="text-white font-medium block truncate max-w-xs">{selectedImage.name}</span>
                <span className="text-[10px] text-amber-400">Listo para analizar con Gemini Vision</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Suggestion pills */}
        <div className="px-4 py-2 border-t border-stone-800/80 bg-stone-950/60 overflow-x-auto flex gap-2 flex-shrink-0 scrollbar-none">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s.text)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input form */}
        <div className="p-3 sm:p-4 bg-stone-900 border-t border-stone-800 flex-shrink-0">
          {/* Hidden file input for camera / image selection */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Camera / Upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Subir o fotografiar ticket impreso de BDP"
              className="w-11 h-11 rounded-2xl bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer border border-stone-700 flex-shrink-0"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Pega el QR del ticket (?t=...&m=...) o escribe tu pedido..."
              className="flex-1 bg-stone-950 border border-stone-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
            />

            <button
              type="submit"
              disabled={(!inputVal.trim() && !selectedImage) || loading}
              className="w-11 h-11 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};
