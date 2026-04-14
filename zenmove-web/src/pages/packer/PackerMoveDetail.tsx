import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type Move, type Item } from '../../services/api'
import { PageHeader, StatusBadge, Button, Spinner, Card } from '../../components/ui'
import { Plus, Maximize, FileText, ArrowLeft, PackageCheck } from 'lucide-react'

export default function PackerMoveDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [move, setMove] = useState<Move | null>(null)
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        Promise.all([api.moves.get(id), api.items.list(id)])
            .then(([mRes, iRes]) => {
                setMove(mRes)
                setItems(iRes)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <div className="p-20 flex justify-center"><Spinner size={32} /></div>
    if (!move) return <div className="p-8">Move not found</div>

    return (
        <div className="p-8 animate-fade-in max-w-4xl mx-auto">
            <button
                onClick={() => navigate('/packer')}
                className="flex items-center gap-2 mb-6 font-body text-sm"
                style={{ color: 'var(--text-muted)' }}
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <PageHeader
                title={`${move.origin_city_code} → ${move.dest_city_code}`}
                subtitle="Manage Digital Twins for this move"
                action={
                    <div className="flex gap-2">
                        {move.status === 'quoted' && (
                            <Button onClick={() => api.moves.updateStatus(move.id, 'booked').then(() => window.location.reload())}>
                                Accept Booking
                            </Button>
                        )}
                        {move.status === 'booked' && (
                            <Button onClick={() => api.moves.updateStatus(move.id, 'loading').then(() => window.location.reload())}>
                                Begin Loading
                            </Button>
                        )}
                        {move.status === 'loading' && (
                            <Button onClick={() => navigate(`/packer/moves/${move.id}/scan`)} variant="primary">
                                <Maximize size={16} /> Scan Load
                            </Button>
                        )}
                        {move.status === 'in_transit' && (
                            <Button onClick={() => api.moves.updateStatus(move.id, 'delivered').then(() => window.location.reload())}>
                                Arrive Dest
                            </Button>
                        )}
                        {move.status === 'delivered' && (
                            <Button onClick={() => navigate(`/packer/moves/${move.id}/scan`)} variant="primary">
                                <Maximize size={16} /> Scan Unload
                            </Button>
                        )}
                        <Button onClick={() => navigate(`/moves/${move.id}/manifest`)} variant="secondary">
                            <FileText size={16} /> Manifest
                        </Button>
                    </div>
                }
            />

            <div className="mb-6 flex justify-between items-end">
                <h3 className="font-display font-semibold text-xl">Digital Twins</h3>
                {(move.status === 'booked' || move.status === 'quoted' || move.status === 'loading') && (
                    <Button onClick={() => navigate(`/packer/moves/${move.id}/items/new`)} size="sm">
                        <Plus size={14} /> Add Item
                    </Button>
                )}
            </div>

            <div className="space-y-3">
                {items.length === 0 ? (
                    <div className="p-10 text-center border rounded-xl" style={{ borderColor: 'var(--border)' }}>
                        <p className="font-body text-sm text-gray-500">No items added yet.</p>
                    </div>
                ) : (
                    items.map(item => (
                        <Card key={item.id} className="p-4" onClick={() => navigate(`/packer/items/${item.id}`)}>
                            <div className="flex justify-between items-center cursor-pointer">
                                <div>
                                    <h4 className="font-body font-medium" style={{ color: 'var(--navy)' }}>{item.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">QR: {item.qr_code || 'Unbound'} • Pre: {item.condition_pre}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!item.is_qr_bound && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">Needs QR</span>}
                                    {item.is_qr_bound && !item.is_photo_complete && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">Needs Photo</span>}
                                    {item.is_photo_complete && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs flex items-center gap-1"><PackageCheck size={12} /> Ready</span>}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
