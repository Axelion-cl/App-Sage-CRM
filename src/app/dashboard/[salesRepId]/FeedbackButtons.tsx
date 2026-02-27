'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, UserCheck } from 'lucide-react'

interface FeedbackButtonsProps {
    emailId: string
    currentIsOC: boolean
    isManualOverride: boolean
}

export default function FeedbackButtons({ emailId, currentIsOC, isManualOverride }: FeedbackButtonsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleFeedback(isOC: boolean) {
        if (loading) return
        setLoading(true)

        try {
            const res = await fetch('/api/feedback', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId, isOC }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Error')
            }

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
    )
}
