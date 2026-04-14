// src/pages/CreateMovePage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { PageHeader, Button, Input } from '../components/ui'
import { ArrowLeft, ArrowRight, MapPin, Calendar, IndianRupee, Truck } from 'lucide-react'

const CITY_CODES = [
  { code: 'BBS', name: 'Bhubaneswar' },
  { code: 'BLR', name: 'Bangalore' },
  { code: 'HYD', name: 'Hyderabad' },
  { code: 'MUM', name: 'Mumbai' },
  { code: 'DEL', name: 'Delhi' },
  { code: 'CHE', name: 'Chennai' },
  { code: 'PUN', name: 'Pune' },
  { code: 'KOL', name: 'Kolkata' },
]

interface FormState {
  origin_address: string
  dest_address: string
  origin_city_code: string
  dest_city_code: string
  scheduled_at: string
  quote_amount: string
}

const INITIAL: FormState = {
  origin_address: '',
  dest_address: '',
  origin_city_code: 'BBS',
  dest_city_code: 'BLR',
  scheduled_at: '',
  quote_amount: '',
}

export default function CreateMovePage() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function set(key: keyof FormState, val: string) {
    setForm(p => ({ ...p, [key]: val }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  function validate(): boolean {
    const e: Partial<FormState> = {}
    if (!form.origin_address.trim()) e.origin_address = 'Origin address is required'
    if (!form.dest_address.trim())   e.dest_address   = 'Destination address is required'
    if (!form.scheduled_at)          e.scheduled_at   = 'Schedule date is required'
    if (!form.quote_amount || Number(form.quote_amount) <= 0)
      e.quote_amount = 'Enter a valid quote amount'
    if (form.origin_city_code === form.dest_city_code)
      e.dest_city_code = 'Origin and destination city must differ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const move = await api.moves.create({
        origin_address:   form.origin_address,
        dest_address:     form.dest_address,
        origin_city_code: form.origin_city_code,
        dest_city_code:   form.dest_city_code,
        scheduled_at:     new Date(form.scheduled_at).toISOString(),
        quote_amount:     Number(form.quote_amount),
      })
      navigate(`/moves/${move.id}`)
    } catch (err: any) {
      setErrors({ quote_amount: err.message })
    } finally {
      setLoading(false)
    }
  }

  const selectedOrigin = CITY_CODES.find(c => c.code === form.origin_city_code)
  const selectedDest   = CITY_CODES.find(c => c.code === form.dest_city_code)

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <PageHeader
        title="Create New Move"
        subtitle="Fill in the details to get started with your relocation"
      />

      {/* Route preview card */}
      {form.origin_city_code && form.dest_city_code && (
        <div
          className="rounded-xl p-5 mb-8 flex items-center gap-4 animate-fade-up"
          style={{ background: 'var(--navy)', color: 'white' }}
        >
          <Truck size={20} style={{ color: 'var(--amber)' }} className="shrink-0" />
          <div className="flex-1 font-display">
            <span className="font-semibold text-lg">{selectedOrigin?.name}</span>
            <span className="text-white/40 mx-3">→</span>
            <span className="font-semibold text-lg">{selectedDest?.name}</span>
          </div>
          {form.quote_amount && (
            <div className="text-right">
              <p className="text-xs text-white/40 font-body mb-0.5">Quote</p>
              <p className="font-display font-semibold" style={{ color: 'var(--amber)' }}>
                ₹{Number(form.quote_amount).toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        {/* Origin */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--teal)' }}>
              <MapPin size={12} className="text-white" />
            </div>
            <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--navy)' }}>
              Pickup Location
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 pl-8">
            <div className="col-span-2">
              <Input
                label="Full Address"
                placeholder="Plot 12, Saheed Nagar, Bhubaneswar"
                value={form.origin_address}
                onChange={e => set('origin_address', e.target.value)}
                error={errors.origin_address}
              />
            </div>
            <div>
              <label className="font-body text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                City
              </label>
              <select
                value={form.origin_city_code}
                onChange={e => set('origin_city_code', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white font-body text-sm"
              >
                {CITY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--amber)' }}>
              <MapPin size={12} className="text-white" />
            </div>
            <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--navy)' }}>
              Drop Location
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 pl-8">
            <div className="col-span-2">
              <Input
                label="Full Address"
                placeholder="Koramangala 5th Block, Bangalore"
                value={form.dest_address}
                onChange={e => set('dest_address', e.target.value)}
                error={errors.dest_address}
              />
            </div>
            <div>
              <label className="font-body text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                City
              </label>
              <select
                value={form.dest_city_code}
                onChange={e => set('dest_city_code', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white font-body text-sm"
              >
                {CITY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              {errors.dest_city_code && (
                <p className="text-red-500 text-xs mt-1 font-body">{errors.dest_city_code}</p>
              )}
            </div>
          </div>
        </div>

        {/* Schedule + Quote */}
        <div className="grid grid-cols-2 gap-4 pl-8">
          <div>
            <label className="font-body text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={11} className="inline mr-1" />
              Scheduled Date
            </label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={e => set('scheduled_at', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white font-body text-sm"
              min={new Date().toISOString().slice(0, 16)}
            />
            {errors.scheduled_at && (
              <p className="text-red-500 text-xs mt-1 font-body">{errors.scheduled_at}</p>
            )}
          </div>

          <div>
            <label className="font-body text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              <IndianRupee size={11} className="inline mr-1" />
              Quoted Amount (₹)
            </label>
            <input
              type="number"
              placeholder="28500"
              value={form.quote_amount}
              onChange={e => set('quote_amount', e.target.value)}
              min={1}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white font-body text-sm"
            />
            {errors.quote_amount && (
              <p className="text-red-500 text-xs mt-1 font-body">{errors.quote_amount}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <Button
            variant="ghost"
            onClick={() => navigate('/moves')}
          >
            <ArrowLeft size={15} /> Back
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
          >
            Create Move <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </div>
  )
}
