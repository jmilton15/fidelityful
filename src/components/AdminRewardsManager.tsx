import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Reward } from '../types';
import { formatPoints } from '../utils/format';
import {
  fetchRewards,
  createReward,
  updateReward,
  toggleRewardActive,
  deleteRewardPermanent,
} from '../api';
import {
  Gift,
  Plus,
  Edit2,
  Trash2,
  Pause,
  Play,
  Search,
  Sparkles,
  Layers,
  Box,
  Coins,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'cocteles', label: '🍸 Cócteles' },
  { id: 'cocina', label: '🥩 Cocina & Carnes' },
  { id: 'tapas', label: '🥟 Empanadas & Tapas' },
  { id: 'vinos', label: '🍷 Vinos & Cervezas' },
  { id: 'postres', label: '🍰 Postres' },
  { id: 'cafeteria', label: '☕ Cafetería' },
  { id: 'merchandising', label: '🎁 Merch / Otros' },
];

const EMOJI_OPTIONS = ['🍸', '🥩', '🥟', '🍷', '🍺', '🍰', '☕', '🎁', '🍕', '🍾', '🍟', '🥃'];

export const AdminRewardsManager: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost_points: 300,
    stock: 20,
    category: 'cocteles',
    image_emoji: '🍸',
    active: true,
  });

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    setLoading(true);
    try {
      const data = await fetchRewards();
      setRewards(data);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al cargar catálogo de premios' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingReward(null);
    setFormData({
      name: '',
      description: '',
      cost_points: 400,
      stock: 15,
      category: 'cocteles',
      image_emoji: '🍸',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || '',
      cost_points: reward.cost_points,
      stock: reward.stock,
      category: reward.category || 'cocteles',
      image_emoji: reward.image_emoji || '🎁',
      active: reward.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', text: 'El nombre del premio es obligatorio.' });
      return;
    }

    setSaving(true);
    try {
      if (editingReward) {
        await updateReward(editingReward.id, formData);
        setFeedback({ type: 'success', text: `¡Recompensa "${formData.name}" actualizada con éxito!` });
      } else {
        await createReward(formData);
        setFeedback({ type: 'success', text: `¡Recompensa "${formData.name}" agregada al catálogo!` });
      }
      setIsModalOpen(false);
      await loadRewards();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'No se pudo guardar la recompensa.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (reward: Reward) => {
    try {
      await toggleRewardActive(reward.id);
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, active: !r.active } : r))
      );
      setFeedback({
        type: 'success',
        text: `Premio "${reward.name}" ${reward.active ? 'pausado' : 'activado'} correctamente.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al cambiar estado' });
    }
  };

  const handleQuickStockChange = async (reward: Reward, delta: number) => {
    const newStock = Math.max(0, reward.stock + delta);
    try {
      await updateReward(reward.id, { stock: newStock });
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, stock: newStock } : r))
      );
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al ajustar stock' });
    }
  };

  const handleDeletePermanent = async (id: number) => {
    try {
      await deleteRewardPermanent(id);
      setRewards((prev) => prev.filter((r) => r.id !== id));
      setDeletingId(null);
      setFeedback({ type: 'success', text: 'Recompensa eliminada definitivamente del catálogo.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al eliminar recompensa' });
    }
  };

  const filteredRewards = rewards.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' ||
      (r.category && r.category.toLowerCase() === selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const activeCount = rewards.filter((r) => r.active).length;
  const totalStock = rewards.reduce((sum, r) => sum + r.stock, 0);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border text-sm transition-all animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline text-stone-300 hover:text-white cursor-pointer ml-3"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Header & Quick Stats */}
      <div className="p-5 sm:p-6 rounded-3xl bg-stone-900 border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
            <Gift className="w-3.5 h-3.5" />
            <span>Fulano Resto Bar · Catálogo de Premios</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
            Gestión Dinámica de Recompensas
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-xl">
            Controlá en tiempo real el stock, puntos requeridos, disponibilidad y categorías para la carta de fidelidad.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={loadRewards}
            disabled={loading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white border border-stone-700 transition cursor-pointer"
            title="Refrescar catálogo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-stone-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Premio</span>
          </button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Premios</span>
          <span className="text-xl sm:text-2xl font-extrabold text-white mt-1 block">{rewards.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Activos en Carta</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1 block">{activeCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Pausados / Agotados</span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1 block">{rewards.length - activeCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Stock Total Unidades</span>
          <span className="text-xl sm:text-2xl font-extrabold text-stone-200 mt-1 block">{totalStock}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción (ej: Mahou, Fernet, Asado)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 focus:border-amber-500/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-stone-500 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rewards Grid */}
      {loading ? (
        <div className="p-12 text-center bg-stone-900 rounded-3xl border border-stone-800 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-stone-400 text-sm">Cargando catálogo de recompensas...</p>
        </div>
      ) : filteredRewards.length === 0 ? (
        <div className="p-12 text-center bg-stone-900 rounded-3xl border border-stone-800 space-y-3">
          <Gift className="w-10 h-10 text-stone-600 mx-auto" />
          <h3 className="text-white font-bold text-base">No se encontraron recompensas</h3>
          <p className="text-stone-400 text-xs max-w-sm mx-auto">
            No hay productos que coincidan con los filtros seleccionados o el catálogo está vacío.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-amber-500 text-stone-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear la primera recompensa</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.map((reward) => (
            <div
              key={reward.id}
              className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                reward.active
                  ? 'bg-stone-900/90 border-stone-800 hover:border-stone-700 shadow-lg'
                  : 'bg-stone-900/40 border-stone-850 opacity-65'
              }`}
            >
              <div>
                {/* Header card with emoji & status */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-stone-950 border border-stone-850 flex items-center justify-center text-2xl shadow-inner">
                    {reward.image_emoji || '🎁'}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                        reward.active
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      {reward.active ? 'Disponible' : 'Pausado'}
                    </span>

                    <button
                      onClick={() => handleToggleActive(reward)}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white border border-stone-700 cursor-pointer transition"
                      title={reward.active ? 'Pausar disponibilidad' : 'Activar en catálogo'}
                    >
                      {reward.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="font-bold text-white text-base leading-snug">{reward.name}</h3>
                <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                  {reward.description || 'Sin descripción detallada.'}
                </p>

                {/* Metadata Pills */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-950 text-stone-400 border border-stone-800 capitalize">
                    {reward.category || 'consumicion'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                    {reward.cost_points.toLocaleString('es-ES')} pts
                  </span>
                </div>
              </div>

              {/* Bottom controls: Stock + Actions */}
              <div className="mt-5 pt-3.5 border-t border-stone-800/80 flex items-center justify-between gap-2">
                {/* Stock Controls */}
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold tracking-wider">
                    Stock
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <button
                      onClick={() => handleQuickStockChange(reward, -1)}
                      className="w-6 h-6 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                      title="Restar 1 unidad"
                    >
                      -
                    </button>
                    <span
                      className={`text-sm font-extrabold px-1.5 tabular-nums ${
                        reward.stock <= 3 ? 'text-rose-400' : 'text-stone-200'
                      }`}
                    >
                      {reward.stock}
                    </span>
                    <button
                      onClick={() => handleQuickStockChange(reward, 1)}
                      className="w-6 h-6 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                      title="Sumar 1 unidad"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Edit & Delete Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(reward)}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-amber-400 hover:text-amber-300 border border-stone-700 cursor-pointer transition"
                    title="Editar detalles del premio"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingId(reward.id)}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-rose-950/50 text-stone-400 hover:text-rose-400 border border-stone-700 hover:border-rose-800 cursor-pointer transition"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CREAR / EDITAR RECOMPENSA */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-xl bg-stone-800/80 hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
                  {formData.image_emoji}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-lg">
                    {editingReward ? 'Editar Recompensa' : 'Nueva Recompensa'}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {editingReward ? 'Modificá los parámetros del premio' : 'Agregá un premio al catálogo de Fulano'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                {/* Emoji selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    Ícono / Emoji representativo
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, image_emoji: emoji })}
                        className={`text-xl p-2 rounded-xl transition cursor-pointer ${
                          formData.image_emoji === emoji
                            ? 'bg-amber-500/30 border-2 border-amber-400 scale-110'
                            : 'bg-stone-950 border border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Nombre del Premio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cóctel de Autor Fulano, 2 Empanadas Criollas..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Breve detalle de la consumición o plato para el cliente..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-white text-xs outline-none transition"
                  />
                </div>

                {/* Cost & Stock Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                      Costo en Puntos *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={10}
                        step={10}
                        value={formData.cost_points}
                        onChange={(e) => setFormData({ ...formData, cost_points: Number(e.target.value) })}
                        className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white text-sm outline-none font-bold tabular-nums"
                      />
                      <Coins className="w-3.5 h-3.5 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                      Stock Disponible *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={0}
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                        className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white text-sm outline-none font-bold tabular-nums"
                      />
                      <Box className="w-3.5 h-3.5 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none capitalize"
                  >
                    <option value="cocteles">🍸 Cócteles & Tragos</option>
                    <option value="cocina">🥩 Cocina & Carnes</option>
                    <option value="tapas">🥟 Empanadas & Tapas</option>
                    <option value="vinos">🍷 Vinos & Cervezas</option>
                    <option value="postres">🍰 Postres</option>
                    <option value="cafeteria">☕ Cafetería</option>
                    <option value="merchandising">🎁 Merchandising / Regalo</option>
                  </select>
                </div>

                {/* Active Switch */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
                  <span className="text-xs text-stone-300 font-semibold">Publicar inmediatamente en carta</span>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold cursor-pointer transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-stone-950 text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer transition disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : editingReward ? 'Guardar Cambios' : 'Crear Premio'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN */}
      {deletingId !== null &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-rose-500/40 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <Trash2 className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="text-base font-bold text-white">¿Eliminar Recompensa?</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Esta acción eliminará permanentemente la recompensa del catálogo. Si solo quieres pausarla temporalmente, puedes usar la opción de <strong>Pausar</strong>.
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeletePermanent(deletingId)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
