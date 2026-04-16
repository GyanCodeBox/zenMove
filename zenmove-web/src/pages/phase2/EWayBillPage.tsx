// src/pages/phase2/EWayBillPage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ewayBillApi, type EWayBill } from '../../services/api.phase2'
import { Button, Card, Input, Spinner } from '../../components/ui'
import { ArrowLeft, ChevronRight, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function EWayBillPage() {
  const { id: moveId } = useParams<{ id: string }>()
  const [existing, setExisting]   = useState<EWayBill | null>(null)
  const [loading, setLoading]     = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]         = useState('')
  const navigate = useNavigate()

  const [form, setForm] = useState({
    gstin_supplier:  '21AABCU9603R1ZX',
    gstin_recipient: '29GGGGG1314R9Z6',
    vehicle_no:      'OD05AB1234',
    distance_km:     '1500',
    total_value:     '28500',
  })

  useEffect(() => {
    if (!moveId) return
    ewayBillApi.get(moveId)
      .then(setExisting)
      .catch(() => {/* not generated yet */})
      .finally(() => setLoading(false))
  }, [moveId])

  function set(key: string, val: string) {
    setForm(p => ({ ...p, [key]: val }))
    setError('')
  }

  async function generate() {
    if (!moveId) return
    setGenerating(true); setError('')
    try {
      const result = await ewayBillApi.generate(moveId, {
        gstin_supplier:  form.gstin_supplier,
        gstin_recipient: form.gstin_recipient,
        vehicle_no:      form.vehicle_no,
        distance_km:     Number(form.distance_km),
        total_value:     Number(form.total_value),
      })
      setExisting(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size={24} /></div>

  return (
    <div className="p-8 max-w-lg animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/packer/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Move
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>E-Way Bill</span>
      </div>

      <h1 className="font-display font-semibold text-2xl mb-1 animate-fade-up" style={{ color: 'var(--navy)' }}>
        E-Way Bill
      </h1>
      <p className="font-body text-sm mb-7 animate-fade-up" style={{ color: 'var(--text-muted)' }}>
        Mandatory for inter-state moves. Required before M2 escrow release.
      </p>

      {existing?.is_active ? (
        /* ── Active EWB ── */
        <div className="animate-fade-up">
          <div
            className="rounded-xl p-5 grain relative overflow-hidden mb-5"
            style={{ background: 'var(--navy)' }}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10" style={{ background: 'var(--teal)' }} />
            <div className="relative z-10 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-semibold text-white text-sm mb-1">E-Way Bill Generated</p>
                <p className="font-mono font-bold text-2xl" style={{ color: 'var(--amber)' }}>
                  {existing.ewb_no}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Generated', value: existing.ewb_date ?? '—' },
              { label: 'Valid Until', value: existing.valid_upto ?? '—' },
              { label: 'Vehicle No', value: existing.vehicle_no ?? '—' },
              { label: 'Distance', value: existing.distance_km ? `${existing.distance_km} km` : '—' },
            ].map(({ label, value }) => (
              <Card key={label} className="p-3">
                <p className="font-body text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="font-body text-sm font-medium" style={{ color: 'var(--navy)' }}>{value}</p>
              </Card>
            ))}
          </div>

          {existing.is_sandbox && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fef3c7' }}>
              <AlertTriangle size={12} className="text-amber-500" />
              <p className="font-body text-xs text-amber-700">Sandbox mode — not a real E-Way Bill</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Generate form ── */
        <div className="space-y-4 animate-fade-up">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Supplier GSTIN"
              placeholder="21AABCU9603R1ZX"
              value={form.gstin_supplier}
              onChange={e => set('gstin_supplier', e.target.value.toUpperCase())}
            />
            <Input
              label="Recipient GSTIN"
              placeholder="29GGGGG1314R9Z6"
              value={form.gstin_recipient}
              onChange={e => set('gstin_recipient', e.target.value.toUpperCase())}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vehicle Number"
              placeholder="OD05AB1234"
              value={form.vehicle_no}
              onChange={e => set('vehicle_no', e.target.value.toUpperCase())}
            />
            <Input
              label="Distance (km)"
              type="number"
              placeholder="1500"
              value={form.distance_km}
              onChange={e => set('distance_km', e.target.value)}
            />
          </div>
          <Input
            label="Total Value (₹)"
            type="number"
            placeholder="28500"
            value={form.total_value}
            onChange={e => set('total_value', e.target.value)}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="font-body text-sm text-red-600">{error}</p>
            </div>
          )}

          <div
            className="rounded-xl px-4 py-3 flex items-start gap-2"
            style={{ background: 'var(--surface-2)' }}
          >
            <FileText size={13} style={{ color: 'var(--text-muted)' }} className="shrink-0 mt-0.5" />
            <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
              Currently in sandbox mode. EWB number will be a mock value.
              Set NIC_SANDBOX=false in .env to go live.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={generate}
            loading={generating}
            disabled={!form.gstin_supplier || !form.gstin_recipient || !form.vehicle_no || !form.distance_km || !form.total_value}
          >
            <FileText size={15} /> Generate E-Way Bill
          </Button>
        </div>
      )}
    </div>
  )
}
