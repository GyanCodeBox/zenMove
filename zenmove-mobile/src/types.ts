export interface Move {
  id: string;
  customer_id: string;
  vendor_id?: string;
  status: 'quoted' | 'booked' | 'loading' | 'in_transit' | 'delivered' | 'disputed' | 'completed';
  origin_address: string;
  dest_address: string;
  origin_city_code: string;
  dest_city_code: string;
  scheduled_at: string;
  quote_amount: number;
  escrow_id?: string;
  eway_bill_no?: string;
  total_items: number;
}

export interface Milestone {
  id: string;
  milestone: 'M1_booking' | 'M2_loading' | 'M3_delivery' | 'M4_closeout';
  pct_of_total: number;
  amount: number;
  status: 'pending' | 'released' | 'held' | 'refunded';
  trigger_event?: string;
  released_at?: string;
}

export interface EscrowStatus {
  move_id: string;
  total_amount: number;
  vault_balance: number;
  released_amount: number;
  platform_fee: number;
  vendor_total: number;
  milestones: Milestone[];
}

export interface Item {
  id: string;
  move_id: string;
  name: string;
  notes?: string;
  condition_pre: string;
  condition_post?: string;
  qr_code?: string;
  tag_tier?: string;
  is_high_risk: boolean;
  is_qr_bound: boolean;
  is_photo_complete: boolean;
  is_loaded: boolean;
  is_unloaded: boolean;
}
