import { supabase } from '@/lib/supabase'
import { fetchFMUsers } from '@/lib/forcemanager'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EmailLogsPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>
}) {
    const { date } = await searchParams
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    const selectedDate = date || todayStr

    // Rango del día seleccionado
    const nextDay = new Date(selectedDate + 'T12:00:00')
    nextDay.setDate(nextDay.getDate() + 1)
    const nextDayStr = nextDay.toLocaleDateString('en-CA')

    // Fetch correos del día seleccionado
    const { data: emails, error } = await supabase
        .from('tracking_emails')
        .select('*')
        .gte('received_at', `${selectedDate}T00:00:00Z`)
        .lt('received_at', `${nextDayStr}T00:00:00Z`)
        .order('received_at', { ascending: false })

    // Fetch users para mapear IDs a nombres
    const usersData = await fetchFMUsers()
    const users = Array.isArray(usersData) ? usersData : (usersData?.data || [])

    const userMap = new Map<string | number, string>(users.map((u: any) => [
        u.id,
        `${u.name || ''} ${u.surname || ''}`.trim() || `ID: ${u.id}`
    ]))

    if (error) {
        console.error("Error fetching email logs:", error)
    }

    const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="animate-reveal">
                    <div className="flex items-center gap-3 mb-2">
                        <Link
                            href={`/dashboard${date ? `?date=${date}` : ''}`}
                            className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Log de Clasificación (IA)</h1>
                    </div>
                    <p className="text-slate-400 ml-10 capitalize">
                        {displayDate} — {emails?.length || 0} correos registrados
                    </p>
                </div>
            </header>

            {/* Table */}
            <div className="glass rounded-3xl overflow-hidden border border-slate-800/50 animate-reveal" style={{ animationDelay: '100ms' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
                        <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Hora</th>
                                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Decisión</th>
                                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Confianza</th>
                                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Vendedor</th>
                                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Asunto</th>
                                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs w-1/3">Motivo (Gemini)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {!emails || emails.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                        No hay correos registrados para este día.
                                    </td>
                                </tr>
                            ) : (
                                emails.map((email: any) => {
                                    const isOC = email.is_oc
                                    const date = email.received_at ? new Date(email.received_at) : null

                                    return (
                                        <tr key={email.id} className="hover:bg-slate-800/20 transition-colors">
                                            {/* Hora */}
                                            <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                                                {date ? date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '--'}
                                            </td>

                                            {/* Decisión */}
                                            <td className="px-6 py-4">
                                                {isOC ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>Es OC</span>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 text-slate-400 border border-slate-700/50 text-xs font-medium">
                                                        <XCircle className="w-3.5 h-3.5 opacity-50" />
                                                        <span>No es OC</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Confianza */}
                                            <td className="px-6 py-4">
                                                <span className={`text-xs px-2 py-1 rounded-full ${email.confidence === 'alta' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    email.confidence === 'media' ? 'bg-amber-500/10 text-amber-400' :
                                                        email.confidence === 'baja' ? 'bg-red-500/10 text-red-400' :
                                                            'bg-slate-800/50 text-slate-500'
                                                    }`}>
                                                    {email.confidence || '—'}
                                                </span>
                                            </td>

                                            {/* Vendedor */}
                                            <td className="px-6 py-4 text-slate-300">
                                                {userMap.get(email.sales_rep_id) || 'Desconocido'}
                                            </td>

                                            {/* Asunto */}
                                            <td className="px-6 py-4 text-slate-200 font-medium truncate max-w-[200px]" title={email.subject}>
                                                {email.subject}
                                            </td>

                                            {/* Motivo */}
                                            <td className="px-6 py-4 text-slate-400 text-xs leading-relaxed max-w-sm">
                                                {email.classification_reason || 'Sin motivo registrado'}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
