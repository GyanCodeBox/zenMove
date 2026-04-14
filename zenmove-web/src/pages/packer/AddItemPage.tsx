import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { PageHeader, Input, Select, Button, Card } from '../../components/ui'
import { ArrowLeft } from 'lucide-react'

export default function AddItemPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ name: '', condition_pre: 'good', notes: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!id || !form.name) return
        setLoading(true)
        try {
            const item = await api.items.create(id, form)
            // Once created, jump directly to QR binding checklist
            navigate(`/packer/items/${item.id}`)
        } catch (err: any) {
            alert(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-xl mx-auto animate-fade-in">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 mb-6 font-body text-sm"
                style={{ color: 'var(--text-muted)' }}
            >
                <ArrowLeft size={16} /> Cancel
            </button>

            <PageHeader
                title="Add Delivery Item"
                subtitle="Create a new digital twin entry for this move"
            />

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Item Name / Type"
                        placeholder="e.g. Leather Sofa"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                        autoFocus
                    />
                    <Select
                        label="Initial Condition"
                        value={form.condition_pre}
                        onChange={e => setForm({ ...form, condition_pre: e.target.value })}
                    >
                        <option value="good">Good</option>
                        <option value="fragile">Fragile</option>
                        <option value="damaged">Damaged</option>
                    </Select>
                    <Input
                        label="Packer Notes"
                        placeholder="Scuff mark on left armrest..."
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                    />
                    <div className="pt-4">
                        <Button type="submit" loading={loading} className="w-full">
                            Save & Bind QR
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
