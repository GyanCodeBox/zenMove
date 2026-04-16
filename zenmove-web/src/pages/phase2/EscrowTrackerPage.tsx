// src/pages/phase2/EscrowTrackerPage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { escrowApi, ewayBillApi, type EscrowStatus, type EWayBill, type Milestone } from '../../services/api.phase2'
import { Button, Card, Spinner, StatCard } from '../../components/ui'
import { formatCurrency, formatDateTime } from '../../utils'
import {
  ArrowLeft, ChevronRight, CheckCircle2, Clock,
  Lock, AlertTriangle, RefreshCw, FileText,
  Truck, Shield, IndianRupee
} from 'lucide-react'

const MILESTONE_META: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  M1_booking:  { label: 'Booking Confirmed',     icon: CheckCircle2, desc: 'Paid at booking'               },
  M2_loading:  { label: 'Loading Complete',       icon: Truck,        desc: 'Manifest + E-Way Bill verified' },
  M3_delivery: { label: 'Delivery Confirmed',     icon: Shield,       desc: 'OTP-verified handover'          },
  M4_closeout: { label: 'Dispute Window Closed',  icon: Lock,         desc: '48h after delivery'             },
}

export default function EscrowTrackerPage() {
  const { id: moveId } = useParams<{ id: string }>()
  const [escrow, setEscrow]   = useState<EscrowStatus | null>(null)
  const [ewb, setEwb]         = useState<EWayBill | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [releasingM2, setReleasingM2] = useState(false)
  const navigate = useNavigate()

  async function handleReleaseM2() {
    if (!moveId) return
    setReleasingM2(true)
    try {
      await escrowApi.releaseM2(moveId)
      await load(true)
    } catch (e) {
      console.error('Failed to release M2', e)
    } finally {
      setReleasingM2(false)
    }
  }

  async function load(quiet = false) {
    if (!moveId) return
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      const [e] = await Promise.all([
        escrowApi.getStatus(moveId),
      ])
      setEscrow(e)
      // Try to load E-Way Bill (may not exist yet)
      try {
        const ewbData = await ewayBillApi.get(moveId)
        setEwb(ewbData)
      } catch { /* not generated yet */ }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [moveId])

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size={28} /></div>

  if (!escrow) return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Move
        </Button>
      </div>
      <Card className="p-8 text-center">
        <Lock size={28} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
        <p className="font-display font-semibold text-base mb-1" style={{ color: 'var(--navy)' }}>
          No escrow yet
        </p>
        <p className="font-body text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Payment hasn't been initiated for this move.
        </p>
        <Button variant="primary" onClick={() => navigate(`/moves/${moveId}/payment`)}>
          <IndianRupee size={14} /> Initiate Payment
        </Button>
      </Card>
    </div>
  )

  const released    = escrow.milestones.filter(m => m.status === 'released')
  const heldCount   = escrow.milestones.filter(m => m.status === 'held').length
  const progressPct = Math.round((escrow.released_amount / escrow.total_amount) * 100)

  return (
    <div className="p-8 max-w-xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/moves/${moveId}`)}>
            <ArrowLeft size={14} /> Move
          </Button>
          <ChevronRight size={14} style={{ color: 'var(--border)' }} />
          <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Escrow</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => load(true)} loading={refreshing}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      <h1 className="font-display font-semibold text-2xl mb-1 animate-fade-up" style={{ color: 'var(--navy)' }}>
        Escrow Tracker
      </h1>
      <p className="font-body text-sm mb-7 animate-fade-up" style={{ color: 'var(--text-muted)' }}>
        Your money is released only when each milestone is verified.
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-7 stagger">
        <StatCard
          label="Total Locked"
          value={formatCurrency(escrow.total_amount)}
          className="animate-fade-up"
        />
        <StatCard
          label="In Vault"
          value={formatCurrency(escrow.vault_balance)}
          color="var(--teal)"
          className="animate-fade-up"
        />
        <StatCard
          label="Released"
          value={formatCurrency(escrow.released_amount)}
          color="#16a34a"
          className="animate-fade-up"
        />
      </div>

      {/* Overall progress bar */}
      <div className="mb-7 animate-fade-up">
        <div className="flex justify-between mb-1.5">
          <p className="font-body text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Release progress
          </p>
          <p className="font-body text-xs font-semibold" style={{ color: 'var(--navy)' }}>
            {progressPct}%
          </p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%`, background: 'var(--teal)' }}
          />
        </div>
        {heldCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <AlertTriangle size={11} className="text-amber-500" />
            <p className="font-body text-xs text-amber-600">
              {heldCount} milestone{heldCount > 1 ? 's' : ''} held — active dispute
            </p>
          </div>
        )}
      </div>

      {/* Milestone cards */}
      <div className="space-y-3 mb-7 stagger">
        {escrow.milestones.map((m, i) => (
          <MilestoneCard 
            key={m.id} 
            milestone={m} 
            index={i} 
            total={escrow.total_amount}
            ewbActive={!!ewb?.is_active}
            onReleaseM2={handleReleaseM2}
            releasingM2={releasingM2}
          />
        ))}
      </div>

      {/* E-Way Bill status */}
      <Card className="p-4 mb-5 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={15} style={{ color: 'var(--teal)' }} />
            <p className="font-body text-sm font-medium" style={{ color: 'var(--navy)' }}>
              E-Way Bill
            </p>
          </div>
          {ewb?.is_active ? (
            <div>
              <span className="font-body text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                ✓ {ewb.ewb_no}
              </span>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/moves/${moveId}/eway-bill`)}
            >
              Generate
            </Button>
          )}
        </div>
        {ewb?.valid_upto && (
          <p className="font-body text-xs mt-2 pl-6" style={{ color: 'var(--text-muted)' }}>
            Valid until {ewb.valid_upto} · {ewb.is_sandbox ? 'Sandbox' : 'Live'}
          </p>
        )}
        {!ewb && (
          <p className="font-body text-xs mt-1 pl-6" style={{ color: 'var(--text-muted)' }}>
            Required before M2 (30%) can be released
          </p>
        )}
      </Card>

      {/* Fee breakdown */}
      <Card className="p-4 animate-fade-up">
        <p className="font-display font-semibold text-xs mb-3" style={{ color: 'var(--navy)' }}>
          Fee Breakdown
        </p>
        <div className="space-y-1.5">
          <FeeRow label="Total paid" value={formatCurrency(escrow.total_amount)} />
          <FeeRow label="Platform fee (10%)" value={`−${formatCurrency(escrow.platform_fee)}`} muted />
          <div className="border-t border-[var(--border)] pt-1.5 mt-1.5">
            <FeeRow label="Vendor receives" value={formatCurrency(escrow.vendor_total)} bold />
          </div>
        </div>
      </Card>
    </div>
  )
}

function MilestoneCard({ milestone: m, index, total, ewbActive, onReleaseM2, releasingM2 }: {
  milestone: Milestone; index: number; total: number;
  ewbActive?: boolean; onReleaseM2?: () => void; releasingM2?: boolean;
}) {
  const meta   = MILESTONE_META[m.milestone]
  const Icon   = meta.icon
  const isDone = m.status === 'released'
  const isHeld = m.status === 'held'

  const statusColor = isDone ? '#16a34a' : isHeld ? '#d97706' : 'var(--text-muted)'
  const statusBg    = isDone ? '#dcfce7' : isHeld ? '#fef3c7' : 'var(--surface-2)'
  const statusLabel = isDone ? 'Released' : isHeld ? 'On Hold' : 'Pending'

  // M4 amount = remainder
  const displayAmt = m.milestone === 'M4_closeout'
    ? total - (total * 0.10) - (total * 0.30) - (total * 0.60)
    : m.amount

  return (
    <Card className="animate-fade-up overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Step indicator */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{ background: isDone ? '#dcfce7' : 'var(--surface-2)' }}
          >
            <Icon size={15} style={{ color: isDone ? '#16a34a' : 'var(--text-muted)' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-body font-medium text-sm" style={{ color: 'var(--navy)' }}>
                  {meta.label}
                </p>
                <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {meta.desc}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-semibold text-sm" style={{ color: 'var(--navy)' }}>
                  {formatCurrency(Math.abs(displayAmt))}
                </p>
                <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {m.pct_of_total.toFixed(0)}% of total
                </p>
              </div>
            </div>

            {/* Status + meta */}
            <div className="flex items-center gap-2 mt-2.5">
              <span
                className="font-body text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: statusBg, color: statusColor }}
              >
                {statusLabel}
              </span>
              {m.released_at && (
                <span className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {formatDateTime(m.released_at)}
                </span>
              )}
              {m.trigger_event && (
                <span className="font-body text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  · {m.trigger_event}
                </span>
              )}
              {!isDone && m.milestone === 'M2_loading' && ewbActive && (
                <Button 
                  size="sm" 
                  variant="primary" 
                  className="ml-auto text-[10px] h-6 px-3"
                  onClick={onReleaseM2}
                  loading={releasingM2}
                >
                  Verify & Release
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Released progress bar at bottom */}
      {isDone && (
        <div className="h-0.5" style={{ background: '#16a34a' }} />
      )}
      {isHeld && (
        <div className="h-0.5" style={{ background: '#d97706' }} />
      )}
    </Card>
  )
}

function FeeRow({ label, value, bold = false, muted = false }: {
  label: string; value: string; bold?: boolean; muted?: boolean
}) {
  return (
    <div className="flex justify-between">
      <p className="font-body text-xs" style={{ color: muted ? 'var(--text-muted)' : 'var(--text)' }}>
        {label}
      </p>
      <p className={`font-body text-xs ${bold ? 'font-semibold' : ''}`}
        style={{ color: bold ? 'var(--navy)' : muted ? 'var(--text-muted)' : 'var(--text)' }}>
        {value}
      </p>
    </div>
  )
}
