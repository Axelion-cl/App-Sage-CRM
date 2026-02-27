'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface GlobalSyncButtonProps {
    date: string
}

interface SyncProgress {
    status: 'idle' | 'syncing' | 'done' | 'error'
    message: string
}

export default function GlobalSyncButton({ date }: GlobalSyncButtonProps) {
    const router = useRouter()
    const [progress, setProgress] = useState<SyncProgress>({ status: 'idle', message: '' })

    async function handleSyncAll() {
        setProgress({ status: 'syncing', message: 'Sincronizando todos los vendedores...' })

        try {
            const res = await fetch('/api/sync-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error en sincronización')
            }

            setProgress({
                status: 'done',
                message: `✅ ${data.processed} clasificados · ${data.ocs} OC detectadas · ${data.skipped} ya procesados${data.errors > 0 ? ` · ${data.errors} errores` : ''}`,
            })

            router.refresh()
        } catch (err: any) {
            setProgress({
                status: 'error',
                message: `❌ ${err.message || 'Error en sincronización'}`,
            })
        }
    }

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
                onClick={handleSyncAll}
                disabled={progress.status === 'syncing'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <RefreshCw className={`w-4 h-4 ${progress.status === 'syncing' ? 'animate-spin' : ''}`} />
                {progress.status === 'syncing' ? 'Sincronizando...' : 'Sincronizar Todos'}
            </button>

            {progress.message && (
                <span className={`text-xs animate-reveal ${progress.status === 'done' ? 'text-slate-400' :
                        progress.status === 'error' ? 'text-red-400' :
                            'text-slate-500'
                    }`}>
                    {progress.message}
                </span>
            )}
        </div>
    )
}
