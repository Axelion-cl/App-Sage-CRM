'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface SyncButtonProps {
    salesRepId: string
    date: string
}

export default function SyncButton({ salesRepId, date }: SyncButtonProps) {
    const router = useRouter()
    const [syncing, setSyncing] = useState(false)
    const [result, setResult] = useState<{ processed: number; ocs: number; skipped: number } | null>(null)

    async function handleSync() {
        setSyncing(true)
        setResult(null)

        try {
            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salesRepId: Number(salesRepId), date }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error en sincronización')
            }

            setResult({ processed: data.processed, ocs: data.ocs, skipped: data.skipped })
            // Recargar datos de la página
            router.refresh()
        } catch (err: any) {
            console.error('Error en sync:', err)
            setResult({ processed: -1, ocs: 0, skipped: 0 })
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Correos'}
            </button>

            {result && result.processed >= 0 && (
                <span className="text-xs text-slate-400 animate-reveal">
                    ✅ {result.processed} clasificados ({result.ocs} OC) · {result.skipped} sin cambios
                </span>
            )}
            {result && result.processed < 0 && (
                <span className="text-xs text-red-400 animate-reveal">
                    ❌ Error en sincronización
                </span>
            )}
        </div>
    )
}
