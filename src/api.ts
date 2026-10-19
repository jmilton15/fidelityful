import {
  User,
  MenuItem,
  Transaction,
  Reward,
  Redemption,
  SystemConfig,
  AnalyticsData,
  UserDetailsResponse,
  BdpOrder,
  ClaimedTicket,
  ClaimTicketResult,
} from './types';

const BASE_URL = '/api';

export async function fetchConfig(): Promise<SystemConfig> {
  const res = await fetch(`${BASE_URL}/config`);
  if (!res.ok) throw new Error('Error al cargar la configuración');
  return res.json();
}

export async function updateConfig(data: Partial<SystemConfig>): Promise<SystemConfig> {
  const res = await fetch(`${BASE_URL}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar la configuración');
  return res.json();
}

export async function fetchUsers(role?: string, search?: string): Promise<User[]> {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (search) params.set('search', search);
  const res = await fetch(`${BASE_URL}/users?${params.toString()}`);
  if (!res.ok) throw new Error('Error al cargar usuarios');
  return res.json();
}

export async function fetchUserDetails(idOrUid: number | string): Promise<UserDetailsResponse> {
  const res = await fetch(`${BASE_URL}/users/${idOrUid}`);
  if (!res.ok) throw new Error('Error al cargar ficha de usuario');
  return res.json();
}

export async function createUser(data: { name: string; email: string; phone?: string; birthday?: string }): Promise<User> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al crear usuario');
  return json;
}

export async function updateUserRole(userId: number, role: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al cambiar rol');
  return json;
}

export async function claimBirthdayBonus(userId: number): Promise<{ success: boolean; bonusPoints: number; message: string; user: User }> {
  const res = await fetch(`${BASE_URL}/users/${userId}/birthday-bonus`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al reclamar bono de cumpleaños');
  return json;
}

export async function saveUserBirthday(userId: number, birthday: string): Promise<{ success: boolean; message: string; user: User }> {
  const res = await fetch(`${BASE_URL}/users/${userId}/birthday`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ birthday }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al guardar cumpleaños');
  return json;
}

export async function updateUserProfile(userId: number, data: { name?: string; email?: string; phone?: string; birthday?: string }): Promise<User> {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al actualizar perfil');
  return json;
}

export async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetch(`${BASE_URL}/menu`);
  if (!res.ok) throw new Error('Error al cargar la carta');
  return res.json();
}

export async function registerConsumption(data: {
  userId: number;
  items: Array<{ id: number; name: string; category: string; price: number; quantity: number }>;
  staffName?: string;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al registrar consumo');
  return json;
}

export async function fetchRewards(): Promise<Reward[]> {
  const res = await fetch(`${BASE_URL}/rewards`);
  if (!res.ok) throw new Error('Error al cargar recompensas');
  return res.json();
}

export async function createReward(data: Partial<Reward>): Promise<Reward> {
  const res = await fetch(`${BASE_URL}/rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al crear recompensa');
  return json;
}

export async function updateReward(id: number, data: Partial<Reward>): Promise<Reward> {
  const res = await fetch(`${BASE_URL}/rewards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al actualizar recompensa');
  return json;
}

export async function toggleRewardActive(id: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/rewards/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al modificar estado');
  return json;
}

export async function deleteRewardPermanent(id: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/rewards/${id}?permanent=true`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al eliminar recompensa');
  return json;
}

export async function redeemReward(userId: number, rewardId: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/redemptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, rewardId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al canjear recompensa');
  return json;
}

export async function fetchRedemptions(): Promise<Redemption[]> {
  const res = await fetch(`${BASE_URL}/redemptions`);
  if (!res.ok) throw new Error('Error al cargar canjes');
  return res.json();
}

export async function claimRedemptionInBar(code: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/redemptions/${encodeURIComponent(code)}/claim`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al validar canje en barra');
  return json;
}

export async function redeemCouponInBar(code: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/coupons/${encodeURIComponent(code)}/redeem`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al validar cupón sorpresa');
  return json;
}

export async function adjustPoints(userId: number, amount: number, reason: string, adminId?: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/users/${userId}/adjust-points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, reason, adminId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al ajustar puntos');
  return json;
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${BASE_URL}/analytics`);
  if (!res.ok) throw new Error('Error al cargar analíticas');
  return res.json();
}

// ----------------------------------------------------
// BDP TPV & GOOGLE AI STUDIO CLIENT METHODS
// ----------------------------------------------------

export async function createBdpOrder(data: {
  userId: number;
  tableNumber?: string;
  items: Array<{ name: string; quantity: number; category?: string; price: number }>;
  terraceService?: boolean;
  paymentMethod?: string;
}): Promise<{ success: boolean; order: BdpOrder; message: string }> {
  const res = await fetch(`${BASE_URL}/bdp/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al generar cobro BDP');
  return json;
}

export async function fetchBdpOrders(): Promise<BdpOrder[]> {
  const res = await fetch(`${BASE_URL}/bdp/orders`);
  if (!res.ok) throw new Error('Error al cargar órdenes BDP');
  return res.json();
}

export async function fetchBdpOrder(orderCode: string): Promise<BdpOrder> {
  const res = await fetch(`${BASE_URL}/bdp/order/${encodeURIComponent(orderCode)}`);
  if (!res.ok) throw new Error('Error al buscar orden BDP');
  return res.json();
}

export async function simulateBdpPayment(orderCode: string, paymentMethod?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/bdp/simulate-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderCode, paymentMethod }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al procesar pago simulado BDP');
  return json;
}

export async function chatWithAi(data: {
  message: string;
  userId?: number;
  tableNumber?: string;
  isTerrace?: boolean;
  image?: { data: string; mimeType: string };
}): Promise<{ reply: string; bdpOrder?: BdpOrder; claimedTicketResult?: ClaimTicketResult; user?: any }> {
  const res = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al comunicarse con el asistente IA');
  return json;
}

export async function claimBdpTicketDirectly(data: {
  ticket_id: string;
  amount: number;
  date_str?: string;
  items_detected?: string[];
  userId: number;
}): Promise<ClaimTicketResult> {
  const res = await fetch(`${BASE_URL}/bdp/claim-ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al validar el ticket BDP');
  return json;
}

export async function fetchClaimedTickets(): Promise<ClaimedTicket[]> {
  const res = await fetch(`${BASE_URL}/bdp/claimed-tickets`);
  if (!res.ok) throw new Error('Error al cargar tickets canjeados');
  return res.json();
}

export interface SupabaseStatusResponse {
  isConfigured: boolean;
  projectUrl: string;
  projectRef: string;
  publishableKey: string;
  status: 'connected' | 'schema_pending' | 'error';
  message: string;
  tablesDetected: {
    users: boolean;
    system_config: boolean;
    menu_items: boolean;
    transactions: boolean;
    bdp_orders: boolean;
  };
  userCount?: number;
  authUsersCount?: number;
  lastChecked: string;
}

export async function fetchSupabaseStatus(): Promise<SupabaseStatusResponse> {
  const res = await fetch(`${BASE_URL}/supabase/status`);
  if (!res.ok) throw new Error('Error al verificar estado de Supabase');
  return res.json();
}

export async function fetchSupabaseSql(): Promise<string> {
  const res = await fetch(`${BASE_URL}/supabase/sql`);
  if (!res.ok) throw new Error('Error al obtener el script SQL de Supabase');
  return res.text();
}

export async function triggerSupabaseSync(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/supabase/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Error en sincronización');
  return data;
}

export async function syncSupabaseAuthUsers(): Promise<{
  success: boolean;
  message: string;
  authUsersTotal: number;
  syncedToPublic: number;
}> {
  const res = await fetch(`${BASE_URL}/supabase/sync-auth-users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Error al sincronizar usuarios de Auth');
  return data;
}

export interface AuthLoginResponse {
  success: boolean;
  user: User;
  session?: any;
  message: string;
}

export async function loginWithApi(email: string, password: string): Promise<AuthLoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
  return data;
}

export async function registerWithApi(data: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  birthday?: string;
  role?: 'client' | 'staff' | 'admin';
}): Promise<AuthLoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al registrar usuario');
  return json;
}

export async function sendMagicLinkApi(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al enviar enlace mágico');
  return json;
}

export async function fetchUserProfileByEmail(email: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/auth/profile?email=${encodeURIComponent(email)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al obtener perfil');
  return json;
}

export async function syncOAuthUserApi(data: {
  email: string;
  name?: string;
  avatar_url?: string;
  phone?: string;
}): Promise<{ success: boolean; user: User; isNew?: boolean; message?: string }> {
  const res = await fetch(`${BASE_URL}/auth/oauth-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al sincronizar cuenta');
  return json;
}

export async function resetTestDataApi(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin/reset-test-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al purgar datos de prueba');
  return json;
}



