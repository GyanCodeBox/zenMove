// src/services/api.ts
const BASE = '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('zm_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.detail ?? 'Request failed')
  return json.data ?? json
}

export const api = {
  auth: {
    register: (payload: RegisterPayload) =>
      request<User>('POST', '/auth/register', payload),
    login: (phone: string, password: string) =>
      request<TokenResponse>('POST', '/auth/login', { phone, password }),
  },
  moves: {
    list: (page = 1, status?: string) =>
      request<PaginatedResponse<Move>>('GET', `/moves?page=${page}${status ? `&status=${status}` : ''}`),
    get: (id: string) => request<Move>('GET', `/moves/${id}`),
    create: (payload: CreateMovePayload) => request<Move>('POST', '/moves', payload),
    updateStatus: (id: string, status: string) =>
      request<Move>('PATCH', `/moves/${id}/status`, { status }),
  },
  items: {
    list: (moveId: string) => request<Item[]>('GET', `/moves/${moveId}/items`),
    get: (itemId: string) => request<Item>('GET', `/items/${itemId}`),
    create: (moveId: string, payload: CreateItemPayload) =>
      request<Item>('POST', `/moves/${moveId}/items`, payload),
    bindQR: (itemId: string, qr_code: string, tag_tier: 'PVC' | 'PAPER') =>
      request<Item>('POST', `/items/${itemId}/bind-qr`, { qr_code, tag_tier }),
    uploadPhoto: async (itemId: string, photoType: 'open' | 'sealed', file: File): Promise<PhotoUploadResponse> => {
      const arrayBuf = await file.arrayBuffer()
      const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf)
      const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
      const form = new FormData()
      form.append('file', file)
      const token = getToken()
      const res = await fetch(`${BASE}/items/${itemId}/photos/${photoType}`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Photo-Hash': hashHex },
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.detail ?? 'Upload failed')
      return json.data ?? json
    },
    scan: (moveId: string, qr_code: string) =>
      request<Item>('POST', `/moves/${moveId}/scan`, { qr_code }),
  },
  manifest: {
    generate: (moveId: string) => request<ManifestSummary>('GET', `/moves/${moveId}/manifest`),
  },
}

export interface User { id: string; phone: string; email: string | null; full_name: string; role: 'customer' | 'packer' | 'driver' | 'admin'; kyc_status: 'pending' | 'verified' | 'rejected'; is_active: boolean; created_at: string }
export interface TokenResponse { access_token: string; refresh_token: string; token_type: string; user: User }
export type MoveStatus = 'quoted' | 'booked' | 'loading' | 'in_transit' | 'delivered' | 'disputed' | 'completed'
export interface Move { id: string; customer_id: string; vendor_id: string | null; status: MoveStatus; origin_address: string; dest_address: string; origin_city_code: string; dest_city_code: string; scheduled_at: string; quote_amount: number; escrow_id: string | null; eway_bill_no: string | null; total_items: number; loaded_count: number; unloaded_count: number; created_at: string; updated_at: string }
export interface Item { id: string; move_id: string; name: string; notes: string | null; condition_pre: 'good' | 'fragile' | 'damaged'; condition_post: 'good' | 'fragile' | 'damaged' | 'missing' | null; qr_code: string | null; tag_tier: 'PVC' | 'PAPER' | null; is_high_risk: boolean; is_qr_bound: boolean; is_photo_complete: boolean; is_loaded: boolean; is_unloaded: boolean; loaded_at: string | null; unloaded_at: string | null; open_photo_url: string | null; sealed_photo_url: string | null; created_at: string; updated_at: string }
export interface ManifestSummary { move_id: string; total_items: number; loaded_items: number; unloaded_items: number; high_risk_items: number; unbound_items: number; incomplete_photo_items: number; manifest_url: string; generated_at: string }
export interface PhotoUploadResponse { item_id: string; photo_type: string; s3_key: string; hash_sha256: string; signed_url: string }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; page_size: number; has_next: boolean }
export interface RegisterPayload { phone: string; full_name: string; password: string; email?: string; role?: string }
export interface CreateMovePayload { origin_address: string; dest_address: string; origin_city_code: string; dest_city_code: string; scheduled_at: string; quote_amount: number }
export interface CreateItemPayload { name: string; condition_pre: 'good' | 'fragile' | 'damaged'; notes?: string }
