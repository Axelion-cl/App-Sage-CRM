import { getDashboardData } from '@/lib/dashboard-service'
import { User, Mail } from 'lucide-react'
import Link from 'next/link'
import DateSelector from './DateSelector'
import GlobalSyncButton from './GlobalSyncButton'
import AdminLink from './AdminLink'
import LogoutButton from './LogoutButton'

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>
}) {
    const { date } = await searchParams
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    const selectedDate = date || todayStr
    const isToday = selectedDate === todayStr

    const reps = await getDashboardData(selectedDate)

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
                <div className="animate-reveal">
                    <h1 className="text-4xl font-bold tracking-tight mb-3">Tracker Órdenes de Compra</h1>
                    <DateSelector />
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                        <LogoutButton />
                        <AdminLink />
                        <Link
                            href={`/dashboard/logs${date ? `?date=${date}` : ''}`}
                            className="glass px-4 py-2 rounded-full text-sm font-medium border-slate-800 hover:border-slate-600 transition-colors flex items-center gap-2 text-slate-300 hover:text-white"
                        >
                            Ver Log de Correos
                        </Link>
                    </div>
                    <GlobalSyncButton date={selectedDate} />
                </div>
            </header>

            {/* Indicador de estado */}
            {isToday && (
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-6 animate-reveal">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Actualización manual — presiona "Sincronizar todos" para analizar nuevos correos
                </div>
            )}
            {!isToday && (
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 animate-reveal">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    Consultando datos históricos del {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reps.map((rep, index) => (
                    <Link
                        key={rep.id}
                        href={`/dashboard/${rep.id}?date=${selectedDate}`}
                        className="glass p-6 rounded-3xl group hover:border-accent/40 transition-all duration-300 animate-reveal cursor-pointer"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-primary p-3 rounded-2xl group-hover:scale-110 transition-transform">
                                <User className="w-6 h-6 text-accent" />
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${rep.ocCount > 0 ? 'bg-accent/10 text-accent' : 'bg-slate-800 text-slate-500'}`}>
                                {rep.ocCount > 0 ? `${rep.ocCount} ORDEN${rep.ocCount > 1 ? 'ES' : ''}` : 'SIN ÓRDENES'}
                            </div>
                        </div>

                        <h2 className="text-xl font-bold mb-1 group-hover:text-accent transition-colors">{rep.name}</h2>
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                            <Mail className="w-4 h-4" />
                            <span>{rep.totalEmails} correos · {rep.ocCount} OC detectadas</span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Última OC</span>
                            <span className="text-sm font-mono text-slate-300">
                                {rep.lastOCAt ? new Date(rep.lastOCAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {reps.length === 0 && (
                <div className="text-center py-20 opacity-50 italic">
                    No se encontraron vendedores con correos para este día.
                </div>
            )}
        </div>
    )
}
