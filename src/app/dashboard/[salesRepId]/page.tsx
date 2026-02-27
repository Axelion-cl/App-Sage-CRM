import { supabase } from '@/lib/supabase'
import { fetchFMUsers } from '@/lib/forcemanager'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SyncButton from './SyncButton'
import EmailListClient from './EmailListClient'

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

            <EmailListClient initialEmails={emails} />

            {emails.length === 0 && (
                <div className="glass p-12 rounded-2xl text-center text-slate-500 italic mt-3">
                    No hay correos registrados para {userName} en este día.
                    <div className="mt-4">
                        <SyncButton salesRepId={salesRepId} date={selectedDate} />
                    </div>
                </div>
            )}
        </div>
    )
}
