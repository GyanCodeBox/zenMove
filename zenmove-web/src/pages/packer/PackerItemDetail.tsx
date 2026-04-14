import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type Item } from '../../services/api'
import { PageHeader, Input, Button, Card, Spinner } from '../../components/ui'
import { ArrowLeft, QrCode, Camera, CheckCircle, PackageCheck } from 'lucide-react'

async function computeHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PackerItemDetail() {
    const { itemId } = useParams()
    const navigate = useNavigate()
    const [item, setItem] = useState<Item | null>(null)
    const [loading, setLoading] = useState(true)

    // States
    const [qrInput, setQrInput] = useState('')
    const [binding, setBinding] = useState(false)
    const [uploadingOpen, setUploadingOpen] = useState(false)
    const [uploadingSealed, setUploadingSealed] = useState(false)

    // File Inputs
    const openInputRef = useRef<HTMLInputElement>(null)
    const sealedInputRef = useRef<HTMLInputElement>(null)

    const loadItem = async () => {
        if (!itemId) return
        try {
            const res = await api.items.get(itemId)
            setItem(res)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadItem() }, [itemId])

    const handleBind = async () => {
        if (!item || !qrInput) return
        setBinding(true)
        try {
            const tagTier = qrInput.includes('-T-') ? 'PAPER' : 'PVC'
            await api.items.bindQr(item.id, { qr_code: qrInput.toUpperCase(), tag_tier: tagTier })
            await loadItem()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setBinding(false)
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'open' | 'sealed') => {
        const file = e.target.files?.[0]
        if (!file || !item) return

        type === 'open' ? setUploadingOpen(true) : setUploadingSealed(true)
        try {
            const hash = await computeHash(file)
            await api.items.uploadPhoto(item.id, type, file, hash)
            await loadItem()
        } catch (err: any) {
            alert("Verification Failed: " + err.message)
        } finally {
            type === 'open' ? setUploadingOpen(false) : setUploadingSealed(false)
        }
    }

    if (loading) return <div className="p-20 flex justify-center"><Spinner size={32} /></div>
    if (!item) return <div className="p-8">Item not found</div>

    return (
        <div className="p-8 animate-fade-in max-w-xl mx-auto">
            <button
                onClick={() => navigate(`/packer/moves/${item.move_id}`)}
                className="flex items-center gap-2 mb-6 font-body text-sm text-gray-500"
            >
                <ArrowLeft size={16} /> Back to Move Items
            </button>

            <PageHeader
                title={item.name}
                subtitle={`Pre-condition: ${item.condition_pre} | Status: ${item.is_photo_complete ? 'Ready' : 'Pending'}`}
            />

            <div className="space-y-6 stagger">
                {/* Step 1: Subscribe QR */}
                <Card className={`p-5 ${item.is_qr_bound ? 'opacity-60' : 'border-teal-500 ring-1 ring-teal-500'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-display font-medium text-lg flex items-center gap-2">
                            1. Bind QR Tag <QrCode size={18} />
                        </h3>
                        {item.is_qr_bound && <CheckCircle size={20} className="text-teal-500" />}
                    </div>
                    {item.is_qr_bound ? (
                        <p className="text-sm font-mono bg-gray-100 p-2 rounded text-center">{item.qr_code}</p>
                    ) : (
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Input
                                    placeholder="Scan or type ZM-2026-CITY-0001"
                                    value={qrInput}
                                    onChange={e => setQrInput(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleBind} loading={binding}>Bind</Button>
                        </div>
                    )}
                </Card>

                {/* Step 2: Open Photo */}
                <Card className={`p-5 ${!item.is_qr_bound ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-display font-medium text-lg flex items-center gap-2">
                            2. Capture Integrity Photo <Camera size={18} />
                        </h3>
                        {item.open_photo_url && <CheckCircle size={20} className="text-teal-500" />}
                    </div>
                    {item.open_photo_url ? (
                        <img src={item.open_photo_url} className="w-full h-32 object-cover rounded-lg" alt="Open box" />
                    ) : (
                        <div className="flex flex-col items-center">
                            <input type="file" ref={openInputRef} accept="image/*" capture="environment" className="hidden" onChange={e => handleUpload(e, 'open')} />
                            <Button variant="secondary" onClick={() => openInputRef.current?.click()} loading={uploadingOpen} className="w-full py-6 outline-dashed outline-2 outline-gray-300">
                                <Camera size={20} /> Open Mobile Camera
                            </Button>
                        </div>
                    )}
                </Card>

                {/* Step 3: Sealed Photo */}
                <Card className={`p-5 ${!item.open_photo_url ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-display font-medium text-lg flex items-center gap-2">
                            3. Capture Sealed Photo <PackageCheck size={18} />
                        </h3>
                        {item.sealed_photo_url && <CheckCircle size={20} className="text-teal-500" />}
                    </div>
                    {item.sealed_photo_url ? (
                        <img src={item.sealed_photo_url} className="w-full h-32 object-cover rounded-lg" alt="Sealed box" />
                    ) : (
                        <div className="flex flex-col items-center">
                            <input type="file" ref={sealedInputRef} accept="image/*" capture="environment" className="hidden" onChange={e => handleUpload(e, 'sealed')} />
                            <Button onClick={() => sealedInputRef.current?.click()} loading={uploadingSealed} className="w-full">
                                Final Seal & Lock Twin
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
