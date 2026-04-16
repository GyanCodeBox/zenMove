// src/pages/phase2/PaymentCheckoutPage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { escrowApi, type EscrowStatus } from '../../services/api.phase2'
import { api, type Move } from '../../services/api'
import { Button, Card, Spinner } from '../../components/ui'
import { formatCurrency } from '../../utils'
import {
  Shield, Lock, ChevronRight, ArrowLeft,
  CheckCircle2, IndianRupee, Info
} from 'lucide-react'

const MILESTONE_INFO = [
  { key: 'M1_booking',  pct: 10, label: 'Booking Confirmed',    when: 'Paid now'                  },
  { key: 'M2_loading',  pct: 30, label: 'Loading Complete',      when: 'After manifest + E-Way Bill' },
  { key: 'M3_delivery', pct: 50, label: 'OTP-Verified Delivery', when: 'When you enter delivery OTP' },
  { key: 'M4_closeout', pct: 0,  label: 'Dispute Window Closed', when: '48h after delivery'          },
]

export default function PaymentCheckoutPage() {
  const { id: moveId } = useParams<{ id: string }>()
  const [move, setMove]           = useState<Move | null>(null)
  const [loading, setLoading]     = useState(true)
  const [paying, setPaying]       = useState(false)
  const [paid, setPaid]           = useState(false)
  const [escrow, setEscrow]       = useState<EscrowStatus | null>(null)
  const [error, setError]         = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!moveId) return
    api.moves.get(moveId)
      .then(m => {
        setMove(m)
        // If escrow already exists, load it
        if (m.escrow_id) {
          return escrowApi.getStatus(moveId).then(data => {
            setEscrow(data)
            setPaid(true)
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [moveId])

  async function handlePay() {
    if (!moveId) return
    setPaying(true)
    setError('')
    try {
      // Mock: simulate a brief "payment processing" delay
      await new Promise(r => setTimeout(r, 1200))
      const mockRef = `MOCK-PAY-${Date.now()}`
      const result = await escrowApi.init(moveId, mockRef)
      setEscrow(result)
      setPaid(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size={28} /></div>
  if (!move)   return <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Move not found.</div>

  const total    = move.quote_amount
  const m1Amount = Math.round(total * 0.10 * 100) / 100
  const platform = Math.round(total * 0.10 * 100) / 100

  return (
    <div className="p-8 max-w-xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Move Detail
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          Payment
        </span>
      </div>

      {paid && escrow ? (
        <PaymentSuccess escrow={escrow} moveId={moveId!} navigate={navigate} />
      ) : (
        <>
          <div className="mb-7 animate-fade-up">
            <h1 className="font-display font-semibold text-2xl mb-1" style={{ color: 'var(--navy)' }}>
              Secure Payment
            </h1>
            <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
              Your money is held in a regulated escrow account until safe delivery.
            </p>
          </div>

          {/* Escrow explainer */}
          <div
            className="rounded-xl p-5 mb-6 grain relative overflow-hidden animate-fade-up"
            style={{ background: 'var(--navy)' }}
          >
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10" style={{ background: 'var(--teal)' }} />
            <div className="relative z-10 flex items-start gap-3 mb-4">
              <Shield size={18} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-semibold text-white text-sm">ZenMove Escrow Protection</p>
                <p className="font-body text-white/50 text-xs mt-0.5">
                  Funds are released in milestones — never all at once.
                </p>
              </div>
            </div>
            <div className="space-y-2.5 relative z-10">
              {MILESTONE_INFO.map((m, i) => (
                <div key={m.key} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-display font-bold shrink-0"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--amber)' }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-body text-white text-xs font-medium">{m.label}</p>
                    <p className="font-body text-white/40 text-[10px]">{m.when}</p>
                  </div>
                  <p className="font-display font-semibold text-xs shrink-0" style={{ color: 'var(--amber)' }}>
                    {m.key === 'M4_closeout'
                      ? `~${(100 - 10 - 30 - 50).toFixed(0) === '0' ? '₹' + formatCurrency(total - (total * 0.10) - (total * 0.30) - (total * 0.50)).replace('₹', '') : `${100 - 10 - 30 - 50}% · ${formatCurrency(total - (total * 0.10) - (total * 0.30) - (total * 0.50))}`}`
                      : `${m.pct}% · ${formatCurrency(total * m.pct / 100)}`
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <Card className="p-5 mb-4 animate-fade-up">
            <p className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--navy)' }}>
              Order Summary
            </p>
            <div className="space-y-2.5">
              <SummaryRow label="Route" value={`${move.origin_city_code} → ${move.dest_city_code}`} />
              <SummaryRow label="Service charge" value={formatCurrency(total - platform)} />
              <SummaryRow label="Platform fee (10%)" value={formatCurrency(platform)} muted />
              <div className="border-t border-[var(--border)] pt-2.5 mt-2.5">
                <SummaryRow
                  label="Total payable"
                  value={formatCurrency(total)}
                  bold
                />
              </div>
              <div
                className="rounded-lg px-3 py-2 flex items-center gap-2 mt-1"
                style={{ background: 'var(--surface-2)' }}
              >
                <Info size={12} style={{ color: 'var(--text-muted)' }} />
                <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency(m1Amount)} released immediately as booking fee. Rest held in escrow.
                </p>
              </div>
            </div>
          </Card>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <p className="font-body text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Pay button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full animate-fade-up"
            onClick={handlePay}
            loading={paying}
          >
            {paying ? 'Processing payment…' : (
              <>
                <Lock size={15} />
                Pay {formatCurrency(total)} Securely
              </>
            )}
          </Button>

          <p className="font-body text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
            Mock payment — no real money involved. Razorpay integration in production.
          </p>
        </>
      )}
    </div>
  )
}

function PaymentSuccess({
  escrow, moveId, navigate,
}: {
  escrow: EscrowStatus
  moveId: string
  navigate: (path: string) => void
}) {
  const m1 = escrow.milestones.find(m => m.milestone === 'M1_booking')

  return (
    <div className="animate-fade-up text-center py-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ background: '#dcfce7' }}
      >
        <CheckCircle2 size={32} className="text-green-500" />
      </div>
      <h2 className="font-display font-semibold text-2xl mb-2" style={{ color: 'var(--navy)' }}>
        Payment Confirmed
      </h2>
      <p className="font-body text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {formatCurrency(m1?.amount ?? 0)} released to vendor as booking fee.
        Remaining {formatCurrency(escrow.vault_balance)} secured in escrow.
      </p>

      <div className="grid grid-cols-2 gap-3 text-left mb-7">
        <Card className="p-4">
          <p className="font-body text-xs mb-1" style={{ color: 'var(--text-muted)' }}>In Escrow</p>
          <p className="font-display font-semibold text-xl" style={{ color: 'var(--navy)' }}>
            {formatCurrency(escrow.vault_balance)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="font-body text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Released (M1)</p>
          <p className="font-display font-semibold text-xl text-green-600">
            {formatCurrency(escrow.released_amount)}
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" className="w-full" onClick={() => navigate(`/moves/${moveId}/escrow`)}>
          View Escrow Tracker <ChevronRight size={15} />
        </Button>
        <Button variant="ghost" onClick={() => navigate(`/moves/${moveId}`)}>
          Back to Move
        </Button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, bold = false, muted = false }: {
  label: string; value: string; bold?: boolean; muted?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <p className="font-body text-sm" style={{ color: muted ? 'var(--text-muted)' : 'var(--text)' }}>
        {label}
      </p>
      <p
        className={`font-body text-sm ${bold ? 'font-semibold' : ''}`}
        style={{ color: bold ? 'var(--navy)' : muted ? 'var(--text-muted)' : 'var(--text)' }}
      >
        {value}
      </p>
    </div>
  )
}
