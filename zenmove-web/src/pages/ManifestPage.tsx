// src/pages/ManifestPage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type ManifestSummary } from '../services/api'
import { Spinner, Button, Card, StatCard } from '../components/ui'
import { formatDateTime } from '../utils'
import {
  FileText, Download, ExternalLink, ArrowLeft,
  ChevronRight, Package, AlertTriangle, CheckCircle2,
  QrCode, Camera, RefreshCw
} from 'lucide-react'

export default function ManifestPage() {
  const { id: moveId } = useParams<{ id: string }>()
  const [manifest, setManifest] = useState<ManifestSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  async function generate() {
    if (!moveId) return
    setGenerating(true)
    try {
      const m = await api.manifest.generate(moveId)
      setManifest(m)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // Auto-generate on mount
  useEffect(() => {
    generate()
  }, [moveId])

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/moves/${moveId}`)}>
          <ArrowLeft size={14} /> Move Detail
        </Button>
        <ChevronRight size={14} style={{ color: 'var(--border)' }} />
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Manifest</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-semibold text-2xl" style={{ color: 'var(--navy)' }}>
            Custody Manifest
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            The legally admissible record of your move
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={generate}
          loading={generating}
        >
          <RefreshCw size={14} /> Regenerate
        </Button>
      </div>

      {generating && !manifest ? (
        <div className="flex flex-col items-center py-20 gap-4">
          <Spinner size={32} />
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
            Generating your manifest PDF…
          </p>
        </div>
      ) : manifest ? (
        <div className="space-y-6 animate-fade-up">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Total Items"
              value={manifest.total_items}
              color="var(--navy)"
            />
            <StatCard
              label="Loaded"
              value={manifest.loaded_items}
              sub={`of ${manifest.total_items}`}
              color="var(--teal)"
            />
            <StatCard
              label="Unloaded"
              value={manifest.unloaded_items}
              sub={`of ${manifest.total_items}`}
              color="var(--amber)"
            />
          </div>

          {/* Warnings */}
          {(manifest.high_risk_items > 0 || manifest.unbound_items > 0 || manifest.incomplete_photo_items > 0) && (
            <Card className="p-4 border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-body text-sm font-medium text-amber-800">
                    Manifest has warnings
                  </p>
                  {manifest.high_risk_items > 0 && (
                    <p className="font-body text-xs text-amber-700">
                      • {manifest.high_risk_items} item(s) tagged with paper (Tier 2) stickers
                    </p>
                  )}
                  {manifest.unbound_items > 0 && (
                    <p className="font-body text-xs text-amber-700">
                      • {manifest.unbound_items} item(s) have no QR code bound
                    </p>
                  )}
                  {manifest.incomplete_photo_items > 0 && (
                    <p className="font-body text-xs text-amber-700">
                      • {manifest.incomplete_photo_items} item(s) are missing open or sealed photos
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* All clear */}
          {manifest.high_risk_items === 0 &&
           manifest.unbound_items === 0 &&
           manifest.incomplete_photo_items === 0 && (
            <Card className="p-4 border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                <p className="font-body text-sm font-medium text-green-800">
                  All items are QR-bound, photographed, and accounted for.
                </p>
              </div>
            </Card>
          )}

          {/* Manifest PDF card */}
          <div
            className="rounded-xl p-6 grain relative overflow-hidden"
            style={{ background: 'var(--navy)' }}
          >
            {/* Decorative */}
            <div
              className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10"
              style={{ background: 'var(--teal)' }}
            />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={18} style={{ color: 'var(--amber)' }} />
                  <span className="font-display font-semibold text-white text-sm">
                    Move Manifest PDF
                  </span>
                </div>
                <p className="font-body text-white/50 text-xs">
                  Generated {formatDateTime(manifest.generated_at)}
                </p>
                <p className="font-body text-white/40 text-xs mt-1">
                  Link valid for 1 hour · Regenerate for a fresh link
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <a
                  href={manifest.manifest_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="primary" size="sm" className="whitespace-nowrap"
                    style={{ background: 'var(--amber)', color: 'white' } as any}
                  >
                    <ExternalLink size={13} /> View PDF
                  </Button>
                </a>
                <a
                  href={manifest.manifest_url}
                  download="zenmove-manifest.pdf"
                >
                  <Button variant="secondary" size="sm" className="whitespace-nowrap bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <Download size={13} /> Download
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Integrity note */}
          <p className="font-body text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            This manifest contains SHA-256 cryptographic hashes for every item photo.
            Any post-upload tampering will produce a hash mismatch during dispute review.
          </p>
        </div>
      ) : null}
    </div>
  )
}
