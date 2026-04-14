import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Move } from '../../services/api'
import {
    PageHeader, StatusBadge, Card, Spinner,
    EmptyState, Button
} from '../../components/ui'
import { formatCurrency, formatDate } from '../../utils'
import { PackageOpen, MapPin, ChevronRight, Briefcase } from 'lucide-react'

export default function PackerDashboard() {
    const [moves, setMoves] = useState<Move[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        // Packers primarily see moves that are 'booked' to 'delivered'
        api.moves.list(1)
            .then((res: any) => {
                const raw = Array.isArray(res) ? res : res.data || []
                // Filter out completed ones to keep dashboard clean (but keep 'delivered' for unloading!)
                setMoves(raw.filter((m: Move) => ['booked', 'loading', 'in_transit', 'delivered'].includes(m.status)))
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="p-8 animate-fade-in">
            <PageHeader
                title="Packer Dashboard"
                subtitle="Manage your active moving jobs"
            />

            {loading ? (
                <div className="flex justify-center py-20">
                    <Spinner size={32} />
                </div>
            ) : moves.length === 0 ? (
                <EmptyState
                    icon={Briefcase}
                    title="No Active Jobs"
                    description="You don't have any pending moves assigned at the moment."
                />
            ) : (
                <div className="space-y-4 stagger">
                    {moves.map(move => (
                        <Card key={move.id} accent onClick={() => navigate(`/packer/moves/${move.id}`)}>
                            <div className="p-5 flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <StatusBadge status={move.status} />
                                        <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {move.total_items} items logged
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <MapPin size={16} className="shrink-0" style={{ color: 'var(--teal)' }} />
                                        <p className="font-body text-sm font-medium truncate" style={{ color: 'var(--navy)' }}>
                                            {move.origin_city_code} → {move.dest_city_code}
                                        </p>
                                    </div>
                                    <p className="font-body text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                                        Sched: {formatDate(move.scheduled_at)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-body text-sm" style={{ color: 'var(--teal)' }}>Open Job</span>
                                    <ChevronRight size={18} style={{ color: 'var(--border)' }} />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
