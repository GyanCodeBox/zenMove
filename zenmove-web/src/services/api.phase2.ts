// src/services/api.phase2.ts
// ──────────────────────────
// Phase 2 API calls. Merge these into src/services/api.ts in your project.
// All calls follow the same request() pattern from Phase 1.

const BASE = '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('zm_token')
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.detail ?? 'Request failed')
  return json.data ?? json
}

// ── Escrow ──────────────────────────────────────────────────────────────────
export const escrowApi = {
  init: (moveId: string, paymentRef?: string) =>
    request<EscrowStatus>('POST', `/moves/${moveId}/escrow/init`, {
      payment_ref: paymentRef,
    }),

  getStatus: (moveId: string) =>
    request<EscrowStatus>('GET', `/moves/${moveId}/escrow/status`),

  releaseM2: (moveId: string) =>
    request<EscrowStatus>('POST', `/moves/${moveId}/escrow/release-m2`),

  releaseM4: (moveId: string) =>
    request<EscrowStatus>('POST', `/moves/${moveId}/escrow/release-m4`),

  walletDraw: (moveId: string, amount: number, reason: string, notes?: string) =>
    request<WalletDrawResult>('POST', `/moves/${moveId}/wallet/draw`, {
      amount, reason, notes,
    }),
}

// ── OTP ──────────────────────────────────────────────────────────────────────
export const otpApi = {
  generate: (moveId: string) =>
    request<OTPGenerateResult>('POST', `/moves/${moveId}/otp/generate`),

  verify: (moveId: string, otp: string) =>
    request<OTPVerifyResult>('POST', `/moves/${moveId}/otp/verify`, { otp }),
}

// ── E-Way Bill ────────────────────────────────────────────────────────────────
export const ewayBillApi = {
  generate: (moveId: string, payload: EWBGeneratePayload) =>
    request<EWayBill>('POST', `/moves/${moveId}/eway-bill/generate`, payload),

  get: (moveId: string) =>
    request<EWayBill>('GET', `/moves/${moveId}/eway-bill`),
}

// ── Disputes ──────────────────────────────────────────────────────────────────
export const disputeApi = {
  open: (moveId: string, payload: DisputeCreatePayload) =>
    request<Dispute>('POST', `/moves/${moveId}/disputes`, payload),

  list: (moveId: string) =>
    request<Dispute[]>('GET', `/moves/${moveId}/disputes`),

  vendorRespond: (disputeId: string, response: string) =>
    request<Dispute>('POST', `/disputes/${disputeId}/respond`, {
      vendor_response: response,
    }),

  resolve: (disputeId: string, payload: DisputeResolvePayload) =>
    request<Dispute>('POST', `/disputes/${disputeId}/resolve`, payload),
}

// ── Phase 2 Types ──────────────────────────────────────────────────────────────

export type MilestoneKey = 'M1_booking' | 'M2_loading' | 'M3_delivery' | 'M4_closeout'
export type MilestoneStatus = 'pending' | 'released' | 'held' | 'refunded'

export interface Milestone {
  id: string
  milestone: MilestoneKey
  pct_of_total: number
  amount: number
  status: MilestoneStatus
  trigger_event: string | null
  released_at: string | null
  payment_ref: string | null
}

export interface EscrowStatus {
  move_id: string
  total_amount: number
  vault_balance: number
  released_amount: number
  platform_fee: number
  vendor_total: number
  milestones: Milestone[]
}

export interface OTPGenerateResult {
  move_id: string
  message: string
  otp_preview: string | null   // only in dev/mock mode
}

export interface OTPVerifyResult {
  move_id: string
  verified: boolean
  milestone_released: string
  amount_released: number
  message: string
}

export interface EWBGeneratePayload {
  gstin_supplier: string
  gstin_recipient: string
  vehicle_no: string
  distance_km: number
  total_value: number
}

export interface EWayBill {
  id: string
  move_id: string
  ewb_no: string | null
  ewb_date: string | null
  valid_upto: string | null
  vehicle_no: string | null
  distance_km: number | null
  total_value: number | null
  is_sandbox: boolean
  is_active: boolean
  generated_at: string
}

export interface WalletDrawResult {
  id: string
  move_id: string
  amount: number
  reason: string
  status: string
  created_at: string
}

export type DisputeType = 'damage' | 'missing' | 'delay' | 'overcharge'
export type DisputeStatus =
  | 'open' | 'vendor_review' | 'ai_review' | 'human_review'
  | 'resolved_customer' | 'resolved_vendor' | 'partial_settlement' | 'withdrawn'

export interface DisputeCreatePayload {
  dispute_type: DisputeType
  description: string
  item_id?: string
}

export interface DisputeResolvePayload {
  status: DisputeStatus
  resolution_note: string
  refund_amount?: number
}

export interface Dispute {
  id: string
  move_id: string
  item_id: string | null
  raised_by: string
  dispute_type: DisputeType
  status: DisputeStatus
  description: string
  vendor_response: string | null
  resolution_note: string | null
  refund_amount: number | null
  escrow_hold_amount: number | null
  opened_at: string
  resolved_at: string | null
}
