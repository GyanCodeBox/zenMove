// src/pages/AuthPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuthStore } from '../store/auth'
import { Button, Input } from '../components/ui'
import { Eye, EyeOff, ArrowRight, Shield } from 'lucide-react'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    phone: '', password: '', full_name: '', email: '',
  })

  function set(key: string, val: string) {
    setForm((p) => ({ ...p, [key]: val }))
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const res = await api.auth.login(form.phone, form.password)
        setAuth(res.user, res.access_token)
        navigate('/moves')
      } else {
        const payload = { ...form, role: 'customer' }
        if (!payload.email) delete (payload as any).email
        await api.auth.register(payload as any)
        const res = await api.auth.login(form.phone, form.password)
        setAuth(res.user, res.access_token)
        navigate('/moves')
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex grain relative overflow-hidden"
      style={{ background: 'var(--navy)' }}
    >
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 p-12 relative">
        {/* Decorative circles */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'var(--teal)' }}
        />
        <div
          className="absolute bottom-20 -left-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'var(--amber)' }}
        />

        {/* Logo at the top */}
        <div className="relative z-10 flex items-center gap-3 mb-auto">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-white"
            style={{ background: 'var(--amber)' }}
          >
            ZM
          </div>
          <span className="font-display text-white font-semibold text-lg">ZenMove</span>
        </div>

        {/* Messaging content grouped together */}
        <div className="relative z-10 mt-12 pb-8">
          <h2 className="font-display text-white text-4xl font-semibold leading-tight mb-6">
            Move with<br />
            <span style={{ color: 'var(--amber)' }}>absolute trust.</span>
          </h2>
          <p className="font-body text-white/50 text-base leading-relaxed mb-12">
            Every item tagged. Every rupee in escrow.<br />Every move provably honest.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🔐', text: 'QR-verified digital twin for every item' },
              { icon: '💰', text: 'Smart escrow — pay only on safe delivery' },
              { icon: '📸', text: 'Tamper-evident photo proof with SHA-256' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <p className="font-body text-white/60 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div
          className="w-full max-w-md rounded-2xl p-8 animate-fade-up"
          style={{ background: 'white' }}
        >
          {/* Tab toggle */}
          <div
            className="flex rounded-lg p-1 mb-8"
            style={{ background: 'var(--surface-2)' }}
          >
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-md text-sm font-body font-medium transition-all
                  ${mode === m ? 'bg-white shadow-sm text-navy-600' : 'text-[var(--text-muted)]'}`}
                style={mode === m ? { color: 'var(--navy)' } : {}}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Full Name"
                placeholder="Arjun Sharma"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                required
              />
            )}

            <Input
              label="Mobile Number"
              placeholder="9876543210"
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
            />

            {mode === 'register' && (
              <Input
                label="Email (optional)"
                placeholder="arjun@example.com"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-body text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[var(--border)] bg-white font-body text-sm"
                  style={{ color: 'var(--text)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-sm font-body">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
              <ArrowRight size={16} />
            </Button>
          </form>

          <div className="flex items-center gap-2 mt-6 justify-center">
            <Shield size={12} style={{ color: 'var(--text-muted)' }} />
            <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
              Your data is encrypted and stored securely
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
