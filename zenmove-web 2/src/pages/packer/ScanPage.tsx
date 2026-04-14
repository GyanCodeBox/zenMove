// src/pages/packer/ScanPage.tsx
// Web-based QR scanner for loading and unloading events.
// On desktop: manual QR input. On mobile: text field (React Native app handles camera scan).
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type Item, type Move } from '../../services/api'
import { Button, Spinner, Card } from '../../components/ui'
import { ScanLine, CheckCircle2, XCircle, ArrowLeft, ChevronRight } from 'lucide-react'

interface ScanResult {
  item: Item
  status: 'success' | 'error'
  message: string
}

export default function ScanPage() {
  const { id: moveId } = useParams<{ id: string }>()
  const [move, setMove]       = useState<Move | null>(null)
  const [qrInput, setQrInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ScanResult[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (moveId) api.moves.get(moveId).then(setMove).catch(console.error)
  }, [moveId])

  const isLoading  = move?.status === 'loading'
  const isUnloading = move?.status === 'delivered'
  const action = isLoading ? 'Load' : isUnloading ? 'Unload' : null

  async function scan() {
    if (!moveId || !qrInput.trim()) return
    const qr = qrInput.trim().toUpperCase()
    setLoading(true)
    try {
      const item = await api.items.scan(moveId, qr)
      setResults(prev => [{
        item,
        status: 'success',
        message: isLoading
          ? `✓ Loaded — ${item.name}`
          : `✓ Unloaded — ${item.name}`,
      }, ...prev])
      setQrInput('')
    } catch (err: any) {
      setResults(prev => [{
        item: { name: qr } as Item,
        status: 'error',
        message: err.message,
      }, ...prev])
      setQrInput('')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') scan()
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount   = results.filter(r => r.status === 'error').length

  return (
    <div className="p-8 max-w-lg animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/packer/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Move
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          {action ? `${action} Scan` : 'Scan'}
        </span>
      </div>

      {/* Header */}
      <div className="mb-7 animate-fade-up">
        <h1 className="font-display font-semibold text-2xl mb-1" style={{ color: 'var(--navy)' }}>
          {action === 'Load' ? 'Loading Scan' : action === 'Unload' ? 'Unloading Scan' : 'QR Scan'}
        </h1>
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          {action === 'Load'
            ? 'Scan each item as it goes into the truck.'
            : action === 'Unload'
            ? 'Scan each item as it comes off the truck. Every loaded item must be scanned.'
            : 'Move must be in Loading or Delivered status to scan.'}
        </p>
      </div>

      {!action ? (
        <Card className="p-6 text-center">
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
            Move status is <strong>{move?.status}</strong>. Scanning is only available when the move is
            in <strong>loading</strong> or <strong>delivered</strong> status.
          </p>
        </Card>
      ) : (
        <>
          {/* Live counter */}
          <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-up">
            <div className="rounded-xl p-4 border border-green-200 text-center" style={{ background: '#f0fdf4' }}>
              <p className="font-display font-semibold text-3xl text-green-600">{successCount}</p>
              <p className="font-body text-xs text-green-700 mt-1">Scanned OK</p>
            </div>
            <div
              className="rounded-xl p-4 border text-center"
              style={{
                background: errorCount > 0 ? '#fef2f2' : 'var(--surface-2)',
                borderColor: errorCount > 0 ? '#fecaca' : 'var(--border)',
              }}
            >
              <p
                className="font-display font-semibold text-3xl"
                style={{ color: errorCount > 0 ? '#dc2626' : 'var(--border)' }}
              >
                {errorCount}
              </p>
              <p className="font-body text-xs mt-1" style={{ color: errorCount > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                Errors
              </p>
            </div>
          </div>

          {/* Input */}
          <div className="flex gap-2 mb-6 animate-fade-up">
            <input
              type="text"
              placeholder="ZM-2026-BBS-00001  (or scan with barcode reader)"
              value={qrInput}
              onChange={e => setQrInput(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-4 py-3 rounded-xl border-2 border-[var(--border)] font-mono text-sm bg-white focus:border-[var(--teal)] transition-colors"
              style={{ color: 'var(--text)' }}
            />
            <Button
              variant="primary"
              size="md"
              onClick={scan}
              loading={loading}
              disabled={!qrInput.trim()}
            >
              <ScanLine size={16} />
            </Button>
          </div>

          <p className="font-body text-xs text-center mb-6" style={{ color: 'var(--text-muted)' }}>
            Press Enter or click scan after typing. A USB barcode scanner works automatically.
          </p>

          {/* Results feed */}
          {results.length > 0 && (
            <div className="space-y-2">
              <p className="font-body text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Scan Log
              </p>
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl animate-slide-in"
                  style={{
                    background: r.status === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${r.status === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {r.status === 'success'
                    ? <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    : <XCircle     size={15} className="text-red-400 shrink-0" />
                  }
                  <p className="font-body text-sm flex-1" style={{ color: r.status === 'success' ? '#166534' : '#991b1b' }}>
                    {r.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
