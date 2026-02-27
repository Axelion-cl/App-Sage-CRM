'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, UserCheck } from 'lucide-react'

interface FeedbackButtonsProps {
    emailId: string
    currentIsOC: boolean
    isManualOverride: boolean
    onPopupToggle?: (isOpen: boolean) => void
}

export default function FeedbackButtons({ emailId, currentIsOC, isManualOverride, onPopupToggle }: FeedbackButtonsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showNoteInput, setShowNoteInput] = useState<{ isOC: boolean } | null>(null)
    const [note, setNote] = useState('')

    async function handleFeedback(isOC: boolean) {
        if (loading) return

        // Si el usuario cambia el estado, pedir nota
        if (!showNoteInput) {
            setShowNoteInput({ isOC })
            onPopupToggle?.(true)
            return
        }

        setLoading(true)

        try {
            const res = await fetch('/api/feedback', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emailId,
                    isOC: showNoteInput.isOC,
                    notes: note
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Error')
            }

            setShowNoteInput(null)
            setNote('')
            onPopupToggle?.(false)
            router.refresh()
        } catch (err) {
            console.error('Error en feedback:', err)
        } finally {
            setLoading(false)
        }
    }

    // Si ya fue marcado manualmente, mostrar indicador
    if (isManualOverride) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Manual</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
                <button
                    onClick={() => handleFeedback(true)}
                    disabled={loading}
                    title="Marcar como OC"
                    className={`p-1.5 rounded-lg transition-all duration-200 ${currentIsOC
                        ? 'bg-accent/20 text-accent'
                        : 'text-slate-600 hover:bg-emerald-500/10 hover:text-emerald-400'
                        } disabled:opacity-50`}
                >
                    <CheckCircle2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleFeedback(false)}
                    disabled={loading}
                    title="Marcar como No OC"
                    className={`p-1.5 rounded-lg transition-all duration-200 ${!currentIsOC
                        ? 'bg-red-500/10 text-red-400'
                        : 'text-slate-600 hover:bg-red-500/10 hover:text-red-400'
                        } disabled:opacity-50`}
                >
                    <XCircle className="w-4 h-4" />
                </button>
            </div>

            {showNoteInput && (
                <div className="absolute right-0 top-full mt-2 z-50 w-80 glass p-4 rounded-2xl border border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        ¿Por qué cambias el estado?
                    </p>
                    <textarea
                        autoFocus
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ej: El archivo adjunto es un PDF de pedido..."
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-accent resize-none min-h-[60px] mb-2"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => { setShowNoteInput(null); setNote(''); onPopupToggle?.(false); }}
                            className="px-2 py-1 text-[10px] text-slate-400 hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => handleFeedback(showNoteInput.isOC)}
                            disabled={loading || !note.trim()}
                            className="bg-accent text-background px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-accent/90 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
