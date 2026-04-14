// src/pages/packer/AddItemPage.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { Button, Input, Card } from '../../components/ui'
import { ArrowLeft, Plus, Package, ChevronRight } from 'lucide-react'

const CONDITIONS = [
  { value: 'good',    label: 'Good',    desc: 'No damage, works fine',       color: '#16a34a', bg: '#dcfce7' },
  { value: 'fragile', label: 'Fragile', desc: 'Handle with care',            color: '#d97706', bg: '#fef3c7' },
  { value: 'damaged', label: 'Damaged', desc: 'Pre-existing damage noted',   color: '#dc2626', bg: '#fee2e2' },
] as const

type Condition = 'good' | 'fragile' | 'damaged'

export default function AddItemPage() {
  const { id: moveId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [name, setName]           = useState('')
  const [condition, setCondition] = useState<Condition>('good')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [added, setAdded]         = useState<string[]>([])  // names of added items this session

  async function handleAdd(andNew: boolean) {
    if (!moveId || !name.trim()) { setError('Item name is required'); return }
    setLoading(true)
    setError('')
    try {
      const item = await api.items.create(moveId, {
        name: name.trim(),
        condition_pre: condition,
        notes: notes.trim() || undefined,
      })
      setAdded(prev => [...prev, item.name])
      if (andNew) {
        // Reset form for next item
        setName('')
        setNotes('')
        setCondition('good')
      } else {
        // Go to item detail to bind QR immediately
        navigate(`/packer/items/${item.id}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-lg animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/packer/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Back
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Add Item</span>
      </div>

      <div className="mb-7">
        <h1 className="font-display font-semibold text-2xl" style={{ color: 'var(--navy)' }}>
          Add Item
        </h1>
        <p className="font-body text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Create a Digital Twin record for each box or item.
        </p>
      </div>

      {/* Items added this session */}
      {added.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-6 border border-green-200"
          style={{ background: '#f0fdf4' }}
        >
          <p className="font-body text-xs font-medium text-green-700 mb-1.5">
            Added this session ({added.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {added.map((n, i) => (
              <span key={i} className="font-body text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Name */}
        <Input
          label="Item Name *"
          placeholder="e.g. Samsung 65-inch TV, Dining Table, Laptop Bag"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          error={error}
          autoFocus
        />

        {/* Condition selector */}
        <div>
          <p className="font-body text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Pre-move Condition *
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(c.value)}
                className="rounded-xl border-2 p-3 text-left transition-all"
                style={{
                  borderColor: condition === c.value ? c.color : 'var(--border)',
                  background:  condition === c.value ? c.bg : 'white',
                }}
              >
                <p className="font-body text-xs font-semibold mb-0.5" style={{ color: c.color }}>
                  {c.label}
                </p>
                <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {c.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="font-body text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Notes (optional)
          </label>
          <textarea
            placeholder="e.g. Remote control inside, bubble wrap needed"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white font-body text-sm resize-none"
            style={{ color: 'var(--text)' }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => handleAdd(true)}
            loading={loading}
            disabled={!name.trim()}
            className="flex-1"
          >
            <Plus size={14} /> Save & Add Another
          </Button>
          <Button
            variant="primary"
            onClick={() => handleAdd(false)}
            loading={loading}
            disabled={!name.trim()}
            className="flex-1"
          >
            Save & Bind QR <ChevronRight size={14} />
          </Button>
        </div>

        <p className="font-body text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          "Save & Bind QR" takes you directly to scan a sticker onto this item.
        </p>
      </div>
    </div>
  )
}
