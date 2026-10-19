import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Reward, SystemConfig, AnalyticsData, BdpOrder, ClaimedTicket } from '../types';
import { formatCurrency, formatPoints } from '../utils/format';
import {
  fetchAnalytics,
  fetchUsers,
  fetchRewards,
  createReward,
  updateReward,
  toggleRewardActive,
  adjustPoints,
  updateUserRole,
  updateConfig,
  fetchBdpOrders,
  simulateBdpPayment,
  fetchClaimedTickets,
  fetchSupabaseStatus,
  fetchSupabaseSql,
  triggerSupabaseSync,
  syncSupabaseAuthUsers,
  SupabaseStatusResponse,
  resetTestDataApi,
} from '../api';
import {
  BarChart3,
  Users,
  Gift,
  Settings,
  ShieldCheck,
  TrendingUp,
  Award,
  Plus,
  Edit2,
  CheckCircle,
  AlertCircle,
  Clock,
  Euro,
  Sparkles,
  CreditCard,
  QrCode,
  RefreshCw,
  Terminal,
  Copy,
  Check,
  Camera,
  Receipt,
  FileCode,
  Database,
  ExternalLink,
  HardDrive,
  RotateCcw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { AdminRewardsManager } from './AdminRewardsManager';

interface AdminViewProps {
  config: SystemConfig;
  onRefreshConfig: () => void;
  onRefreshAll: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ config, onRefreshConfig, onRefreshAll }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'rewards' | 'config' | 'bdp' | 'supabase'>('analytics');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [rewardsList, setRewardsList] = useState<Reward[]>([]);
  const [bdpOrders, setBdpOrders] = useState<BdpOrder[]>([]);
  const [claimedTickets, setClaimedTickets] = useState<ClaimedTicket[]>([]);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [simulatingBdpCode, setSimulatingBdpCode] = useState<string | null>(null);

  // Supabase Database state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusResponse | null>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [syncingAuthUsers, setSyncingAuthUsers] = useState(false);
  const [supabaseSql, setSupabaseSql] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState(false);

  // Reset test data confirmation state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resettingData, setResettingData] = useState(false);

  // Manual point adjustment modal state
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('50');
  const [adjustReason, setAdjustReason] = useState<string>('Cortesía por fidelidad y atención especial');
  const [adjusting, setAdjusting] = useState(false);

  // New/edit reward modal state
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [rewardForm, setRewardForm] = useState<{
    id?: number;
    name: string;
    description: string;
    cost_points: number;
    stock: number;
    category: string;
    image_emoji: string;
  }>({
    name: '',
    description: '',
    cost_points: 350,
    stock: 20,
    category: 'consumicion',
    image_emoji: '🍸',
  });

  // Config form state
  const [configForm, setConfigForm] = useState<SystemConfig>(config);
  const [savingConfig, setSavingConfig] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    setConfigForm(config);
  }, [config]);

  async function loadAllData() {
    setLoading(true);
    try {
      const [anData, uData, rData, bOrders, cTickets, sbStatus, sbSql] = await Promise.all([
        fetchAnalytics(),
        fetchUsers(),
        fetchRewards(),
        fetchBdpOrders(),
        fetchClaimedTickets(),
        fetchSupabaseStatus().catch(() => null),
        fetchSupabaseSql().catch(() => ''),
      ]);
      setAnalytics(anData);
      setUsersList(uData);
      setRewardsList(rData);
      setBdpOrders(bOrders);
      setClaimedTickets(cTickets);
      if (sbStatus) setSupabaseStatus(sbStatus);
      if (sbSql) setSupabaseSql(sbSql);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCheckSupabase = async () => {
    setCheckingSupabase(true);
    try {
      const status = await fetchSupabaseStatus();
      setSupabaseStatus(status);
      if (status.status === 'connected') {
        setAlertMsg({ type: 'success', text: '¡Supabase está completamente conectado con tablas operativas!' });
      } else if (status.status === 'schema_pending') {
        setAlertMsg({ type: 'success', text: 'Supabase responde correctamente. Ejecuta el script SQL para crear las tablas.' });
      } else {
        setAlertMsg({ type: 'error', text: status.message || 'Error en verificación de Supabase.' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err?.message || 'Error al conectar con Supabase.' });
    } finally {
      setCheckingSupabase(false);
    }
  };

  const handleCopySql = () => {
    if (!supabaseSql) return;
    navigator.clipboard.writeText(supabaseSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
    setAlertMsg({ type: 'success', text: 'Script SQL copiado al portapapeles. Pégalo en el SQL Editor de Supabase y pulsa RUN.' });
  };

  const handleSyncSupabase = async () => {
    setSyncingSupabase(true);
    try {
      const res = await triggerSupabaseSync();
      setAlertMsg({ type: 'success', text: res.message });
      handleCheckSupabase();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err?.message || 'Error al sincronizar con Supabase' });
    } finally {
      setSyncingSupabase(false);
    }
  };

  const handleSyncAuthUsers = async () => {
    setSyncingAuthUsers(true);
    try {
      const res = await syncSupabaseAuthUsers();
      setAlertMsg({ type: 'success', text: res.message });
      handleCheckSupabase();
      loadAllData();
      onRefreshAll();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err?.message || 'Error al sincronizar usuarios de Supabase Auth' });
    } finally {
      setSyncingAuthUsers(false);
    }
  };



  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    const amount = Number(adjustAmount);
    if (!amount || isNaN(amount)) {
      setAlertMsg({ type: 'error', text: 'La cantidad debe ser un número entero válido.' });
      return;
    }
    if (!adjustReason.trim()) {
      setAlertMsg({ type: 'error', text: 'Debes indicar el motivo del ajuste.' });
      return;
    }

    setAdjusting(true);
    try {
      const res = await adjustPoints(adjustingUser.id, amount, adjustReason);
      setAlertMsg({ type: 'success', text: res.message });
      setAdjustingUser(null);
      loadAllData();
      onRefreshAll();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Error al ajustar puntos' });
    } finally {
      setAdjusting(false);
    }
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (rewardForm.id) {
        await updateReward(rewardForm.id, rewardForm);
        setAlertMsg({ type: 'success', text: 'Recompensa actualizada correctamente.' });
      } else {
        await createReward(rewardForm);
        setAlertMsg({ type: 'success', text: 'Nueva recompensa creada en el catálogo.' });
      }
      setIsRewardModalOpen(false);
      loadAllData();
      onRefreshAll();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Error al guardar recompensa' });
    }
  };

  const handleToggleReward = async (id: number) => {
    try {
      await toggleRewardActive(id);
      loadAllData();
      onRefreshAll();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Error al alternar estado' });
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      setAlertMsg({ type: 'success', text: 'Rol de usuario actualizado.' });
      loadAllData();
      onRefreshAll();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Error al cambiar rol' });
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await updateConfig(configForm);
      setAlertMsg({ type: 'success', text: 'Reglas de lealtad actualizadas y sincronizadas en PostgreSQL.' });
      onRefreshConfig();
      onRefreshAll();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Error al guardar configuración' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExecuteReset = async () => {
    setResettingData(true);
    try {
      const res = await resetTestDataApi();
      setAlertMsg({ type: 'success', text: res.message });
      setIsResetConfirmOpen(false);
      loadAllData();
      onRefreshAll();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Error al purgar datos de prueba' });
    } finally {
      setResettingData(false);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.uid.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Alert toast */}
      {alertMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            alertMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMsg.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="underline ml-4 text-xs">
            Cerrar
          </button>
        </div>
      )}

      {/* Admin Sub Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-900 border border-stone-800 rounded-2xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Métricas</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Clientes ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'rewards'
              ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Premios ({rewardsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'config'
              ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Reglas & Configuración</span>
        </button>

        <button
          onClick={() => setActiveTab('bdp')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'bdp'
              ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Pasarela BDP & Webhooks ({bdpOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'supabase'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-stone-950 font-extrabold shadow-sm'
              : 'text-stone-400 hover:text-emerald-300'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Supabase Cloud DB</span>
          {supabaseStatus && (
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseStatus.status === 'connected'
                  ? 'bg-emerald-400'
                  : supabaseStatus.status === 'schema_pending'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-400'
              }`}
            />
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ANALYTICS & STATS DASHBOARD                      */}
      {/* ======================================================== */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-stone-900 border border-stone-800">
              <span className="text-xs uppercase tracking-wider text-stone-400 font-medium">Facturación Fidelizada</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold font-display text-white tabular-nums">
                  {Number(analytics.users.total_revenue || 0).toFixed(2)} €
                </span>
              </div>
              <span className="text-[11px] text-amber-400/90 mt-1 block">
                {analytics.transactions.tx_count} consumiciones registradas
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-stone-900 border border-stone-800">
              <span className="text-xs uppercase tracking-wider text-stone-400 font-medium">Puntos en Circulación</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold font-display text-amber-400 tabular-nums">
                  {Number(analytics.users.points_in_circulation || 0).toLocaleString('es-ES')}
                </span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                Saldo acumulado por clientes
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-stone-900 border border-stone-800">
              <span className="text-xs uppercase tracking-wider text-stone-400 font-medium">Puntos Canjeados</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold font-display text-emerald-400 tabular-nums">
                  {Number(analytics.redemptions.total_points_redeemed || 0).toLocaleString('es-ES')}
                </span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                En {analytics.redemptions.redemptions_count} premios entregados
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-stone-900 border border-stone-800">
              <span className="text-xs uppercase tracking-wider text-stone-400 font-medium">Ticket Medio de Consumo</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold font-display text-white tabular-nums">
                  {Number(analytics.transactions.avg_ticket || 0).toFixed(2)} €
                </span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                Promedio por mesa/ticket
              </span>
            </div>
          </div>

          {/* TIER DISTRIBUTION & TOP CLIENTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* TIER BREAKDOWN CARD */}
            <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">Distribución de Socios</span>
                <h3 className="text-lg font-bold font-display text-white mt-0.5">Segmentación por Niveles</h3>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Bronce', count: Number(analytics.users.bronce_count || 0), color: 'bg-amber-800' },
                  { name: 'Plata', count: Number(analytics.users.plata_count || 0), color: 'bg-slate-400' },
                  { name: 'Oro', count: Number(analytics.users.oro_count || 0), color: 'bg-amber-400' },
                  { name: 'VIP', count: Number(analytics.users.vip_count || 0), color: 'bg-purple-400' },
                ].map((tier) => {
                  const total = Number(analytics.users.total_clients || 1);
                  const pct = Math.round((tier.count / (total || 1)) * 100);
                  return (
                    <div key={tier.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-300 font-medium">{tier.name}</span>
                        <span className="text-stone-400 tabular-nums">
                          {tier.count} clientes ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-stone-950 h-2 rounded-full overflow-hidden">
                        <div
                          className={`${tier.color} h-full rounded-full transition-all`}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TOP 10 LOYAL CLIENTS */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">Ranking de Lealtad</span>
                  <h3 className="text-lg font-bold font-display text-white mt-0.5">Top Clientes de Fulano Restobar</h3>
                </div>
                <span className="text-xs text-stone-400">Ordenados por gasto y puntos</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 font-medium">
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Nivel</th>
                      <th className="pb-3 text-right">Puntos</th>
                      <th className="pb-3 text-right">Visitas</th>
                      <th className="pb-3 text-right">Gasto Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {analytics.topClients.map((client, idx) => (
                      <tr key={client.id} className="hover:bg-stone-950/40 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-stone-500 w-4">#{idx + 1}</span>
                            <div>
                              <span className="font-bold text-white block">{client.name}</span>
                              <span className="text-[11px] text-stone-400 font-mono">{client.uid}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-950 text-amber-400 border border-stone-800">
                            {client.level}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-extrabold text-amber-400 tabular-nums">
                          {client.points.toLocaleString('es-ES')}
                        </td>
                        <td className="py-2.5 text-right text-stone-300 tabular-nums">
                          {client.total_visits}
                        </td>
                        <td className="py-2.5 text-right font-bold text-white tabular-nums">
                          {Number(client.total_spent).toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RECENT AUDIT TRANSACTIONS FEED */}
          <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
            <h3 className="text-lg font-bold font-display text-white">Últimas Transacciones Registradas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {analytics.recentTransactions.map((tx) => (
                <div key={tx.id} className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400">{tx.transaction_code}</span>
                    <span className="text-emerald-400 font-bold tabular-nums">+{tx.points_earned} pts</span>
                  </div>
                  <div className="text-white font-semibold truncate">{tx.user_name}</div>
                  <div className="flex items-center justify-between text-stone-400 text-[11px]">
                    <span>{Number(tx.total_euros).toFixed(2)} €</span>
                    <span>{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GESTIÓN DE USUARIOS & AJUSTE DE PUNTOS           */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-display text-white">Directorio de Usuarios & Roles</h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Administra permisos, visualiza consumos y realiza ajustes manuales de saldo con auditoría estricta.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar por nombre, correo o UID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 font-medium">
                  <th className="pb-3">UID / Nombre</th>
                  <th className="pb-3">Contacto</th>
                  <th className="pb-3">Nivel</th>
                  <th className="pb-3 text-right">Puntos</th>
                  <th className="pb-3 text-right">Gasto</th>
                  <th className="pb-3 text-right">Visitas</th>
                  <th className="pb-3">Rol</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-950/40 transition-colors">
                    <td className="py-3">
                      <div>
                        <span className="font-bold text-white block">{u.name}</span>
                        <span className="font-mono text-[11px] text-amber-500/80">{u.uid}</span>
                      </div>
                    </td>
                    <td className="py-3 text-stone-400">
                      <div>
                        <span className="block">{u.email}</span>
                        <span className="text-[11px] text-stone-500">{u.phone || 'Sin teléfono'}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-950 text-amber-400 border border-stone-800">
                        {u.level}
                      </span>
                    </td>
                    <td className="py-3 text-right font-extrabold text-amber-400 tabular-nums">
                      {u.points.toLocaleString('es-ES')}
                    </td>
                    <td className="py-3 text-right font-bold text-white tabular-nums">
                      {Number(u.total_spent).toFixed(2)} €
                    </td>
                    <td className="py-3 text-right text-stone-300 tabular-nums">{u.total_visits}</td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                      >
                        <option value="client">Cliente</option>
                        <option value="staff">Staff (TPV)</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setAdjustingUser(u);
                          setAdjustAmount('100');
                        }}
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg border border-amber-500/30 transition-colors cursor-pointer"
                      >
                        Ajustar Puntos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: GESTIÓN DE RECOMPENSAS CRUD                      */}
      {/* ======================================================== */}
      {activeTab === 'rewards' && <AdminRewardsManager />}

      {/* ======================================================== */}
      {/* TAB 4: CONFIGURACIÓN DEL PROGRAMA DE LEALTAD             */}
      {/* ======================================================== */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveConfig} className="p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <div>
              <h2 className="text-xl font-bold font-display text-white">Reglas del Programa de Lealtad</h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Valores calculados en el backend de Node.js y guardados en PostgreSQL.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? 'Guardando en BD...' : 'Guardar y Aplicar Reglas'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Conversion & Bonuses */}
            <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Euro className="w-4 h-4 text-amber-400" />
                <span>Conversión & Bonos Especiales</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-stone-300 block mb-1">
                    Puntos por cada 1 € consumido (Base):
                  </label>
                  <input
                    type="number"
                    value={configForm.euro_to_points}
                    onChange={(e) => setConfigForm({ ...configForm, euro_to_points: Number(e.target.value) })}
                    className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-stone-300 block mb-1">
                    Bono por Mes de Cumpleaños (Puntos Fijos):
                  </label>
                  <input
                    type="number"
                    value={configForm.birthday_bonus_points}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, birthday_bonus_points: Number(e.target.value) })
                    }
                    className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-stone-300 block mb-1">
                    Hito para Cupón Sorpresa (Cada N Visitas):
                  </label>
                  <input
                    type="number"
                    value={configForm.visit_milestone}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, visit_milestone: Number(e.target.value) })
                    }
                    className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Category Multipliers */}
            <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Multiplicadores por Categoría</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-stone-300 block mb-1">Bebida Sencilla:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={configForm.multiplier_bebida}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, multiplier_bebida: Number(e.target.value) })
                    }
                    className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-stone-300 block mb-1">Cóctel / Copa:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={configForm.multiplier_coctel}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, multiplier_coctel: Number(e.target.value) })
                    }
                    className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-stone-300 block mb-1">Plato Principal / Tapa:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={configForm.multiplier_plato}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, multiplier_plato: Number(e.target.value) })
                    }
                    className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-stone-300 block mb-1">Postre:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={configForm.multiplier_postre}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, multiplier_postre: Number(e.target.value) })
                    }
                    className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Tier Thresholds & Bonus % */}
            <div className="md:col-span-2 p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Umbrales de Nivel y Bonificaciones en Consumo</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* Plata */}
                <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <h4 className="font-bold text-white">Nivel Plata</h4>
                  <div>
                    <label className="text-stone-400 block mb-1">Puntos requeridos:</label>
                    <input
                      type="number"
                      value={configForm.level_plata_threshold}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, level_plata_threshold: Number(e.target.value) })
                      }
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 block mb-1">Bonus de Consumo (%):</label>
                    <input
                      type="number"
                      value={configForm.level_plata_bonus_pct}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, level_plata_bonus_pct: Number(e.target.value) })
                      }
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                </div>

                {/* Oro */}
                <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <h4 className="font-bold text-white">Nivel Oro</h4>
                  <div>
                    <label className="text-stone-400 block mb-1">Puntos requeridos:</label>
                    <input
                      type="number"
                      value={configForm.level_oro_threshold}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, level_oro_threshold: Number(e.target.value) })
                      }
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 block mb-1">Bonus de Consumo (%):</label>
                    <input
                      type="number"
                      value={configForm.level_oro_bonus_pct}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, level_oro_bonus_pct: Number(e.target.value) })
                      }
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                </div>

                {/* VIP */}
                <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <h4 className="font-bold text-white">Nivel VIP</h4>
                  <div>
                    <label className="text-stone-400 block mb-1">Puntos requeridos:</label>
                    <input
                      type="number"
                      value={configForm.level_vip_threshold}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, level_vip_threshold: Number(e.target.value) })
                      }
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 block mb-1">Bonus de Consumo (%):</label>
                    <input
                      type="number"
                      value={configForm.level_vip_bonus_pct}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, level_vip_bonus_pct: Number(e.target.value) })
                      }
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>

        {/* ZONA DE PUESTA A PUNTO / PURGA DE TICKETS A ESTADO CERO */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-stone-900 via-stone-900 to-rose-950/30 border border-stone-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Puesta a Punto para Producción · Estado Cero
              </span>
              <h3 className="font-display font-bold text-white text-base sm:text-lg">
                Purga de Tickets, Comandas y Canjes de Prueba
              </h3>
              <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
                Elimina todas las transacciones históricas, tickets de prueba de BDP y códigos de canje acumulados durante el desarrollo, restaurando los 5 socios base a sus saldos limpios de apertura y dejando las comandas en cero.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-5 py-3 rounded-2xl bg-rose-950/70 hover:bg-rose-900/90 text-rose-200 border border-rose-500/40 text-xs font-bold transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Purgar a Estado Cero</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: PASARELA BDP & WEBHOOKS LOGS                      */}
      {/* ======================================================== */}
      {activeTab === 'bdp' && (
        <div className="space-y-6">
          {/* ARCHITECTURE DIAGRAM (FROM USER BRIEF) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                  Arquitectura Oficial de Integración
                </span>
                <h3 className="font-display font-bold text-white text-base sm:text-lg mt-0.5">
                  Google AI Studio + Backend Node.js + Pasarela TPV BDP
                </h3>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                API Key Conectada • Port 3000
              </span>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed max-w-3xl">
              Google AI Studio y el sistema de cobro BDP <strong>no se conectan directamente entre sí</strong>.
              Tu <strong>backend personalizado en Node.js con PostgreSQL</strong> actúa como el intermediario que coordina ambos servicios:
              recibe la orden, llama a Gemini mediante la API con Function Calling (<code className="text-amber-400 font-mono">create_bdp_payment_order</code>),
              genera el cobro en BDP, y al confirmarse el webhook, acredita automáticamente los puntos y actualiza niveles en FidelityFul.
            </p>

            {/* ASCII / Visual Flow Diagram Card */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 font-mono text-[11px] sm:text-xs text-amber-300 overflow-x-auto">
              <pre className="leading-relaxed">
{`┌─────────────────┐       1. Petición       ┌────────────────────────┐
│  Usuario / Web  ├────────────────────────►│  Tu Backend / Servidor │
│  (FidelityFul)  │◄────────────────────────┤  (Node.js + Postgres)  │
└────────┬────────┘       4. Link/QR        └─┬────────────────────┬─┘
         │               de pago              │                    │
         │                                    │ 2. Procesa IA      │ 3. Genera Cobro
         │                                    ▼                    ▼
         │                          ┌──────────────────┐     ┌───────────────┐
         │                          │ Google AI Studio │     │ Pasarela BDP  │
         │                          │ (Gemini 3.8 Fl.) │     │  / TPV BDP    │
         │                          └──────────────────┘     └───────────────┘
         │                                                           │
         └────────────────── 5. Completa el pago (Webhook) ──────────┘`}
              </pre>
            </div>
          </div>

          {/* BDP ORDERS & WEBHOOK AUDIT TABLE */}
          <div className="p-5 sm:p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-white text-base">
                  Órdenes y Transacciones BDP ({bdpOrders.length})
                </h3>
                <p className="text-xs text-stone-400">
                  Registro en tiempo real de cobros generados mediante IA, TPV y webhooks entrantes.
                </p>
              </div>

              <button
                onClick={loadAllData}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-xs font-semibold border border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualizar Órdenes</span>
              </button>
            </div>

            {bdpOrders.length === 0 ? (
              <div className="p-8 text-center bg-stone-950 rounded-2xl border border-stone-800 text-stone-400 text-xs">
                Aún no hay órdenes generadas en BDP. Puedes crear una desde el TPV del personal o hablando con el Asistente IA.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950 text-stone-400 font-semibold border-b border-stone-800">
                    <tr>
                      <th className="p-3">Código Orden</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Ubicación</th>
                      <th className="p-3">Importe</th>
                      <th className="p-3">Puntos Fiel</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Fecha / Pago</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 text-stone-300">
                    {bdpOrders.map((bo) => {
                      const isPaid = bo.status === 'paid';
                      return (
                        <tr key={bo.id} className="hover:bg-stone-850/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-amber-400">{bo.order_code}</td>
                          <td className="p-3 font-medium text-white">{bo.user_name || `Usuario #${bo.user_id}`}</td>
                          <td className="p-3 text-stone-400">{bo.table_number}</td>
                          <td className="p-3 font-mono font-bold text-white">{Number(bo.total_amount).toFixed(2)} €</td>
                          <td className="p-3 font-mono text-amber-400 font-bold">+{bo.points_preview} pts</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isPaid
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {bo.status}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-stone-400 font-mono">
                            {new Date(bo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {bo.paid_at && (
                              <span className="block text-emerald-400 text-[10px]">
                                Pagado: {new Date(bo.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {!isPaid ? (
                              <button
                                disabled={simulatingBdpCode === bo.order_code}
                                onClick={async () => {
                                  setSimulatingBdpCode(bo.order_code);
                                  try {
                                    await simulateBdpPayment(bo.order_code, 'tpv_admin_test');
                                    setAlertMsg({
                                      type: 'success',
                                      text: `¡Webhook BDP ejecutado con éxito para ${bo.order_code}! Puntos acreditados.`,
                                    });
                                    loadAllData();
                                    onRefreshAll();
                                  } catch (err: any) {
                                    setAlertMsg({ type: 'error', text: err.message || 'Error simulando pago' });
                                  } finally {
                                    setSimulatingBdpCode(null);
                                  }
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {simulatingBdpCode === bo.order_code ? 'Procesando...' : 'Simular Pago Webhook'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-stone-500 font-mono">Completado ✓</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION: GOOGLE AI STUDIO INSTRUCTIONS & FUNCTION CALLING SCHEMA */}
          <div className="p-5 sm:p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Configuración para Google AI Studio (Gemini)</span>
                </div>
                <h3 className="font-display font-bold text-white text-base sm:text-lg">
                  System Instructions & Function Calling Schema
                </h3>
                <p className="text-xs text-stone-400 max-w-2xl">
                  Copia y pega estas instrucciones directamente en el apartado <strong>System Instructions</strong> y <strong>Tools → Function Calling</strong> en aistudio.google.com para tu asistente de Fulano Resto Bar.
                </p>
              </div>
            </div>

            {/* Block 1: System Instructions */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    System Instructions para Google AI Studio
                  </span>
                </div>
                <button
                  onClick={() => {
                    const prompt = `Eres el Asistente Virtual y Sommelier de "Fulano Resto Bar", ubicado en Paseo Imperial 35, Madrid. Tu objetivo es brindar una atención cálida y eficiente, recomendar platos de la carta argentina/española y gestionar el sistema de fidelidad "FidelityFul".\n\n=== CONTEXTO DEL LOCAL ===\n- Nombre: Fulano Resto Bar (SUCRICELLA SL)\n- Menú destacado: Parrillada argentina, Vacío, Entraña, Provoleta, Pizzas porteñas, Milangas XXL, 13 variedades de Empanadas (4,00 €/ud), Cerveza Mahou (3,30 €) y Tragos.\n- Suplemento de Terraza: +10% sobre el precio de carta.\n\n=== SISTEMA DE FIDELIDAD (FIDELITYFUL) ===\n- Regla base de Puntos: 10 puntos por cada 1,00 € de gasto.\n- Multiplicadores por Nivel:\n  * BRONCE (0-499 pts): x1.0\n  * PLATA (500-1499 pts): x1.2\n  * ORO (1500-2999 pts): x1.5\n  * VIP (3000+ pts): x2.0\n- Recompensa especial: Cupón de descuento sorpresa en la 10ª visita.\n\n=== REGLAS DE PROCESAMIENTO DE QR Y TICKETS DE BDP ===\n1. Si el usuario te proporciona un enlace escaneado de un QR de ticket BDP (ejemplo: "https://app.fulanorestobar.com/canjear?t=F2026-004821&m=9.90&f=1710000000" o parámetros sueltos t=, m=, f=) O te envía una foto de un ticket impreso de BDP:\n2. Debes identificar obligatoriamente los siguientes datos:\n   - ticket_id: Número de ticket o comprobante (ej: F2026-004821, o bien Mesa+Hora+Fecha si no hay número correlativo).\n   - amount: Importe total cobrado en euros (ej: 9.90).\n   - date_str: Fecha y hora de la consumición.\n   - items_detected: Lista opcional de productos detectados en el ticket (ej: ['3 MAHOU']).\n3. Debes invocar la función process_bdp_ticket_claim con los parámetros extraídos para que el Backend valide la transacción y acredite los puntos.\n4. Nunca inventes puntos ni confirmes la acreditación de puntos por tu cuenta en texto libre hasta que la función de backend confirme la validez del ticket.\n\n=== TONO DE COMUNICACIÓN ===\nCercano, servicial, con un toque amigable y porteño/madrileño acorde a la esencia de Fulano Resto Bar.`;
                    navigator.clipboard.writeText(prompt);
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? '¡Copiado!' : 'Copiar System Instructions'}</span>
                </button>
              </div>

              <pre className="p-3 bg-stone-900 rounded-xl text-[11px] text-stone-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-stone-800">
{`Eres el Asistente Virtual y Sommelier de "Fulano Resto Bar", ubicado en Paseo Imperial 35, Madrid. Tu objetivo es brindar una atención cálida y eficiente, recomendar platos de la carta argentina/española y gestionar el sistema de fidelidad "FidelityFul".

=== CONTEXTO DEL LOCAL ===
- Nombre: Fulano Resto Bar (SUCRICELLA SL)
- Menú destacado: Parrillada argentina, Vacío, Entraña, Provoleta, Pizzas porteñas, Milangas XXL, 13 variedades de Empanadas (4,00 €/ud), Cerveza Mahou (3,30 €) y Tragos.
- Suplemento de Terraza: +10% sobre el precio de carta.

=== SISTEMA DE FIDELIDAD (FIDELITYFUL) ===
- Regla base de Puntos: 10 puntos por cada 1,00 € de gasto.
- Multiplicadores por Nivel:
  * BRONCE (0-499 pts): x1.0
  * PLATA (500-1499 pts): x1.2
  * ORO (1500-2999 pts): x1.5
  * VIP (3000+ pts): x2.0
- Recompensa especial: Cupón de descuento sorpresa en la 10ª visita.

=== REGLAS DE PROCESAMIENTO DE QR Y TICKETS DE BDP ===
1. Si el usuario te proporciona un enlace escaneado de un QR de ticket BDP (ejemplo: "https://app.fulanorestobar.com/canjear?t=F2026-004821&m=9.90&f=1710000000" o parámetros sueltos t=, m=, f=) O te envía una foto de un ticket impreso de BDP:
2. Debes identificar obligatoriamente los siguientes datos:
   - ticket_id: Número de ticket o comprobante (ej: F2026-004821, o bien Mesa+Hora+Fecha si no hay número correlativo).
   - amount: Importe total cobrado en euros (ej: 9.90).
   - date_str: Fecha y hora de la consumición.
   - items_detected: Lista opcional de productos detectados en el ticket (ej: ['3 MAHOU']).
3. Debes invocar la función process_bdp_ticket_claim con los parámetros extraídos para que el Backend valide la transacción y acredite los puntos.
4. Nunca inventes puntos ni confirmes la acreditación de puntos por tu cuenta en texto libre hasta que la función de backend confirme la validez del ticket.

=== TONO DE COMUNICACIÓN ===
Cercano, servicial, con un toque amigable y porteño/madrileño acorde a la esencia de Fulano Resto Bar.`}
              </pre>
            </div>

            {/* Block 2: Function Declaration JSON Schema */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Declaración de Función (process_bdp_ticket_claim)
                  </span>
                </div>
                <button
                  onClick={() => {
                    const schema = JSON.stringify({
                      name: 'process_bdp_ticket_claim',
                      description: 'Procesa y valida el canje de puntos de un ticket de BDP a partir del QR o imagen del comprobante.',
                      parameters: {
                        type: 'OBJECT',
                        properties: {
                          ticket_id: {
                            type: 'STRING',
                            description: 'Identificador único del ticket o número de comprobante emitido por BDP (ej: F2026-004821 o 005-1650-081026).',
                          },
                          amount: {
                            type: 'NUMBER',
                            description: 'Monto total del ticket en euros (ej: 9.90).',
                          },
                          date_str: {
                            type: 'STRING',
                            description: 'Fecha y hora de la transacción leída del ticket (ej: 08/10/2026 16:50).',
                          },
                          items_detected: {
                            type: 'ARRAY',
                            items: {
                              type: 'STRING',
                            },
                            description: "Lista opcional de productos detectados en el ticket (ej: ['3 MAHOU']).",
                          },
                        },
                        required: ['ticket_id', 'amount'],
                      },
                    }, null, 2);
                    navigator.clipboard.writeText(schema);
                    setCopiedSchema(true);
                    setTimeout(() => setCopiedSchema(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? '¡Copiado!' : 'Copiar JSON Schema'}</span>
                </button>
              </div>

              <pre className="p-3 bg-stone-900 rounded-xl text-[11px] text-emerald-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-stone-800">
{`{
  "name": "process_bdp_ticket_claim",
  "description": "Procesa y valida el canje de puntos de un ticket de BDP a partir del QR o imagen del comprobante.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "ticket_id": {
        "type": "STRING",
        "description": "Identificador único del ticket o número de comprobante emitido por BDP (ej: F2026-004821 o 005-1650-081026)."
      },
      "amount": {
        "type": "NUMBER",
        "description": "Monto total del ticket en euros (ej: 9.90)."
      },
      "date_str": {
        "type": "STRING",
        "description": "Fecha y hora de la transacción leída del ticket (ej: 08/10/2026 16:50)."
      },
      "items_detected": {
        "type": "ARRAY",
        "items": {
          "type": "STRING"
        },
        "description": "Lista opcional de productos detectados en el ticket (ej: ['3 MAHOU'])."
      }
    },
    "required": ["ticket_id", "amount"]
  }
}`}
              </pre>
            </div>
          </div>

          {/* SECTION: AUDIT TABLE DE TICKETS BDP CANJEADOS */}
          <div className="p-5 sm:p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Prevención de Duplicados & Auditoría Transaccional</span>
                </div>
                <h3 className="font-display font-bold text-white text-base">
                  Tickets BDP Canjeados por Socios ({claimedTickets.length})
                </h3>
                <p className="text-xs text-stone-400">
                  Histórico de tickets de BDP procesados mediante IA o escaneo QR, con protección contra doble canje.
                </p>
              </div>

              <button
                onClick={loadAllData}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-xs font-semibold border border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualizar Tickets</span>
              </button>
            </div>

            {claimedTickets.length === 0 ? (
              <div className="p-8 text-center bg-stone-950 rounded-2xl border border-stone-800 text-stone-400 text-xs">
                Aún no hay tickets de BDP canjeados. Los clientes pueden canjearlos subiendo una foto o mediante enlace QR en el Asistente IA.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950 text-stone-400 font-semibold border-b border-stone-800">
                    <tr>
                      <th className="p-3">Ticket ID</th>
                      <th className="p-3">Socio</th>
                      <th className="p-3">Importe (€)</th>
                      <th className="p-3">Multiplicador</th>
                      <th className="p-3">Puntos Sumados</th>
                      <th className="p-3">Fecha Ticket</th>
                      <th className="p-3">Fecha Canje</th>
                      <th className="p-3">Transacción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 text-stone-300">
                    {claimedTickets.map((ct) => (
                      <tr key={ct.id} className="hover:bg-stone-850/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-emerald-400">#{ct.ticket_id}</td>
                        <td className="p-3 font-medium text-white">{ct.user_name || `Usuario #${ct.user_id}`}</td>
                        <td className="p-3 font-mono font-bold text-white">{Number(ct.amount).toFixed(2)} €</td>
                        <td className="p-3 font-mono text-amber-400 font-bold">x{ct.multiplier}</td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">+{ct.points_awarded} pts</td>
                        <td className="p-3 text-[11px] text-stone-400">{ct.date_str || 'N/D'}</td>
                        <td className="p-3 text-[11px] text-stone-400 font-mono">
                          {new Date(ct.claimed_at).toLocaleDateString()} {new Date(ct.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-stone-400">{ct.transaction_code || 'OK'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: SUPABASE CLOUD POSTGRESQL DATABASE                */}
      {/* ======================================================== */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          
          {/* SUPABASE CONNECTION STATUS HEADER */}
          <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold mb-2">
                  <Database className="w-3.5 h-3.5" />
                  <span>PostgreSQL en la Nube (Producción)</span>
                </div>
                <h3 className="font-display font-extrabold text-white text-xl sm:text-2xl">
                  Integración Supabase · Fulano Resto Bar
                </h3>
                <p className="text-xs text-stone-400 mt-1 max-w-2xl">
                  Conexión directa entre el backend transaccional de <strong>FidelityFul</strong> y tu instancia de PostgreSQL en Supabase.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCheckSupabase}
                  disabled={checkingSupabase}
                  className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-xl text-xs font-semibold border border-stone-700 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingSupabase ? 'animate-spin' : ''}`} />
                  <span>{checkingSupabase ? 'Verificando...' : 'Verificar Conexión'}</span>
                </button>

                <a
                  href="https://supabase.com/dashboard/project/rwgcstupksblybgmpuse/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir SQL Editor</span>
                </a>
              </div>
            </div>

            {/* STATUS BANNER */}
            <div
              className={`p-4 rounded-2xl border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                supabaseStatus?.status === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : supabaseStatus?.status === 'schema_pending'
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">
                  {supabaseStatus?.status === 'connected'
                    ? '🟢'
                    : supabaseStatus?.status === 'schema_pending'
                    ? '🟡'
                    : '🔴'}
                </span>
                <div>
                  <div className="font-bold text-white text-sm">
                    {supabaseStatus?.status === 'connected'
                      ? 'Base de Datos Supabase Conectada y Tablas Operativas'
                      : supabaseStatus?.status === 'schema_pending'
                      ? 'Conexión a Supabase Exitosa · Tablas pendientes de creación'
                      : 'Estado de Conexión: Revisión Requerida'}
                  </div>
                  <p className="text-xs opacity-90 mt-0.5">
                    {supabaseStatus?.message || 'Verificando estado de Supabase...'}
                  </p>
                </div>
              </div>

              {supabaseStatus?.status === 'connected' && (
                <button
                  onClick={handleSyncSupabase}
                  disabled={syncingSupabase}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {syncingSupabase ? 'Sincronizando...' : 'Sincronizar Datos'}
                </button>
              )}
            </div>

            {/* CREDENTIALS & PROJECT DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                  Project Ref ID
                </span>
                <span className="font-mono text-sm font-bold text-amber-400 mt-0.5 block truncate">
                  {supabaseStatus?.projectRef || 'rwgcstupksblybgmpuse'}
                </span>
                <span className="text-[10px] text-stone-400 mt-1 block">Identificador oficial del proyecto</span>
              </div>

              <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                  Project URL
                </span>
                <span className="font-mono text-xs font-semibold text-stone-200 mt-0.5 block truncate">
                  {supabaseStatus?.projectUrl || 'https://rwgcstupksblybgmpuse.supabase.co'}
                </span>
                <span className="text-[10px] text-emerald-400 mt-1 block">Endpoint API PostgREST activo</span>
              </div>

              <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                  Llaves de Acceso
                </span>
                <span className="font-mono text-[11px] text-stone-300 mt-0.5 block truncate">
                  sb_publishable_0o_GD... (Configurada)
                </span>
                <span className="text-[10px] text-stone-400 mt-1 block">Anon JWT + Publishable Key válidas</span>
              </div>
            </div>

            {/* TABLE DETECTION CHECKLIST */}
            <div className="p-4 bg-stone-950/80 rounded-2xl border border-stone-800 space-y-2">
              <div className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                Auditoría de Esquema en Supabase
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { name: 'users', label: 'Usuarios / Clientes', detected: supabaseStatus?.tablesDetected.users },
                  { name: 'system_config', label: 'Reglas y Puntos', detected: supabaseStatus?.tablesDetected.system_config },
                  { name: 'menu_items', label: 'Carta Fulano', detected: supabaseStatus?.tablesDetected.menu_items },
                  { name: 'transactions', label: 'Consumiciones', detected: supabaseStatus?.tablesDetected.transactions },
                  { name: 'bdp_orders', label: 'Comandas BDP', detected: supabaseStatus?.tablesDetected.bdp_orders },
                ].map((tbl) => (
                  <div
                    key={tbl.name}
                    className={`p-2.5 rounded-xl border text-center ${
                      tbl.detected
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-stone-900 border-stone-800 text-stone-400'
                    }`}
                  >
                    <div className="text-sm">{tbl.detected ? '✅' : '⏳'}</div>
                    <div className="font-mono text-[11px] font-bold mt-1 text-white">{tbl.name}</div>
                    <div className="text-[9px] text-stone-400">{tbl.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CONFIGURACIÓN DE REDIRECCIÓN GOOGLE OAUTH */}
            <div className="p-4 bg-amber-950/20 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔗</span>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      URLs de Redirección para Google OAuth y Magic Link
                    </h4>
                    <p className="text-[11px] text-amber-200/80">
                      Evita el error de <code className="bg-amber-900/40 px-1 rounded text-white font-mono">localhost rechazó la conexión</code> configurando la URL de la app en Supabase.
                    </p>
                  </div>
                </div>
                <a
                  href="https://supabase.com/dashboard/project/rwgcstupksblybgmpuse/auth/url-configuration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-[11px] font-bold shadow transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Configurar en Supabase</span>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-stone-900/90 rounded-xl border border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                    1. Site URL (Pega esto en Supabase):
                  </span>
                  <code className="text-[11px] text-amber-300 font-mono block break-all select-all bg-black/40 p-1.5 rounded">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-wrphcwscpzbtm55sfxocib-155619916328.europe-west2.run.app'}
                  </code>
                </div>

                <div className="p-2.5 bg-stone-900/90 rounded-xl border border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                    2. Redirect URLs (Añade esta regla con comodín):
                  </span>
                  <code className="text-[11px] text-emerald-300 font-mono block break-all select-all bg-black/40 p-1.5 rounded">
                    {typeof window !== 'undefined' ? `${window.location.origin}/**` : 'https://ais-dev-wrphcwscpzbtm55sfxocib-155619916328.europe-west2.run.app/**'}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* SINCRO USUARIOS: AUTH.USERS VS PUBLIC.USERS */}
          <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Gestión de Usuarios en 2 Niveles</span>
                </div>
                <h4 className="font-display font-bold text-white text-lg">
                  Sincronización `auth.users` ↔ `public.users`
                </h4>
                <p className="text-xs text-stone-400 mt-1 max-w-2xl">
                  En Supabase, las credenciales se almacenan en el sistema interno de autenticación (<code>auth.users</code>), mientras que los datos del negocio (puntos, consumos y nivel VIP) residen en tu tabla personalizada (<code>public.users</code>).
                </p>
              </div>

              <button
                onClick={handleSyncAuthUsers}
                disabled={syncingAuthUsers}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncingAuthUsers ? 'animate-spin' : ''}`} />
                <span>{syncingAuthUsers ? 'Sincronizando...' : 'Sincronizar auth.users con public.users'}</span>
              </button>
            </div>

            {/* COMPARISON METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                    auth.users (Autenticación)
                  </span>
                  <div className="text-2xl font-display font-extrabold text-white mt-1">
                    {supabaseStatus?.authUsersCount ?? 0}
                  </div>
                  <span className="text-[10px] text-stone-400">Cuentas con email y login en Supabase</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                    public.users (FidelityFul)
                  </span>
                  <div className="text-2xl font-display font-extrabold text-amber-400 mt-1">
                    {supabaseStatus?.userCount ?? usersList.length}
                  </div>
                  <span className="text-[10px] text-stone-400">Socios con puntos, tarjeta VIP y nivel</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between sm:col-span-2 lg:col-span-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                    Mecanismo Activo
                  </span>
                  <div className="text-sm font-bold text-emerald-400 mt-1.5 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Opción 1 + Trigger Opción 2</span>
                  </div>
                  <span className="text-[10px] text-stone-400 block mt-1">
                    Inserción directa en registro + disparador SQL
                  </span>
                </div>
              </div>
            </div>

            {/* DETAILED EXPLANATION */}
            <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80 text-xs text-stone-300 space-y-2">
              <div className="font-semibold text-amber-400">¿Cómo funciona la sincronización automática?</div>
              <ul className="list-disc list-inside space-y-1 text-stone-400 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-stone-200">Opción 1 (Código de la aplicación):</strong> Cada vez que se da de alta un cliente desde FidelityFul o se llama a <code>supabase.auth.signUp()</code>, el código inserta automáticamente su ficha completa en <code>public.users</code> con su UID y nivel Bronce.
                </li>
                <li>
                  <strong className="text-stone-200">Opción 2 (Disparador en Supabase):</strong> El script SQL <code>supabase_schema.sql</code> incluye el trigger <code>on_auth_user_created</code> que se ejecuta inmediatamente en PostgreSQL ante cualquier alta manual en el panel de Supabase.
                </li>
                <li>
                  <strong className="text-stone-200">Botón de Sincronización Manual:</strong> Si creas usuarios directamente desde la sección <em>Authentication &gt; Users</em> en el dashboard de Supabase, puedes pulsar el botón superior en cualquier momento para importarlos y reflejarlos de inmediato.
                </li>
              </ul>
            </div>
          </div>


          {/* QUICK MIGRATION GUIDE & SQL VIEWER */}
          <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-display font-bold text-white text-lg flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-amber-400" />
                  <span>Script de Migración SQL para Supabase (`supabase_schema.sql`)</span>
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Este script crea todas las tablas, índices para BDP, políticas RLS y los platos de Fulano Resto Bar.
                </p>
              </div>

              <button
                onClick={handleCopySql}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 rounded-xl text-xs font-extrabold shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto active:scale-95"
              >
                {copiedSql ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? '¡Copiado al Portapapeles!' : 'Copiar SQL para Supabase'}</span>
              </button>
            </div>

            {/* 3 STEP GUIDE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 text-xs space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">1</span>
                  <span>Copia el Script</span>
                </div>
                <p className="text-stone-300 text-[11px]">
                  Haz clic en el botón dorado superior <strong>"Copiar SQL para Supabase"</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 text-xs space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">2</span>
                  <span>Pega en Supabase SQL Editor</span>
                </div>
                <p className="text-stone-300 text-[11px]">
                  Abre tu panel en Supabase (<code className="text-emerald-400">SQL Editor &gt; New Query</code>) y pega el contenido.
                </p>
              </div>

              <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 text-xs space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">3</span>
                  <span>Ejecuta (RUN)</span>
                </div>
                <p className="text-stone-300 text-[11px]">
                  Presiona el botón verde <strong>Run</strong> en Supabase. Luego pulsa <strong>Verificar Conexión</strong> aquí.
                </p>
              </div>
            </div>

            {/* CODE PREVIEW BOX */}
            <div className="relative">
              <pre className="p-4 bg-stone-950 rounded-2xl border border-stone-800 font-mono text-[11px] text-stone-300 max-h-72 overflow-y-auto overflow-x-auto leading-relaxed select-all">
                {supabaseSql || '-- Cargando script SQL...'}
              </pre>
            </div>
          </div>

        </div>
      )}

      {/* ADJUST POINTS MODAL (STRICT AUDIT) */}
      {adjustingUser &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <form
              onSubmit={handleAdjustPointsSubmit}
              className="bg-stone-900 border border-stone-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
            >
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">Auditoría de Puntos</span>
                <h3 className="font-display font-bold text-white text-lg mt-0.5">
                  Ajustar Saldo: {adjustingUser.name}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Saldo actual: <strong className="text-amber-400">{formatPoints(adjustingUser.points)}</strong>
                </p>
              </div>

              <div>
                <label className="text-xs text-stone-300 block mb-1 font-medium">
                  Cantidad de Puntos (Positivo para sumar, negativo para restar):
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Ej. +100 o -50"
                  className="w-full bg-stone-950 border border-stone-700 text-white font-mono text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-stone-300 block mb-1 font-medium">
                  Motivo / Justificación obligatoria:
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Indica el motivo del ajuste para el registro de auditoría..."
                  rows={3}
                  className="w-full bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="flex-1 py-2.5 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {adjusting ? 'Aplicando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* CREATE / EDIT REWARD MODAL */}
      {isRewardModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <form
              onSubmit={handleSaveReward}
              className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
            >
              <div>
                <h3 className="font-display font-bold text-white text-lg">
                  {rewardForm.id ? 'Editar Recompensa' : 'Nueva Recompensa para el Catálogo'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Configura los puntos requeridos y el stock disponible en Fulano Restobar.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="text-xs text-stone-300 block mb-1">Nombre:</label>
                  <input
                    type="text"
                    required
                    value={rewardForm.name}
                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    placeholder="Ej. Cóctel de Autor Gratis"
                    className="w-full bg-stone-950 border border-stone-700 text-white text-xs rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-300 block mb-1">Emoji:</label>
                  <input
                    type="text"
                    value={rewardForm.image_emoji}
                    onChange={(e) => setRewardForm({ ...rewardForm, image_emoji: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 text-center text-lg rounded-xl px-2 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-300 block mb-1">Descripción:</label>
                <textarea
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                  placeholder="Detalla lo que incluye este premio..."
                  rows={2}
                  className="w-full bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-xl p-2.5 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-300 block mb-1">Puntos requeridos:</label>
                  <input
                    type="number"
                    required
                    value={rewardForm.cost_points}
                    onChange={(e) =>
                      setRewardForm({ ...rewardForm, cost_points: Number(e.target.value) })
                    }
                    className="w-full bg-stone-950 border border-stone-700 text-white text-xs rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-300 block mb-1">Stock disponible:</label>
                  <input
                    type="number"
                    required
                    value={rewardForm.stock}
                    onChange={(e) => setRewardForm({ ...rewardForm, stock: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-700 text-white text-xs rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-stone-400 hover:text-white bg-stone-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* RESET TEST DATA CONFIRMATION MODAL VIA PORTAL */}
      {isResetConfirmOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-rose-500/50 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                  Confirmación de Seguridad
                </span>
                <h3 className="font-display font-bold text-white text-lg mt-0.5">
                  ¿Purgar tickets y comandas a estado cero?
                </h3>
                <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                  Esta acción eliminará todos los tickets de BDP registrados, órdenes de comandas, canjes y cupones de prueba, dejando la base de datos lista para clientes reales en barra.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-left text-[11px] text-stone-400 space-y-1">
                <div className="flex items-center gap-2 text-stone-300">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Se preservan la carta de 46 productos y los roles de usuario.</span>
                </div>
                <div className="flex items-center gap-2 text-stone-300">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Se restauran los 5 socios demostrativos a sus saldos limpios.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={resettingData}
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={resettingData}
                  onClick={handleExecuteReset}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {resettingData ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Purgando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Sí, Purgar a Cero</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};
