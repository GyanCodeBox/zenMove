import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type Move } from '../../services/api'
import { PageHeader, Input, Button, Card } from '../../components/ui'
import { ArrowLeft, Maximize, Check } from 'lucide-react'

export default function ScanPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [move, setMove] = useState<Move | null>(null)
    const [qrInput, setQrInput] = useState('')
    const [scannedLogs, setScannedLogs] = useState<{ qr: string, type: string, time: string }[]>([])
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (id) api.moves.get(id).then(setMove)
    }, [id])

    // Continually focus input for hardware scanners
    useEffect(() => {
        const interval = setInterval(() => inputRef.current?.focus(), 1500)
        return () => clearInterval(interval)
    }, [])

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!id || !qrInput) return
        setLoading(true)
        const qrCopy = qrInput.toUpperCase()
        try {
            await api.moves.scan(id, qrCopy)
            setScannedLogs(prev => [{ qr: qrCopy, type: 'success', time: new Date().toLocaleTimeString() }, ...prev])
            setQrInput('')
        } catch (err: any) {
            setScannedLogs(prev => [{ qr: qrCopy + ` - ${err.message}`, type: 'error', time: new Date().toLocaleTimeString() }, ...prev])
            setQrInput('')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-xl mx-auto animate-fade-in">
            <button
                onClick={() => navigate(`/packer/moves/${id}`)}
                className="flex items-center gap-2 mb-6 font-body text-sm text-gray-500"
            >
                <ArrowLeft size={16} /> Back to Move
            </button>

            <PageHeader
                title={move?.status === 'loading' ? 'Load Sequence' : 'Unload Sequence'}
                subtitle="Hardware scanner feeds active. Scan stickers rapidly."
            />

            <Card className="p-6 border-teal-500 ring-2 ring-teal-500/20 mb-6">
                <form onSubmit={handleScan} className="flex gap-2">
                    <div className="flex-1">
                        <input
                            ref={inputRef}
                            placeholder="Ready to Scan..."
                            value={qrInput}
                            onChange={e => setQrInput(e.target.value)}
                            autoFocus
                            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white font-body text-sm transition-all text-gray-800"
                        />
                    </div>
                    <Button type="submit" loading={loading} variant="primary">
                        <Maximize size={16} /> Submit
                    </Button>
                </form>
                <p className="text-xs text-center text-gray-400 mt-3 font-mono">
                    {move?.status === 'loading' ? 'Loading bounds active' : 'Parity bounds active'}
                </p>
            </Card>

            <div className="space-y-2">
                <h4 className="font-display font-medium text-sm text-gray-400 mb-3 uppercase tracking-wider">Live Log</h4>
                {scannedLogs.map((log, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border text-sm font-mono flex items-center justify-between
             ${log.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <span className="flex items-center gap-2">
                            {log.type === 'success' && <Check size={14} />} {log.qr}
                        </span>
                        <span className="text-xs opacity-60">{log.time}</span>
                    </div>
                ))}
                {scannedLogs.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Waiting for first scan...</p>}
            </div>
        </div>
    )
}
