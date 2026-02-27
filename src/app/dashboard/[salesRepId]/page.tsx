import { supabase } from '@/lib/supabase'
import { fetchFMUsers } from '@/lib/forcemanager'
import { ChevronLeft, Clock, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SyncButton from './SyncButton'
import FeedbackButtons from './FeedbackButtons'
import ExpandableReason from './ExpandableReason'

export const dynamic = 'force-dynamic'

export default async function SalesRepDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ salesRepId: string }>
    searchParams: Promise<{ date?: string }>
}) {
    const { salesRepId } = await params
    const { date } = await searchParams
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    const selectedDate = date || todayStr

    // Rango del día seleccionado
    const nextDay = new Date(selectedDate + 'T12:00:00')
    nextDay.setDate(nextDay.getDate() + 1)
    const nextDayStr = nextDay.toLocaleDateString('en-CA')

    // Obtener TODOS los correos del vendedor para ese día (OC y no OC)
    const { data: emails } = await supabase
        .from('tracking_emails')
        .select('*')
        .eq('sales_rep_id', salesRepId)
        .gte('received_at', `${selectedDate}T00:00:00Z`)
        .lt('received_at', `${nextDayStr}T00:00:00Z`)
        .order('received_at', { ascending: false })

    // Obtener nombre del vendedor
    const usersData = await fetchFMUsers()
    const users = Array.isArray(usersData) ? usersData : (usersData?.data || [])
    const user = users.find((u: any) => u.id === Number(salesRepId))
    const userName = user ? `${user.name || ''} ${user.surname || ''}`.trim() : `Vendedor ID: ${salesRepId}`

    if (!emails) return notFound()

    const ocCount = emails.filter(e => e.is_oc).length
    const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <Link
                href={`/dashboard${date ? `?date=${date}` : ''}`}
                className="inline-flex items-center gap-2 text-slate-400 hover:text-accent mb-8 transition-colors group"
            >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>Volver al Dashboard</span>
            </Link>

            <header className="mb-10 animate-reveal">
                <h1 className="text-4xl font-bold tracking-tight mb-2">{userName}</h1>
                <p className="text-slate-400 capitalize">{displayDate}</p>
                <div className="flex flex-wrap items-center gap-4 mt-4">
                    <div className="glass px-4 py-2 rounded-xl text-sm">
                        <span className="text-slate-500">Correos totales: </span>
                        <span className="font-bold text-slate-200">{emails.length}</span>
                    </div>
                    <div className={`glass px-4 py-2 rounded-xl text-sm ${ocCount > 0 ? 'border-accent/30' : ''}`}>
                        <span className="text-slate-500">Órdenes detectadas: </span>
                        <span className={`font-bold ${ocCount > 0 ? 'text-accent' : 'text-slate-200'}`}>{ocCount}</span>
                    </div>
                </div>
                <div className="mt-5">
                    <SyncButton salesRepId={salesRepId} date={selectedDate} />
                </div>
            </header>

            <div className="space-y-3">
                {emails.map((email, index) => {
                    const isOC = email.is_oc
                    const time = email.received_at
                        ? new Date(email.received_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                        : '--:--'

                    return (
                        <div
                            key={email.id}
                            className={`glass p-5 rounded-2xl animate-reveal flex flex-col md:flex-row md:items-center gap-4 ${isOC ? 'border-accent/30' : ''}`}
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            {/* Hora */}
                            <div className="flex items-center gap-2 text-slate-500 md:w-20 shrink-0">
                                <Clock className="w-4 h-4" />
                                <span className="font-mono text-sm">{time}</span>
                            </div>

                            {/* Badge */}
                            <div className="md:w-28 shrink-0">
                                {isOC ? (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-xs font-bold">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>OC</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/50 text-slate-500 border border-slate-700/50 text-xs font-medium">
                                        <XCircle className="w-3.5 h-3.5 opacity-50" />
                                        <span>No es OC</span>
                                    </div>
                                )}
                            </div>

                            {/* Contenido */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold truncate ${isOC ? 'text-slate-100' : 'text-slate-300'}`}>
                                    {email.subject}
                                </h3>
                                <ExpandableReason reason={email.classification_reason} />
                            </div>

                            {/* Confianza */}
                            {email.confidence && (
                                <div className="shrink-0">
                                    <span className={`text-xs px-2 py-1 rounded-full ${email.confidence === 'alta' ? 'bg-emerald-500/10 text-emerald-400' :
                                        email.confidence === 'media' ? 'bg-amber-500/10 text-amber-400' :
                                            'bg-red-500/10 text-red-400'
                                        }`}>
                                        {email.confidence}
                                    </span>
                                </div>
                            )}

                            {/* Feedback Buttons */}
                            <div className="shrink-0">
                                <FeedbackButtons
                                    emailId={email.id}
                                    currentIsOC={isOC}
                                    isManualOverride={email.manual_override || false}
                                />
                            </div>
                        </div>
                    )
                })}

                {emails.length === 0 && (
                    <div className="glass p-12 rounded-2xl text-center text-slate-500 italic">
                        No hay correos registrados para {userName} en este día.
                        <div className="mt-4">
                            <SyncButton salesRepId={salesRepId} date={selectedDate} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
