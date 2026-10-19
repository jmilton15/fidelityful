export type UserRole = 'client' | 'staff' | 'admin';
export type UserLevel = 'Bronce' | 'Plata' | 'Oro' | 'VIP';
export type ProductCategory = 'bebida' | 'bebida_coctel' | 'plato' | 'postre';

export interface User {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  birthday?: string;
  points: number;
  total_spent: number | string;
  total_visits: number;
  level: UserLevel;
  role: UserRole;
  birthday_bonus_year?: number | null;
  avatar_url?: string;
  avatar_emoji?: string;
  last_activity_at?: string;
  created_at: string;
}

export interface MenuItem {
  id: number;
  name: string;
  category: ProductCategory;
  price: number | string;
  description?: string;
  image_emoji: string;
  is_active: boolean;
}

export interface TransactionItem {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
  multiplier: number;
  subtotal: number;
  points: number;
}

export interface Transaction {
  id: number;
  transaction_code: string;
  user_id: number;
  staff_name: string;
  items: TransactionItem[] | string;
  total_euros: number | string;
  base_points: number;
  level_bonus_pct: number;
  points_earned: number;
  notes?: string;
  created_at: string;
  user_name?: string;
  user_level?: string;
}

export interface Reward {
  id: number;
  name: string;
  description: string;
  cost_points: number;
  stock: number;
  active: boolean;
  category: string;
  image_emoji: string;
  created_at: string;
}

export interface Redemption {
  id: number;
  redemption_code: string;
  user_id: number;
  reward_id: number;
  points_used: number;
  status: 'active' | 'claimed' | 'cancelled';
  claimed_at?: string;
  created_at: string;
  reward_name?: string;
  reward_description?: string;
  image_emoji?: string;
  user_name?: string;
  user_email?: string;
}

export interface Coupon {
  id: number;
  code: string;
  user_id: number;
  title: string;
  description: string;
  reward_type: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
  user_name?: string;
}

export interface PointAdjustment {
  id: number;
  user_id: number;
  admin_id?: number;
  admin_name?: string;
  amount: number;
  reason: string;
  created_at: string;
}

export interface SystemConfig {
  id: number;
  euro_to_points: number;
  multiplier_bebida: number | string;
  multiplier_coctel: number | string;
  multiplier_plato: number | string;
  multiplier_postre: number | string;
  birthday_bonus_points: number;
  visit_milestone: number;
  level_plata_threshold: number;
  level_plata_bonus_pct: number;
  level_oro_threshold: number;
  level_oro_bonus_pct: number;
  level_vip_threshold: number;
  level_vip_bonus_pct: number;
  updated_at: string;
}

export interface AnalyticsData {
  users: {
    total_users: string | number;
    total_clients: string | number;
    bronce_count: string | number;
    plata_count: string | number;
    oro_count: string | number;
    vip_count: string | number;
    points_in_circulation: string | number;
    total_revenue: string | number;
    total_visits: string | number;
  };
  transactions: {
    tx_count: string | number;
    total_billed: string | number;
    total_points_earned: string | number;
    avg_ticket: string | number;
  };
  redemptions: {
    redemptions_count: string | number;
    claimed_count: string | number;
    total_points_redeemed: string | number;
  };
  topClients: User[];
  topRewards: Array<{
    id: number;
    name: string;
    cost_points: number;
    image_emoji: string;
    redemption_count: string | number;
  }>;
  recentTransactions: Transaction[];
}

export interface UserDetailsResponse {
  user: User;
  coupons: Coupon[];
  redemptions: Redemption[];
  transactions: Transaction[];
  adjustments: PointAdjustment[];
  levelDetails: {
    currentLevel: UserLevel;
    bonusPct: number;
    nextLevel: string;
    pointsToNext: number;
    nextThreshold: number;
    progressPct: number;
  };
}

export interface BdpOrderItem {
  name: string;
  quantity: number;
  category: string;
  unit_price: number;
  subtotal: number;
}

export interface BdpOrder {
  id: number;
  order_code: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  table_number: string;
  total_amount: number;
  terrace_service: boolean;
  discount_amount?: number;
  coupon_code?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  payment_method: 'tpv_qr' | 'tarjeta' | 'bizum';
  items: BdpOrderItem[] | string;
  qr_code_data?: string;
  pay_url?: string;
  points_preview: number;
  bdp_tx_id?: string;
  webhook_payload?: any;
  created_at: string;
  paid_at?: string;
}

export interface RealtimePaymentEvent {
  type: 'order.paid';
  orderCode: string;
  tableNumber: string;
  totalAmount: number;
  pointsEarned: number;
  clientName: string;
  userId: number;
  transactionCode: string;
  timestamp: string;
}

export interface ClaimedTicket {
  id: number;
  ticket_id: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  amount: number;
  date_str?: string;
  items_detected?: string[];
  points_awarded: number;
  multiplier: number;
  transaction_code?: string;
  source: string;
  claimed_at: string;
}

export interface ClaimTicketResult {
  success: boolean;
  ticket_id: string;
  amount: number;
  points_awarded: number;
  multiplier: number;
  newPoints: number;
  userLevel: string;
  levelUpgraded: boolean;
  awardedCoupon?: any;
  alreadyClaimed?: boolean;
  message: string;
  transactionCode?: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  bdpOrder?: BdpOrder;
  extractedItems?: BdpOrderItem[];
  pointsPreview?: number;
  claimedTicketResult?: ClaimTicketResult;
  imagePreview?: string;
  timestamp: string;
}
