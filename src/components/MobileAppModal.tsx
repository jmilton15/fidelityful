import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  X,
  Share2,
  Download,
  MessageCircle,
  QrCode as QrIcon,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [serverAppUrl, setServerAppUrl] = useState<string>('');

  // Fallback public Cloud Run domain
  const defaultCloudRunUrl = 'https://ais-dev-wrphcwscpzbtm55sfxocib-155619916328.europe-west2.run.app';

  // Fetch true server-side APP_URL when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/app-info')
        .then((r) => r.json())
        .then((data) => {
          if (data?.appUrl && typeof data.appUrl === 'string' && data.appUrl.startsWith('http')) {
            setServerAppUrl(data.appUrl);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Determine the best clean, public URL to open on smartphone
  const resolveTargetUrl = (): string => {
    // 1. If backend gave a public URL (Cloud Run service URL)
    if (serverAppUrl && !serverAppUrl.includes('localhost')) {
      return serverAppUrl;
    }

    // 2. If Vite injected VITE_APP_URL
    const viteEnvUrl = (import.meta as any)?.env?.VITE_APP_URL;
    if (viteEnvUrl && typeof viteEnvUrl === 'string' && viteEnvUrl.startsWith('http') && !viteEnvUrl.includes('localhost')) {
      return viteEnvUrl;
    }

    // 3. If window origin is public and not localhost or internal developer console
    if (typeof window !== 'undefined' && window.location.origin) {
      const origin = window.location.origin;
      if (!origin.includes('localhost') && !origin.includes('aistudio.google.com')) {
        return origin;
      }
    }

    return defaultCloudRunUrl;
  };

  const sharedUrl = resolveTargetUrl();

  // Generate ultra-sharp, high-contrast, perfectly framed QR with proper 4-module quiet zone
  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(sharedUrl, {
        width: 400,
        margin: 4, // 4 modules ISO quiet zone so cameras and scanners lock on instantly
        color: {
          dark: '#000000', // Pure black for max optical contrast
          light: '#ffffff', // Pure white
        },
        errorCorrectionLevel: 'H', // High (30% redundancy) to prevent any scanning failures
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Error generating mobile QR:', err));
    }
  }, [isOpen, sharedUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sharedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = 'fulano-resto-bar-qr-movil.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Entra a Fulano Resto Bar - Club de Fidelidad:\n${sharedUrl}`
  )}`;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-stone-900 border-2 border-amber-500/60 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative text-stone-100 my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Glow de fondo decorativo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-750 transition cursor-pointer z-10 border border-stone-700/80"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado fijo */}
        <div className="flex items-center gap-3 mb-4 pr-10 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shrink-0 shadow-md shadow-amber-500/10">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Abrir en tu Celular
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/40">
                100% Móvil
              </span>
            </h3>
            <p className="text-xs text-stone-400">
              Escanea el código QR con tu cámara
            </p>
          </div>
        </div>

        {/* Contenido scrolleable para pantallas de cualquier altura */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          
          {/* QR Code Container - Garantizado visible y nítido */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center shadow-xl mx-auto w-fit border-2 border-amber-500/40">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Código QR para abrir FidelityFul en el celular"
                className="w-44 h-44 sm:w-52 sm:h-52 max-w-full aspect-square block select-none rounded-none"
              />
            ) : (
              <div className="w-44 h-44 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-stone-500 text-xs gap-2">
                <QrIcon className="w-8 h-8 animate-pulse text-amber-600" />
                <span>Generando código QR nítido...</span>
              </div>
            )}
            <div className="text-[11px] text-stone-700 font-bold mt-2 text-center flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>Apunta con la cámara de tu teléfono</span>
            </div>
          </div>

          {/* Explicación concisa y amigable */}
          <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl text-xs space-y-1.5 text-stone-300">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <Info className="w-4 h-4 shrink-0" />
              <span>Acceso directo sin claves ni Google AI Studio</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Este enlace te conecta directamente con la versión web app de <strong>Fulano Resto Bar</strong> (Paseo Imperial 35, Madrid). No requiere iniciar sesión en Google ni permisos especiales.
            </p>
          </div>

          {/* Input con enlace para copiar */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Enlace Directo de la Aplicación:
            </label>
            <div className="flex items-center gap-2 bg-stone-950 p-1.5 pl-3 rounded-xl border border-stone-800">
              <span className="text-xs font-mono text-amber-300 truncate flex-1 select-all">
                {sharedUrl}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 text-stone-950 shadow-sm shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-sm shadow-amber-500/20'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Botones de acción rápida: WhatsApp y Descargar QR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar a mi WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-stone-700 cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Descargar Imagen QR</span>
            </button>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-stone-800 flex flex-wrap justify-between items-center gap-2 text-[11px] text-stone-400">
            <span>Fulano Resto Bar · Fidelidad Digital</span>
            <a
              href={sharedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              Abrir en nueva pestaña <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
