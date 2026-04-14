// src/pages/packer/PackerDashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Move } from '../../services/api'
import { PageHeader, StatusBadge, Card, Spinner, EmptyState, StatCard } from '../../components/ui'
import { formatDate, formatCurrency } from '../../utils'
import { Truck, MapPin, ChevronRight, Package, HardHat } from 'lucide-react'

export default function PackerDashboard() {
  const [moves, setMoves] = useState<Move[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Packer sees all moves — in a real system this would be filtered to
    // assigned moves only. For now, same endpoint.
    api.moves.list(1)
      .then(res => setMoves(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const active    = moves.filter(m => ['booked','loading','in_transit'].includes(m.status))
  const pending   = moves.filter(m => m.status === 'booked')

  return (
    <div className="p-8 animate-fade-in">
      {/* Packer mode banner */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl mb-7 grain relative overflow-hidden"
        style={{ background: 'var(--navy)' }}
      >
        <HardHat size={18} style={{ color: 'var(--amber)' }} />
        <div>
          <p className="font-display font-semibold text-sm text-white">Packer Mode</p>
          <p className="font-body text-xs text-white/50">
            Add items, bind QR stickers, capture photos, scan loads
          </p>
        </div>
      </div>

      <PageHeader title="Assigned Moves" subtitle="Select a move to start packing" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8 stagger">
        <StatCard label="Total Moves" value={moves.length} className="animate-fade-up" />
        <StatCard label="Active" value={active.length} color="var(--teal)" className="animate-fade-up" />
        <StatCard label="Awaiting Pack" value={pending.length} color="var(--amber)" className="animate-fade-up" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : moves.length === 0 ? (
        <EmptyState icon={Truck} title="No moves assigned" description="Moves will appear here once a customer creates one." />
      ) : (
        <div className="space-y-3 stagger">
          {moves.map(move => (
            <Card key={move.id} accent onClick={() => navigate(`/packer/moves/${move.id}`)} className="animate-fade-up">
              <div className="p-5 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--surface-2)' }}
                >
                  <Truck size={18} style={{ color: 'var(--teal)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-display font-semibold text-sm" style={{ color: 'var(--navy)' }}>
                      {move.origin_city_code} → {move.dest_city_code}
                    </p>
                    <StatusBadge status={move.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Package size={10} /> {move.total_items} items
                    </span>
                    <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(move.scheduled_at)}
                    </span>
                    <span className="font-body text-xs font-medium" style={{ color: 'var(--navy)' }}>
                      {formatCurrency(move.quote_amount)}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--border)' }} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
