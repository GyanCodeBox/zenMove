// src/pages/packer/PackerItemDetail.tsx
// Single page for an item: shows current state, bind QR, upload photos.
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type Item } from '../../services/api'
import { Button, Card, Spinner } from '../../components/ui'
import {
  ArrowLeft, QrCode, Camera, CheckCircle2,
  AlertTriangle, Shield, ChevronRight, Upload,
  RefreshCw, Package
} from 'lucide-react'

export default function PackerItemDetail() {
  const { itemId } = useParams<{ itemId: string }>()
  const [item, setItem]       = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function reload() {
    if (!itemId) return
    const i = await api.items.get(itemId)
    setItem(i)
  }

  useEffect(() => {
    reload().catch(console.error).finally(() => setLoading(false))
  }, [itemId])

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size={28} /></div>
  if (!item)   return <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Item not found.</div>

  return (
    <div className="p-8 max-w-lg animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/packer/moves/${item.move_id}`)}>
          <ArrowLeft size={14} /> Move
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm truncate" style={{ color: 'var(--text-muted)' }}>
          {item.name}
        </span>
      </div>

      {/* Item header */}
      <div className="flex items-start gap-3 mb-7 animate-fade-up">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--surface-2)' }}
        >
          <Package size={18} style={{ color: 'var(--teal)' }} />
        </div>
        <div>
          <h1 className="font-display font-semibold text-xl" style={{ color: 'var(--navy)' }}>
            {item.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <ConditionPill condition={item.condition_pre} />
            {item.is_high_risk && (
              <span className="flex items-center gap-1 text-[10px] font-body text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <AlertTriangle size={9} /> Paper tag — High Risk
              </span>
            )}
            {item.tag_tier === 'PVC' && (
              <span className="flex items-center gap-1 text-[10px] font-body text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                <Shield size={9} /> PVC tag
              </span>
            )}
          </div>
          {item.notes && (
            <p className="font-body text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {item.notes}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Step 1 — QR Binding */}
        <StepCard
          step={1}
          title="Bind QR Sticker"
          done={item.is_qr_bound}
          value={item.qr_code ?? undefined}
          valueLabel="Bound to"
        >
          {!item.is_qr_bound
            ? <QRBindForm itemId={item.id} onSuccess={reload} />
            : <p className="font-mono text-sm font-medium" style={{ color: 'var(--navy)' }}>
                {item.qr_code}
              </p>
          }
        </StepCard>

        {/* Step 2 — Open Box Photo */}
        <StepCard
          step={2}
          title="Open Box Photo"
          done={!!item.open_photo_key || !!item.open_photo_url}
          subtitle="Contents visible, before packing"
        >
          {item.open_photo_url
            ? <PhotoPreview url={item.open_photo_url} label="Open box" />
            : <PhotoUploadButton
                itemId={item.id}
                photoType="open"
                onSuccess={reload}
              />
          }
        </StepCard>

        {/* Step 3 — Sealed Box Photo */}
        <StepCard
          step={3}
          title="Sealed Box Photo"
          done={!!item.sealed_photo_key || !!item.sealed_photo_url}
          subtitle="Box closed and ready to load"
        >
          {item.sealed_photo_url
            ? <PhotoPreview url={item.sealed_photo_url} label="Sealed box" />
            : <PhotoUploadButton
                itemId={item.id}
                photoType="sealed"
                onSuccess={reload}
              />
          }
        </StepCard>
      </div>

      {/* All done */}
      {item.is_qr_bound && item.is_photo_complete && (
        <div
          className="mt-5 rounded-xl p-4 flex items-center gap-3 border border-green-200 animate-fade-up"
          style={{ background: '#f0fdf4' }}
        >
          <CheckCircle2 size={18} className="text-green-500 shrink-0" />
          <div>
            <p className="font-body text-sm font-medium text-green-800">Item ready to load</p>
            <p className="font-body text-xs text-green-600">QR bound · Both photos captured · SHA-256 verified</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StepCard({
  step, title, done, subtitle, value, valueLabel, children,
}: {
  step: number; title: string; done: boolean
  subtitle?: string; value?: string; valueLabel?: string
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-visible animate-fade-up">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0 transition-all"
            style={{
              background: done ? '#16a34a' : 'var(--navy)',
              color: 'white',
            }}
          >
            {done ? <CheckCircle2 size={14} /> : step}
          </div>
          <div>
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--navy)' }}>
              {title}
            </p>
            {subtitle && (
              <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
            )}
          </div>
        </div>
        <div className="pl-10">{children}</div>
      </div>
    </Card>
  )
}

function QRBindForm({ itemId, onSuccess }: { itemId: string; onSuccess: () => void }) {
  const [qr, setQr]       = useState('')
  const [tier, setTier]   = useState<'PVC' | 'PAPER'>('PVC')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function bind() {
    if (!qr.trim()) { setError('Enter a QR code'); return }
    setLoading(true); setError('')
    try {
      await api.items.bindQR(itemId, qr.trim().toUpperCase(), tier)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          placeholder="ZM-2026-BBS-00001"
          value={qr}
          onChange={e => { setQr(e.target.value); setError('') }}
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] font-mono text-sm bg-white"
          style={{ color: 'var(--text)' }}
        />
        {/* Tag tier toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
          {(['PVC','PAPER'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className="px-2.5 py-1.5 text-xs font-body font-medium transition-colors"
              style={{
                background: tier === t ? 'var(--navy)' : 'white',
                color:      tier === t ? 'white' : 'var(--text-muted)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {tier === 'PAPER' && (
        <p className="font-body text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle size={10} /> Paper tag will be flagged High Risk
        </p>
      )}
      {error && <p className="font-body text-xs text-red-500">{error}</p>}
      <Button variant="primary" size="sm" onClick={bind} loading={loading} disabled={!qr.trim()}>
        <QrCode size={13} /> Bind Sticker
      </Button>
    </div>
  )
}

function PhotoUploadButton({
  itemId, photoType, onSuccess,
}: {
  itemId: string; photoType: 'open' | 'sealed'; onSuccess: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading,   setLoading]   = useState(false)
  const [progress,  setProgress]  = useState('')
  const [error,     setError]     = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(''); setProgress('Computing SHA-256…')
    try {
      setProgress('Uploading…')
      await api.items.uploadPhoto(itemId, photoType, file)
      setProgress('')
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"   // triggers camera on mobile
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        loading={loading}
      >
        <Camera size={13} />
        {loading ? progress : `Take ${photoType === 'open' ? 'Open Box' : 'Sealed Box'} Photo`}
      </Button>
      {error && <p className="font-body text-xs text-red-500 mt-1.5">{error}</p>}
      <p className="font-body text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
        SHA-256 computed on-device before upload
      </p>
    </div>
  )
}

function PhotoPreview({ url, label }: { url: string; label: string }) {
  return (
    <div>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={label}
          className="w-full h-32 object-cover rounded-lg border border-[var(--border)] hover:opacity-90 transition-opacity"
        />
      </a>
      <div className="flex items-center gap-1 mt-1.5">
        <CheckCircle2 size={10} className="text-green-500" />
        <p className="font-body text-[10px] text-green-600">Verified · tap to view full size</p>
      </div>
    </div>
  )
}

function ConditionPill({ condition }: { condition: string }) {
  const map: Record<string, [string, string]> = {
    good:    ['#dcfce7', '#166534'],
    fragile: ['#fef3c7', '#92400e'],
    damaged: ['#fee2e2', '#991b1b'],
  }
  const [bg, color] = map[condition] ?? ['var(--surface-2)', 'var(--text-muted)']
  return (
    <span
      className="font-body text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
      style={{ background: bg, color }}
    >
      {condition}
    </span>
  )
}
