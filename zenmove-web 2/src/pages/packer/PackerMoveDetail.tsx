// src/pages/packer/PackerMoveDetail.tsx
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type Move, type Item } from '../../services/api'
import {
  Spinner, Button, Card, StatusBadge, PageHeader
} from '../../components/ui'
import { formatDate, formatCurrency, STATUS_LABEL, STATUS_NEXT } from '../../utils'
import {
  ArrowLeft, Plus, QrCode, Camera, ScanLine,
  ChevronRight, CheckCircle2, Circle, AlertTriangle,
  Package, FileText
} from 'lucide-react'

export default function PackerMoveDetail() {
  const { id: moveId } = useParams<{ id: string }>()
  const [move, setMove]   = useState<Move | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading]   = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    if (!moveId) return
    const [m, its] = await Promise.all([
      api.moves.get(moveId),
      api.items.list(moveId),
    ])
    setMove(m)
    setItems(its)
  }, [moveId])

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false))
  }, [load])

  async function advanceStatus() {
    if (!move) return
    const next = STATUS_NEXT[move.status]
    if (!next) return
    setAdvancing(true)
    try {
      const updated = await api.moves.updateStatus(move.id, next)
      setMove(updated)
    } catch (err: any) { alert(err.message) }
    finally { setAdvancing(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size={32} /></div>
  if (!move)   return <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Move not found.</div>

  const bound    = items.filter(i => i.is_qr_bound).length
  const photos   = items.filter(i => i.is_photo_complete).length
  const loaded   = items.filter(i => i.is_loaded).length
  const unloaded = items.filter(i => i.is_unloaded).length
  const nextStatus = STATUS_NEXT[move.status]

  // What actions are relevant for the current status
  const canAddItems = ['quoted','booked','loading'].includes(move.status)
  const canScan     = ['loading','delivered'].includes(move.status)

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/packer')}>
          <ArrowLeft size={14} /> Moves
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          {move.origin_city_code} → {move.dest_city_code}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display font-semibold text-2xl" style={{ color: 'var(--navy)' }}>
              {move.origin_city_code} → {move.dest_city_code}
            </h1>
            <StatusBadge status={move.status} />
          </div>
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
            {formatDate(move.scheduled_at)} · {formatCurrency(move.quote_amount)}
          </p>
        </div>
        {nextStatus && (
          <Button variant="primary" onClick={advanceStatus} loading={advancing} size="sm">
            → {STATUS_LABEL[nextStatus]}
          </Button>
        )}
      </div>

      {/* Progress summary */}
      <div className="grid grid-cols-4 gap-3 mb-6 animate-fade-up">
        {[
          { label: 'Items',    value: items.length, color: 'var(--navy)' },
          { label: 'QR Bound', value: `${bound}/${items.length}`, color: bound === items.length && items.length > 0 ? '#16a34a' : 'var(--text-muted)' },
          { label: 'Photos',   value: `${photos}/${items.length}`, color: photos === items.length && items.length > 0 ? '#16a34a' : 'var(--text-muted)' },
          { label: 'Loaded',   value: `${loaded}/${items.length}`, color: 'var(--teal)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[var(--border)] p-3 text-center">
            <p className="font-display font-semibold text-lg" style={{ color }}>{value}</p>
            <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Primary action bar */}
      <div className="flex flex-wrap gap-2 mb-7 animate-fade-up">
        {canAddItems && (
          <Button variant="primary" onClick={() => navigate(`/packer/moves/${moveId}/items/new`)}>
            <Plus size={15} /> Add Item
          </Button>
        )}
        {canScan && (
          <Button variant="secondary" onClick={() => navigate(`/packer/moves/${moveId}/scan`)}>
            <ScanLine size={15} />
            {move.status === 'loading' ? 'Scan Load' : 'Scan Unload'}
          </Button>
        )}
        <Button variant="secondary" onClick={() => navigate(`/moves/${moveId}/manifest`)}>
          <FileText size={15} /> Manifest
        </Button>
      </div>

      {/* Item list */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display font-semibold text-sm" style={{ color: 'var(--navy)' }}>
          Items ({items.length})
        </h2>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <Package size={28} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
          <p className="font-body text-sm font-medium" style={{ color: 'var(--navy)' }}>No items yet</p>
          <p className="font-body text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
            Add items to create Digital Twin records before packing.
          </p>
          {canAddItems && (
            <Button variant="primary" size="sm" onClick={() => navigate(`/packer/moves/${moveId}/items/new`)}>
              <Plus size={13} /> Add First Item
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2 stagger">
          {items.map(item => (
            <PackerItemRow
              key={item.id}
              item={item}
              onClick={() => navigate(`/packer/items/${item.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PackerItemRow({ item, onClick }: { item: Item; onClick: () => void }) {
  const steps = [
    { done: item.is_qr_bound,       label: 'QR',     icon: QrCode   },
    { done: item.is_photo_complete,  label: 'Photos', icon: Camera   },
    { done: item.is_loaded,          label: 'Loaded', icon: CheckCircle2 },
  ]

  return (
    <Card accent onClick={onClick} className="animate-fade-up">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-body font-medium text-sm truncate" style={{ color: 'var(--navy)' }}>
              {item.name}
            </p>
            {item.is_high_risk && (
              <AlertTriangle size={12} className="text-amber-500 shrink-0" />
            )}
          </div>
          {item.qr_code && (
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {item.qr_code}
            </p>
          )}
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-1.5">
          {steps.map(({ done, label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body"
              style={{
                background: done ? '#dcfce7' : 'var(--surface-2)',
                color:      done ? '#166534' : 'var(--border)',
              }}
            >
              <Icon size={9} />
              {label}
            </div>
          ))}
        </div>

        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
      </div>
    </Card>
  )
}
