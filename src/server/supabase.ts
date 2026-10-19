import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rwgcstupksblybgmpuse.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3Z2NzdHVwa3NibHliZ21wdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTA0MjEsImV4cCI6MjEwNzI4NjQyMX0.yDYTwBV35G_lj7v4wmlcXmCKBNSSoi4xQQ9sfjXyAGU';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3Z2NzdHVwa3NibHliZ21wdXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcxMDQyMSwiZXhwIjoyMTA3Mjg2NDIxfQ.1vlnnqKKjDAg5cS4B2D3bapLO5a5tQGDDTLqCBYhWEs';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0o_GD2zlkeIO0P3FeRh8ew_p8p7Nn8P';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    // Prefer service role key on server side to guarantee direct DB writes and reads
    const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    supabaseInstance = createClient(SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

export interface SupabaseHealthResult {
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

export async function checkSupabaseHealth(): Promise<SupabaseHealthResult> {
  const projectRef = 'rwgcstupksblybgmpuse';
  const result: SupabaseHealthResult = {
    isConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    projectUrl: SUPABASE_URL,
    projectRef,
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
    status: 'schema_pending',
    message: '',
    tablesDetected: {
      users: false,
      system_config: false,
      menu_items: false,
      transactions: false,
      bdp_orders: false,
    },
    userCount: 0,
    authUsersCount: 0,
    lastChecked: new Date().toISOString(),
  };

  try {
    const client = getSupabaseClient();
    
    // Check users table in public schema
    const { data: userData, count: userExactCount, error: userError } = await client
      .from('users')
      .select('id', { count: 'exact' });
    
    if (userError) {
      if (userError.code === 'PGRST205' || userError.message?.includes('schema cache')) {
        result.status = 'schema_pending';
        result.message = 'Conexión a Supabase exitosa, pero las tablas aún no han sido creadas en el Editor SQL de Supabase.';
        return result;
      }
      result.status = 'error';
      result.message = `Error de Supabase: ${userError.message} (Código: ${userError.code})`;
      return result;
    }

    result.tablesDetected.users = true;
    result.userCount = typeof userExactCount === 'number' ? userExactCount : (Array.isArray(userData) ? userData.length : 0);

    // Check auth.users count via admin API
    try {
      const { data: authData } = await client.auth.admin.listUsers();
      result.authUsersCount = authData?.users?.length || 0;
    } catch (_authErr) {
      result.authUsersCount = 0;
    }

    // Check config
    const { error: cfgErr } = await client.from('system_config').select('id').limit(1);
    result.tablesDetected.system_config = !cfgErr;

    // Check menu
    const { error: menuErr } = await client.from('menu_items').select('id').limit(1);
    result.tablesDetected.menu_items = !menuErr;

    // Check transactions
    const { error: txErr } = await client.from('transactions').select('id').limit(1);
    result.tablesDetected.transactions = !txErr;

    // Check bdp_orders
    const { error: bdpErr } = await client.from('bdp_orders').select('id').limit(1);
    result.tablesDetected.bdp_orders = !bdpErr;

    result.status = 'connected';
    result.message = '¡Conexión y tablas de Supabase sincronizadas y activas!';
    return result;
  } catch (err: any) {
    result.status = 'error';
    result.message = err?.message || 'Error al comunicarse con Supabase';
    return result;
  }
}

export function getSupabaseSqlContent(): string {
  try {
    const sqlPath = path.resolve(process.cwd(), 'supabase_schema.sql');
    if (fs.existsSync(sqlPath)) {
      return fs.readFileSync(sqlPath, 'utf-8');
    }
  } catch (_e) {
    // fallback
  }
  return '-- Consulte el archivo supabase_schema.sql en la raíz del proyecto';
}

/**
 * Obtener el ID de un usuario en Supabase a partir de su email
 */
export async function getSupabaseUserIdByEmail(email: string): Promise<number | null> {
  try {
    const client = getSupabaseClient();
    const { data } = await client.from('users').select('id').eq('email', email).maybeSingle();
    return data?.id ?? null;
  } catch (err) {
    return null;
  }
}

/**
 * Sincronizar o actualizar el usuario en la tabla public.users de Supabase
 */
export async function syncUserUpdateToSupabase(email: string, fields: Partial<{
  points: number;
  total_spent: number;
  total_visits: number;
  level: string;
  name: string;
  phone: string;
  role: string;
}>): Promise<void> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('users').update(fields).eq('email', email);
    if (error) {
      console.warn('Error al actualizar usuario en Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('Aviso syncUserUpdateToSupabase:', err?.message);
  }
}

/**
 * Sincronizar una transacción en Supabase
 */
export async function syncTransactionToSupabase(tx: {
  transaction_code: string;
  user_email: string;
  staff_name?: string;
  items: any;
  total_euros: number;
  base_points: number;
  level_bonus_pct: number;
  points_earned: number;
  notes?: string;
}): Promise<void> {
  try {
    const client = getSupabaseClient();
    const sbUserId = await getSupabaseUserIdByEmail(tx.user_email);
    if (!sbUserId) return;

    const itemsJson = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;

    const { error } = await client.from('transactions').upsert(
      {
        transaction_code: tx.transaction_code,
        user_id: sbUserId,
        staff_name: tx.staff_name || 'Personal de Barra',
        items: itemsJson,
        total_euros: tx.total_euros,
        base_points: tx.base_points,
        level_bonus_pct: tx.level_bonus_pct,
        points_earned: tx.points_earned,
        notes: tx.notes || null,
      },
      { onConflict: 'transaction_code' }
    );

    if (error) {
      console.warn('Error al sincronizar transacción en Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('Aviso syncTransactionToSupabase:', err?.message);
  }
}

/**
 * Sincronizar un ajuste manual de puntos en Supabase
 */
export async function syncPointAdjustmentToSupabase(adj: {
  user_email: string;
  amount: number;
  reason: string;
  admin_id?: number | null;
}): Promise<void> {
  try {
    const client = getSupabaseClient();
    const sbUserId = await getSupabaseUserIdByEmail(adj.user_email);
    if (!sbUserId) return;

    const { error } = await client.from('point_adjustments').insert({
      user_id: sbUserId,
      admin_id: adj.admin_id || null,
      amount: adj.amount,
      reason: adj.reason,
    });

    if (error) {
      console.warn('Error al sincronizar ajuste en Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('Aviso syncPointAdjustmentToSupabase:', err?.message);
  }
}

/**
 * Sincronizar un canje de recompensa en Supabase
 */
export async function syncRedemptionToSupabase(rdm: {
  redemption_code: string;
  user_email: string;
  reward_id: number;
  points_used: number;
  status?: string;
}): Promise<void> {
  try {
    const client = getSupabaseClient();
    const sbUserId = await getSupabaseUserIdByEmail(rdm.user_email);
    if (!sbUserId) return;

    const { error } = await client.from('redemptions').upsert(
      {
        redemption_code: rdm.redemption_code,
        user_id: sbUserId,
        reward_id: rdm.reward_id,
        points_used: rdm.points_used,
        status: rdm.status || 'active',
      },
      { onConflict: 'redemption_code' }
    );

    if (error) {
      console.warn('Error al sincronizar canje en Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('Aviso syncRedemptionToSupabase:', err?.message);
  }
}

