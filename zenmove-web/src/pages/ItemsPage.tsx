// src/pages/ItemsPage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type Item } from '../services/api'
import { Spinner, Card, EmptyState, Button, PageHeader } from '../components/ui'
import { CONDITION_LABEL } from '../utils'
import {
  Package, QrCode, Camera, CheckCircle2, AlertTriangle,
  ArrowLeft, ChevronRight, Shield
} from 'lucide-react'

export default function ItemsPage() {
  const { id: moveId } = useParams<{ id: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!moveId) return
    api.items.list(moveId)
      .then(res => setItems(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [moveId])

  const bound    = items.filter(i => i.is_qr_bound).length
  const photos   = items.filter(i => i.is_photo_complete).length
  const highRisk = items.filter(i => i.is_high_risk).length

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Move Detail
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Items</span>
      </div>

      <PageHeader
        title="Item Inventory"
        subtitle={`${items.length} items registered for this move`}
      />

      {/* Summary chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-7">
          <Chip
            icon={QrCode}
            label={`${bound}/${items.length} QR bound`}
            ok={bound === items.length}
          />
          <Chip
            icon={Camera}
            label={`${photos}/${items.length} photos complete`}
            ok={photos === items.length}
          />
          {highRisk > 0 && (
            <Chip
              icon={AlertTriangle}
              label={`${highRisk} high risk (paper tag)`}
              ok={false}
              warn
            />
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items yet"
          description="Items are added by the packer using the ZenMove Packer App."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({
  icon: Icon, label, ok, warn = false,
}: {
  icon: React.ElementType; label: string; ok: boolean; warn?: boolean
}) {
  const bg    = warn ? '#fef3c7' : ok ? '#dcfce7' : 'var(--surface-2)'
  const color = warn ? '#92400e' : ok ? '#166534' : 'var(--text-muted)'
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium"
      style={{ background: bg, color }}
    >
      <Icon size={12} />
      {label}
    </div>
  )
}

function ItemCard({ item }: { item: Item }) {
  return (
    <Card accent className="animate-fade-up">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--navy)' }}>
              {item.name}
            </p>
            {item.notes && (
              <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {item.notes}
              </p>
            )}
          </div>
          <ConditionBadge condition={item.condition_pre} />
        </div>

        {/* Status row */}
        <div className="flex flex-wrap gap-2 mt-3">
          <StatusDot
            ok={item.is_qr_bound}
            icon={QrCode}
            label={item.qr_code ?? 'Not bound'}
            warn={false}
          />
          <StatusDot
            ok={item.is_photo_complete}
            icon={Camera}
            label={item.is_photo_complete ? 'Photos done' : 'Photos missing'}
            warn={!item.is_photo_complete}
          />
          <StatusDot
            ok={item.is_loaded}
            icon={CheckCircle2}
            label={item.is_loaded ? 'Loaded' : 'Not loaded'}
            warn={false}
          />
          {item.is_high_risk && (
            <StatusDot
              ok={false}
              icon={AlertTriangle}
              label="Paper tag"
              warn={true}
            />
          )}
          {item.tag_tier === 'PVC' && (
            <StatusDot
              ok={true}
              icon={Shield}
              label="PVC tag"
              warn={false}
            />
          )}
        </div>

        {/* Photos */}
        {(item.open_photo_url || item.sealed_photo_url) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
            {item.open_photo_url && (
              <a
                href={item.open_photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <img
                  src={item.open_photo_url}
                  alt="Open box"
                  className="w-full h-20 object-cover rounded-lg border border-[var(--border)]"
                />
                <p className="text-center font-body text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Open box
                </p>
              </a>
            )}
            {item.sealed_photo_url && (
              <a
                href={item.sealed_photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <img
                  src={item.sealed_photo_url}
                  alt="Sealed box"
                  className="w-full h-20 object-cover rounded-lg border border-[var(--border)]"
                />
                <p className="text-center font-body text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Sealed box
                </p>
              </a>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function StatusDot({
  ok, icon: Icon, label, warn,
}: {
  ok: boolean; icon: React.ElementType; label: string; warn: boolean
}) {
  const color = warn ? '#d97706' : ok ? '#16a34a' : 'var(--text-muted)'
  return (
    <div
      className="flex items-center gap-1 text-[10px] font-body px-2 py-1 rounded-md"
      style={{ background: 'var(--surface-2)', color }}
    >
      <Icon size={10} />
      <span className="truncate max-w-[100px]">{label}</span>
    </div>
  )
}

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    good:    { bg: '#dcfce7', color: '#166534' },
    fragile: { bg: '#fef3c7', color: '#92400e' },
    damaged: { bg: '#fee2e2', color: '#991b1b' },
  }
  const style = map[condition] ?? { bg: 'var(--surface-2)', color: 'var(--text-muted)' }
  return (
    <span
      className="text-[10px] font-body font-medium px-2 py-0.5 rounded-full shrink-0"
      style={style}
    >
      {CONDITION_LABEL[condition as keyof typeof CONDITION_LABEL] ?? condition}
    </span>
  )
}
