// src/pages/phase2/OTPDeliveryPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { otpApi, type OTPGenerateResult, type OTPVerifyResult } from '../../services/api.phase2'
import { Button, Card, Spinner } from '../../components/ui'
import { formatCurrency } from '../../utils'
import { ArrowLeft, ChevronRight, Shield, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react'

export default function OTPDeliveryPage() {
  const { id: moveId } = useParams<{ id: string }>()
  const [generated, setGenerated]     = useState<OTPGenerateResult | null>(null)
  const [verified, setVerified]       = useState<OTPVerifyResult | null>(null)
  const [otp, setOtp]                 = useState(['', '', '', '', '', ''])
  const [generating, setGenerating]   = useState(false)
  const [verifying, setVerifying]     = useState(false)
  const [error, setError]             = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-generate OTP on mount
    handleGenerate()
  }, [])

  async function handleGenerate() {
    if (!moveId) return
    setGenerating(true)
    setError('')
    setOtp(['', '', '', '', '', ''])
    try {
      const result = await otpApi.generate(moveId)
      setGenerated(result)
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleVerify() {
    const code = otp.join('')
    if (code.length !== 6) { setError('Please enter the complete 6-digit OTP.'); return }
    if (!moveId) return
    setVerifying(true)
    setError('')
    try {
      const result = await otpApi.verify(moveId, code)
      setVerified(result)
    } catch (err: any) {
      setError(err.message)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return   // digits only
    const next = [...otp]
    next[index] = value.slice(-1)      // single digit
    setOtp(next)
    setError('')
    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    // Auto-verify when all 6 filled
    if (value && index === 5 && next.every(d => d !== '')) {
      setTimeout(() => {
        const code = next.join('')
        if (!moveId) return
        setVerifying(true)
        setError('')
        otpApi.verify(moveId, code)
          .then(setVerified)
          .catch((err: any) => {
            setError(err.message)
            setOtp(['', '', '', '', '', ''])
            inputRefs.current[0]?.focus()
          })
          .finally(() => setVerifying(false))
      }, 200)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  if (verified) {
    return (
      <div className="p-8 max-w-md animate-fade-in">
        <div className="text-center py-8 animate-fade-up">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#dcfce7' }}>
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="font-display font-semibold text-2xl mb-2" style={{ color: 'var(--navy)' }}>
            Delivery Confirmed!
          </h2>
          <p className="font-body text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            {verified.message}
          </p>
          <div
            className="rounded-xl p-4 mb-7 text-left"
            style={{ background: 'var(--surface-2)' }}
          >
            <p className="font-body text-xs mb-1" style={{ color: 'var(--text-muted)' }}>M3 Released</p>
            <p className="font-display font-semibold text-2xl" style={{ color: '#16a34a' }}>
              {formatCurrency(verified.amount_released)}
            </p>
            <p className="font-body text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Dispute window open for 24 hours
            </p>
          </div>
          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate(`/moves/${moveId}/escrow`)}
            >
              View Escrow Status <ChevronRight size={14} />
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/moves/${moveId}/dispute/new`)}
            >
              Report a Problem
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-md animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Move
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Confirm Delivery</span>
      </div>

      <div className="text-center mb-8 animate-fade-up">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--surface-2)' }}
        >
          <Shield size={24} style={{ color: 'var(--teal)' }} />
        </div>
        <h1 className="font-display font-semibold text-2xl mb-2" style={{ color: 'var(--navy)' }}>
          Confirm Delivery
        </h1>
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          Enter the 6-digit OTP to confirm you received your goods.
          This releases 60% of the escrow to the vendor.
        </p>
      </div>

      {generating ? (
        <div className="flex flex-col items-center py-8 gap-3">
          <Spinner size={24} />
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Generating OTP…</p>
        </div>
      ) : (
        <div className="animate-fade-up">
          {/* Mock OTP preview (dev only) */}
          {generated?.otp_preview && (
            <Card className="p-4 mb-6 border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-xs font-medium text-amber-700 mb-0.5">
                    🧪 Mock mode — your OTP
                  </p>
                  <p
                    className="font-display font-bold text-2xl tracking-widest"
                    style={{ color: 'var(--navy)', filter: showPreview ? 'none' : 'blur(8px)', transition: 'filter 0.2s' }}
                  >
                    {generated.otp_preview}
                  </p>
                </div>
                <button
                  onClick={() => setShowPreview(p => !p)}
                  className="p-2 rounded-lg hover:bg-amber-50"
                >
                  {showPreview
                    ? <EyeOff size={16} className="text-amber-600" />
                    : <Eye     size={16} className="text-amber-600" />}
                </button>
              </div>
              <p className="font-body text-[10px] text-amber-600 mt-1">
                In production, this OTP is sent via WhatsApp/SMS only.
              </p>
            </Card>
          )}

          {/* OTP input grid */}
          <div className="flex gap-2.5 justify-center mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-12 h-14 text-center rounded-xl border-2 font-display font-semibold text-xl transition-all"
                style={{
                  borderColor: digit ? 'var(--teal)' : 'var(--border)',
                  background:  digit ? 'var(--light, #EBF4FA)' : 'white',
                  color: 'var(--navy)',
                  outline: 'none',
                }}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-center">
              <p className="font-body text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full mb-3"
            onClick={handleVerify}
            loading={verifying}
            disabled={otp.some(d => d === '')}
          >
            Verify & Confirm Delivery
          </Button>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-1.5 font-body text-sm py-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw size={13} /> Resend OTP
          </button>

          <p className="font-body text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
            OTP expires in 10 minutes
          </p>
        </div>
      )}
    </div>
  )
}
