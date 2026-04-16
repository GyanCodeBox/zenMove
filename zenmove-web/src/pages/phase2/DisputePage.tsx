// src/pages/phase2/DisputePage.tsx
// Handles both: raising a new dispute (/dispute/new) and viewing existing (/disputes)
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { disputeApi, type Dispute, type DisputeType } from '../../services/api.phase2'
import { api, type Item } from '../../services/api'
import { Button, Card, Spinner, PageHeader } from '../../components/ui'
import { formatDateTime } from '../../utils'
import {
  ArrowLeft, ChevronRight, AlertTriangle,
  CheckCircle2, Clock, MessageSquare, Camera
} from 'lucide-react'

const DISPUTE_TYPES: { value: DisputeType; label: string; desc: string; color: string }[] = [
  { value: 'damage',     label: 'Item Damaged',   desc: 'Item arrived broken or damaged',     color: '#dc2626' },
  { value: 'missing',    label: 'Item Missing',   desc: 'Item not delivered at destination',  color: '#d97706' },
  { value: 'delay',      label: 'Late Delivery',  desc: 'Delivery significantly delayed',     color: '#7c3aed' },
  { value: 'overcharge', label: 'Overcharged',    desc: 'Extra charges added without approval', color: '#0891b2' },
]

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:               { label: 'Open',              color: '#1e40af', bg: '#dbeafe' },
  vendor_review:      { label: 'Vendor Review',     color: '#92400e', bg: '#fef3c7' },
  ai_review:          { label: 'AI Review',         color: '#5b21b6', bg: '#ede9fe' },
  human_review:       { label: 'Ops Review',        color: '#0369a1', bg: '#e0f2fe' },
  resolved_customer:  { label: 'Resolved — Refund', color: '#166534', bg: '#dcfce7' },
  resolved_vendor:    { label: 'Resolved — Vendor', color: '#065f46', bg: '#d1fae5' },
  partial_settlement: { label: 'Partial Settlement',color: '#78350f', bg: '#fef3c7' },
  withdrawn:          { label: 'Withdrawn',         color: '#6b7280', bg: '#f3f4f6' },
}

export default function DisputePage() {
  const { id: moveId } = useParams<{ id: string }>()
  const location = useLocation()
  const isNew = location.pathname.endsWith('/new')
  const navigate = useNavigate()

  return isNew
    ? <NewDisputeForm moveId={moveId!} navigate={navigate} />
    : <DisputeList    moveId={moveId!} navigate={navigate} />
}

// ── New Dispute Form ────────────────────────────────────────────────────────

function NewDisputeForm({ moveId, navigate }: { moveId: string; navigate: (p: string) => void }) {
  const [items, setItems]             = useState<Item[]>([])
  const [type, setType]               = useState<DisputeType>('damage')
  const [description, setDescription] = useState('')
  const [itemId, setItemId]           = useState<string>('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoName, setPhotoName]     = useState('')

  useEffect(() => {
    api.items.list(moveId).then(setItems).catch(console.error)
  }, [moveId])

  async function submit() {
    if (!description.trim()) { setError('Please describe the issue.'); return }
    setLoading(true); setError('')
    try {
      const dispute = await disputeApi.open(moveId, {
        dispute_type: type,
        description: description.trim(),
        item_id: itemId || undefined,
      })
      navigate(`/moves/${moveId}/disputes`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-lg animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Move
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Raise Dispute</span>
      </div>

      <div className="mb-7 animate-fade-up">
        <h1 className="font-display font-semibold text-2xl mb-1" style={{ color: 'var(--navy)' }}>
          Raise a Dispute
        </h1>
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          Disputes must be raised within 24 hours of delivery. M4 escrow will be held pending resolution.
        </p>
      </div>

      <div className="space-y-5">
        {/* Dispute type */}
        <div>
          <p className="font-body text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Type of Issue *
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DISPUTE_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="rounded-xl border-2 p-3 text-left transition-all"
                style={{
                  borderColor: type === t.value ? t.color : 'var(--border)',
                  background: type === t.value ? `${t.color}10` : 'white',
                }}
              >
                <p className="font-body text-xs font-semibold mb-0.5" style={{ color: t.color }}>
                  {t.label}
                </p>
                <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {t.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Item selector */}
        {items.length > 0 && (
          <div>
            <label className="font-body text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Affected Item (optional)
            </label>
            <select
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white font-body text-sm"
              style={{ color: 'var(--text)' }}
            >
              <option value="">All items / Not specific to one item</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.qr_code ? `· ${item.qr_code}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="font-body text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Description *
          </label>
          <textarea
            placeholder="Describe what happened in detail. E.g. 'The TV screen was cracked when unpacked. The pre-move photo shows it was in good condition.'"
            value={description}
            onChange={e => { setDescription(e.target.value); setError('') }}
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white font-body text-sm resize-none"
            style={{ color: 'var(--text)' }}
          />
        </div>

        {/* Photo upload */}
        <div>
          <label className="font-body text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Damage Photo (optional)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => setPhotoName(e.target.files?.[0]?.name ?? '')}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed font-body text-sm transition-colors w-full"
            style={{
              borderColor: photoName ? 'var(--teal)' : 'var(--border)',
              color: photoName ? 'var(--teal)' : 'var(--text-muted)',
              background: photoName ? '#EBF4FA' : 'white',
            }}
          >
            <Camera size={15} />
            {photoName || 'Take or upload a photo of the damage'}
          </button>
          <p className="font-body text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            The AI will compare this against your pre-move photos in Phase 4.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="font-body text-sm text-red-600">{error}</p>
          </div>
        )}

        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
        >
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="font-body text-xs text-amber-700">
            Raising a dispute will hold the final escrow payment (M4) until resolved by ZenMove Ops.
            Frivolous disputes may affect your account standing.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={submit}
          loading={loading}
          disabled={!description.trim()}
        >
          Submit Dispute
        </Button>
      </div>
    </div>
  )
}

// ── Dispute List ────────────────────────────────────────────────────────────

function DisputeList({ moveId, navigate }: { moveId: string; navigate: (p: string) => void }) {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    disputeApi.list(moveId)
      .then(setDisputes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [moveId])

  return (
    <div className="p-8 max-w-xl animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Move
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Disputes</span>
      </div>

      <PageHeader
        title="Disputes"
        subtitle={`${disputes.length} dispute${disputes.length !== 1 ? 's' : ''} for this move`}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/moves/${moveId}/dispute/new`)}
          >
            + New Dispute
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={24} /></div>
      ) : disputes.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3 text-green-500" />
          <p className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--navy)' }}>
            No disputes
          </p>
          <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
            All items delivered without issue.
          </p>
        </Card>
      ) : (
        <div className="space-y-3 stagger">
          {disputes.map(d => <DisputeCard key={d.id} dispute={d} />)}
        </div>
      )}
    </div>
  )
}

function DisputeCard({ dispute: d }: { dispute: Dispute }) {
  const meta   = STATUS_META[d.status] ?? { label: d.status, color: 'var(--text-muted)', bg: 'var(--surface-2)' }
  const typeInfo = DISPUTE_TYPES.find(t => t.value === d.dispute_type)

  return (
    <Card accent className="animate-fade-up">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="font-body font-medium text-sm" style={{ color: 'var(--navy)' }}>
              {typeInfo?.label ?? d.dispute_type}
            </p>
            <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Opened {formatDateTime(d.opened_at)}
            </p>
          </div>
          <span
            className="font-body text-[10px] font-medium px-2.5 py-1 rounded-full shrink-0"
            style={{ background: meta.bg, color: meta.color }}
          >
            {meta.label}
          </span>
        </div>

        <p className="font-body text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {d.description}
        </p>

        {/* Timeline */}
        <div className="space-y-1.5 pt-3 border-t border-[var(--border)]">
          <TimelineRow icon={AlertTriangle} label="Dispute raised" done />
          <TimelineRow icon={MessageSquare} label="Vendor response" done={!!d.vendor_response} />
          <TimelineRow icon={Clock} label="Ops review (72h SLA)" done={!!d.resolved_at} />
          <TimelineRow icon={CheckCircle2} label="Resolution" done={!!d.resolved_at} />
        </div>

        {d.vendor_response && (
          <div
            className="mt-3 rounded-lg p-3"
            style={{ background: 'var(--surface-2)' }}
          >
            <p className="font-body text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Vendor response
            </p>
            <p className="font-body text-xs" style={{ color: 'var(--text)' }}>
              {d.vendor_response}
            </p>
          </div>
        )}

        {d.resolution_note && (
          <div
            className="mt-3 rounded-lg p-3 border"
            style={{
              background: d.status === 'resolved_customer' ? '#f0fdf4' : '#f8fafc',
              borderColor: d.status === 'resolved_customer' ? '#bbf7d0' : 'var(--border)',
            }}
          >
            <p className="font-body text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              ZenMove verdict
            </p>
            <p className="font-body text-xs" style={{ color: 'var(--text)' }}>
              {d.resolution_note}
            </p>
            {d.refund_amount && (
              <p className="font-body text-xs font-semibold mt-1 text-green-600">
                Refund: ₹{d.refund_amount.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function TimelineRow({ icon: Icon, label, done }: {
  icon: React.ElementType; label: string; done: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={10} style={{ color: done ? '#16a34a' : 'var(--border)' }} />
      <p className="font-body text-[10px]" style={{ color: done ? 'var(--text)' : 'var(--border)' }}>
        {label}
      </p>
    </div>
  )
}
