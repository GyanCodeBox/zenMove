// src/pages/MovesPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Move, type MoveStatus } from '../services/api'
import {
  PageHeader, StatusBadge, Card, Spinner,
  EmptyState, Button, StatCard, Select,
} from '../components/ui'
import { formatDate, formatCurrency, STATUS_LABEL } from '../utils'
import { Plus, Truck, MapPin, Calendar, ChevronRight, Package } from 'lucide-react'

const STATUSES: MoveStatus[] = [
  'quoted', 'booked', 'loading', 'in_transit', 'delivered', 'disputed', 'completed'
]

export default function MovesPage() {
  const [moves, setMoves] = useState<Move[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.moves.list(page, statusFilter || undefined)
      .then((res: any) => {
        if (Array.isArray(res)) {
          setMoves(res);
          setTotal(res.length);
        } else {
          setMoves(res.data || []);
          setTotal(res.total || 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  // Stats safely handle undefined state
  const safeMoves = moves || []
  const active = safeMoves.filter(m => !['completed', 'disputed'].includes(m.status)).length
  const inTransit = safeMoves.filter(m => m.status === 'in_transit').length
  const completed = safeMoves.filter(m => m.status === 'completed').length

  return (
    <div className="p-8 animate-fade-in">
      <PageHeader
        title="My Moves"
        subtitle="Track all your relocation jobs"
        action={
          <Button onClick={() => navigate('/moves/new')} variant="primary">
            <Plus size={15} /> New Move
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8 stagger">
        <StatCard label="Total Moves" value={total} sub="all time" className="animate-fade-up" />
        <StatCard label="Active" value={active} sub="in progress" color="var(--teal)" className="animate-fade-up" />
        <StatCard label="Completed" value={completed} sub="successfully delivered" color="var(--amber-dark, #e8844a)" className="animate-fade-up" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-44"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </Select>
        {statusFilter && (
          <button
            onClick={() => setStatusFilter('')}
            className="text-xs font-body"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Move list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} />
        </div>
      ) : moves.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No moves yet"
          description="Create your first move to get started with ZenMove's trust-tech logistics."
          action={
            <Button onClick={() => navigate('/moves/new')} variant="primary">
              <Plus size={15} /> Create First Move
            </Button>
          }
        />
      ) : (
        <div className="space-y-3 stagger">
          {moves.map((move) => (
            <MoveCard
              key={move.id}
              move={move}
              onClick={() => navigate(`/moves/${move.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="font-body text-sm px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>
            Page {page}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page * 20 >= total}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function MoveCard({ move, onClick }: { move: Move; onClick: () => void }) {
  const progress = move.total_items > 0
    ? Math.round((move.loaded_count / move.total_items) * 100)
    : 0

  return (
    <Card accent onClick={onClick} className="animate-fade-up">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Route info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={move.status} />
              {move.total_items > 0 && (
                <span
                  className="text-xs font-body px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  {move.total_items} items
                </span>
              )}
            </div>

            <div className="flex items-start gap-2 mt-2">
              <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--teal)' }} />
              <div className="min-w-0">
                <p className="font-body text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                  {move.origin_city_code} → {move.dest_city_code}
                </p>
                <p className="font-body text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {move.origin_address}
                </p>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <p
              className="font-display font-semibold text-base"
              style={{ color: 'var(--navy)' }}
            >
              {formatCurrency(move.quote_amount)}
            </p>
            <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={11} />
              <span className="font-body text-xs">{formatDate(move.scheduled_at)}</span>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--border)' }} />
          </div>
        </div>

        {/* Loading progress bar */}
        {move.status === 'loading' && move.total_items > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <div className="flex justify-between mb-1.5">
              <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                Loading progress
              </span>
              <span className="font-body text-xs font-medium" style={{ color: 'var(--navy)' }}>
                {move.loaded_count}/{move.total_items}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: 'var(--teal)' }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
