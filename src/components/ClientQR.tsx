import React, { useState, useEffect } from 'react';
import { User } from '../types';
import QRCode from 'qrcode';
import {
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Download,
  Lightbulb,
} from 'lucide-react';
import { formatPoints } from '../utils/format';

interface ClientQRProps {
  user: User;
  compact?: boolean;
}

export const ClientQR: React.FC<ClientQRProps> = ({ user, compact = false }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    generateQR();

    async function generateQR() {
      if (!user?.uid) return;
      setLoading(true);
      setQrDataUrl(null);

      try {
        // Codificar el identificador único con margen ISO de 4 módulos y máxima redundancia (H)
        const url = await QRCode.toDataURL(user.uid, {
          width: 360,
          margin: 4, // Bloque ISO de seguridad para evitar recortes en esquinas
          color: {
            dark: '#000000', // Negro puro para contraste máximo ante cualquier cámara/lector
            light: '#ffffff', // Blanco puro
          },
          errorCorrectionLevel: 'H', // 30% de redundancia para lectura ultra rápida
        });

        if (isMounted) {
          setQrDataUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error generating secure QR code:', err);
        if (isMounted) setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  const handleCopy = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleRefresh = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setQrDataUrl(null);
    try {
      const url = await QRCode.toDataURL(user.uid, {
        width: 360,
        margin: 4,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(url);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `pase-qr-${user.uid || 'fulano'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // RENDER COMPACT (Para Modal Quick QR con 1 toque)
  if (compact) {
    return (
      <div className="flex flex-col items-center space-y-3.5 w-full">
        {/* Contenedor de pase QR con fondo blanco puro y margen de seguridad ISO */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-md border border-neutral-100 flex flex-col items-center justify-center mx-auto transition-transform">
          {loading ? (
            <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center gap-2 bg-stone-50 rounded-xl">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-[11px] text-stone-500 font-medium">Generando QR...</span>
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`Pase QR de ${user.name}`}
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain block select-none"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-stone-400 text-xs">
              No se pudo generar el código
            </div>
          )}
        </div>

        {/* Consejo visible para lectura óptima en barra */}
        <div className="w-full flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left text-amber-300 text-[11px] leading-tight">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-amber-200">Consejo de lectura:</strong> Sube el brillo de tu pantalla si el lector de barra no lo capta al instante.
          </p>
        </div>

        {/* Bloque con UID codificado */}
        <div className="w-full bg-stone-950 px-3 py-2 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
          <div className="text-left font-mono font-bold text-amber-300 truncate max-w-[170px] select-all">
            {user.uid}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-stone-400 hover:text-amber-400 transition cursor-pointer"
              title="Copiar UID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 text-stone-400 hover:text-amber-400 transition cursor-pointer"
              title="Descargar imagen QR"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER COMPLETO (Pestaña 'Pase QR')
  return (
    <div className="max-w-md mx-auto p-5 sm:p-7 rounded-3xl bg-stone-900 border border-stone-800 text-center space-y-5 shadow-2xl">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Identificación Segura de Socio</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
          Pase Digital QR
        </h2>
        <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
          Muestra este código al personal de Fulano Resto Bar para acumular tus puntos y aplicar beneficios de nivel.
        </p>
      </div>

      {/* Contenedor QR con fondo blanco puro y margen de seguridad ISO */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-neutral-100 inline-block mx-auto">
        {loading ? (
          <div className="w-52 h-52 sm:w-60 sm:h-60 flex flex-col items-center justify-center gap-3 bg-stone-50 rounded-xl relative overflow-hidden">
            <div className="w-10 h-10 rounded-full border-3 border-stone-300 border-t-amber-500 animate-spin" />
            <span className="text-[11px] font-medium text-stone-600 animate-pulse tracking-wide">
              Generando QR seguro...
            </span>
          </div>
        ) : qrDataUrl ? (
          <div className="relative">
            <img
              src={qrDataUrl}
              alt={`Pase QR de ${user.name}`}
              className="w-52 h-52 sm:w-60 sm:h-60 mx-auto object-contain block select-none"
            />
          </div>
        ) : (
          <div className="w-52 h-52 flex items-center justify-center text-stone-500 text-xs">
            No se pudo generar el código
          </div>
        )}
      </div>

      {/* Consejo visible para lectura en barra */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left text-amber-300 text-xs leading-relaxed max-w-sm mx-auto">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-amber-200">Consejo de lectura:</strong> Sube el brillo de tu pantalla si el lector de barra no lo capta al instante.
        </p>
      </div>

      {/* Bloque con identificador y utilidades */}
      <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 text-left space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400 text-[11px] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dato Codificado (Solo ID):</span>
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-amber-400 hover:text-amber-300 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
            title="Copiar identificador al portapapeles"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        <div className="font-mono text-sm font-bold text-white tracking-wider bg-stone-900/80 px-3 py-2 rounded-xl border border-stone-800 flex items-center justify-between">
          <span className="select-all">{user.uid}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="text-stone-400 hover:text-amber-400 transition-colors p-1 cursor-pointer"
              title="Descargar código QR para tu galería"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-stone-500 hover:text-stone-300 transition-colors p-1 cursor-pointer"
              title="Regenerar código QR"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <p className="text-[10px] text-stone-500 leading-tight">
          Por privacidad y seguridad, este código no almacena datos bancarios ni de contacto personal, únicamente tu identificador único de fidelidad.
        </p>
      </div>

      {/* Pie de tarjeta con nivel y saldo */}
      <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800">
        <div className="text-left">
          <span className="text-[10px] text-stone-500 block">Socio Titular</span>
          <span className="font-semibold text-white">{user.name}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-stone-500 block">Saldo Actual</span>
          <span className="font-bold text-amber-400">{formatPoints(user.points)}</span>
        </div>
      </div>
    </div>
  );
};
