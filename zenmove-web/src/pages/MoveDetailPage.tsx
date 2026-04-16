// src/pages/MoveDetailPage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type Move, type MoveStatus } from '../services/api'
import {
  StatusBadge, Spinner, Button, Card, PageHeader
} from '../components/ui'
import { formatDate, formatCurrency, STATUS_LABEL, STATUS_NEXT } from '../utils'
import {
  MapPin, Calendar, Package, FileText,
  ChevronRight, ArrowLeft, CheckCircle2, Circle, IndianRupee, Shield
} from 'lucide-react'

const TIMELINE: MoveStatus[] = [
  'quoted','booked','loading','in_transit','delivered','completed'
]

export default function MoveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [move, setMove] = useState<Move | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    api.moves.get(id)
      .then(setMove)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function advanceStatus() {
    if (!move) return
    const next = STATUS_NEXT[move.status]
    if (!next) return
    setAdvancing(true)
    try {
      const updated = await api.moves.updateStatus(move.id, next)
      setMove(updated)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAdvancing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Spinner size={32} />
    </div>
  )

  if (!move) return (
    <div className="p-8">
      <p style={{ color: 'var(--text-muted)' }}>Move not found.</p>
    </div>
  )

  const nextStatus = STATUS_NEXT[move.status]
  const timelineIdx = TIMELINE.indexOf(move.status)

  return (
    <div className="p-8 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/moves')}>
          <ArrowLeft size={14} /> Moves
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          {move.origin_city_code} → {move.dest_city_code}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-fade-up">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display font-semibold text-2xl" style={{ color: 'var(--navy)' }}>
              {move.origin_city_code} → {move.dest_city_code}
            </h1>
            <StatusBadge status={move.status} />
          </div>
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
            Move ID: <span className="font-mono text-xs">{move.id.slice(0, 8)}…</span>
          </p>
        </div>
        <p className="font-display font-semibold text-2xl" style={{ color: 'var(--navy)' }}>
          {formatCurrency(move.quote_amount)}
        </p>
      </div>

      {/* Status timeline */}
      <Card className="p-6 mb-6 animate-fade-up">
        <h3 className="font-display font-semibold text-sm mb-5" style={{ color: 'var(--navy)' }}>
          Move Progress
        </h3>
        <div className="flex items-center gap-0">
          {TIMELINE.map((status, idx) => {
            const done    = idx < timelineIdx
            const current = idx === timelineIdx
            const future  = idx > timelineIdx
            return (
              <div key={status} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                    ${done    ? 'bg-green-500'           : ''}
                    ${current ? ''                        : ''}
                    ${future  ? 'bg-[var(--surface-2)]'  : ''}
                  `}
                    style={current ? { background: 'var(--teal)' } : {}}
                  >
                    {done
                      ? <CheckCircle2 size={14} className="text-white" />
                      : <Circle size={14} className={current ? 'text-white' : ''} style={future ? { color: 'var(--border)' } : {}} />
                    }
                  </div>
                  <p className={`font-body text-[10px] text-center whitespace-nowrap
                    ${current ? 'font-semibold' : 'font-normal'}
                  `}
                    style={{ color: current ? 'var(--navy)' : future ? 'var(--border)' : 'var(--text-muted)' }}
                  >
                    {STATUS_LABEL[status]}
                  </p>
                </div>
                {idx < TIMELINE.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-1 mb-5 transition-all"
                    style={{ background: idx < timelineIdx ? 'var(--teal)' : 'var(--border)' }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {nextStatus && (
          <div className="mt-5 pt-4 border-t border-[var(--border)] flex justify-end">
            <Button
              variant="primary"
              onClick={advanceStatus}
              loading={advancing}
            >
              Advance to {STATUS_LABEL[nextStatus]} <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </Card>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 stagger">
        <Card className="p-4 animate-fade-up">
          <p className="font-body text-xs mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={11} className="inline mr-1" />ORIGIN
          </p>
          <p className="font-body text-sm font-medium" style={{ color: 'var(--navy)' }}>
            {move.origin_city_code}
          </p>
          <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {move.origin_address}
          </p>
        </Card>

        <Card className="p-4 animate-fade-up">
          <p className="font-body text-xs mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={11} className="inline mr-1" style={{ color: 'var(--amber)' }} />DESTINATION
          </p>
          <p className="font-body text-sm font-medium" style={{ color: 'var(--navy)' }}>
            {move.dest_city_code}
          </p>
          <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {move.dest_address}
          </p>
        </Card>

        <Card className="p-4 animate-fade-up">
          <p className="font-body text-xs mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
            <Calendar size={11} className="inline mr-1" />SCHEDULED
          </p>
          <p className="font-body text-sm font-medium" style={{ color: 'var(--navy)' }}>
            {formatDate(move.scheduled_at)}
          </p>
        </Card>

        <Card className="p-4 animate-fade-up">
          <p className="font-body text-xs mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
            <Package size={11} className="inline mr-1" />ITEMS
          </p>
          <p className="font-display font-semibold text-xl" style={{ color: 'var(--navy)' }}>
            {move.total_items}
          </p>
          {move.total_items > 0 && (
            <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {move.loaded_count} loaded · {move.unloaded_count} unloaded
            </p>
          )}
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate(`/moves/${move.id}/items`)}
        >
          <Package size={15} /> View Items
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate(`/moves/${move.id}/manifest`)}
        >
          <FileText size={15} /> Manifest
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/moves/${move.id}/payment`)}>
          <IndianRupee size={15} /> Payment
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/moves/${move.id}/escrow`)}>
          <Shield size={15} /> Escrow
        </Button>
        {move.status === 'in_transit' && (
          <Button variant="primary" onClick={() => navigate(`/moves/${move.id}/otp`)}>
            Confirm Delivery
          </Button>
        )}
        {['delivered','disputed'].includes(move.status) && (
          <Button variant="secondary" onClick={() => navigate(`/moves/${move.id}/disputes`)}>
            Disputes
          </Button>
        )}
      </div>
    </div>
  )
}
