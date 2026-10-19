import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { createUser } from '../api';
import { User } from '../types';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (newUser: User) => void;
}

export const NewUserModal: React.FC<NewUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+34 ');
  const [birthday, setBirthday] = useState('1996-10-15');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newUser = await createUser({
        name,
        email,
        phone,
        birthday,
      });
      onUserCreated(newUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al dar de alta al cliente');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-lg">Alta de Nuevo Cliente</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Crea una cuenta en FidelityFul y asigna el pase de fidelidad digital.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-stone-300 font-medium block mb-1">Nombre y Apellidos *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Laura González"
              className="w-full bg-stone-950 border border-stone-700 text-stone-100 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-stone-300 font-medium block mb-1">Correo Electrónico *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              className="w-full bg-stone-950 border border-stone-700 text-stone-100 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-300 font-medium block mb-1">Teléfono Móvil</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full bg-stone-950 border border-stone-700 text-stone-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-stone-300 font-medium block mb-1">Fecha de Nacimiento</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 text-stone-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 text-[11px] text-stone-400">
          El cliente iniciará en <strong>Nivel Bronce (0 pts, 0 visitas)</strong> y podrá comenzar a sumar puntos en cada consumición inmediatamente.
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Dar de Alta'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};
