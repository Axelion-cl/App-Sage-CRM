import { getDashboardData } from '@/lib/dashboard-service'
import { User, Mail, Bell, ShieldCheck } from 'lucide-react'

export default async function DashboardPage() {
    const reps = await getDashboardData()
    const today = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
                <div className="animate-reveal">
                    <h1 className="text-4xl font-bold tracking-tight mb-1">Tracker Órdenes de Compra</h1>
                    <p className="text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        Monitoreo en vivo — {today}
                    </p>
                </div>
                <div className="flex items-center gap-3 glass px-4 py-2 rounded-full text-sm font-medium border-accent/20">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span>Claudia Caamaño</span>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reps.map((rep, index) => (
                    <div
                        key={rep.id}
                        className="glass p-6 rounded-3xl group hover:border-accent/40 transition-all duration-300 animate-reveal"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-primary p-3 rounded-2xl group-hover:scale-110 transition-transform">
                                <User className="w-6 h-6 text-accent" />
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${rep.ocCount > 0 ? 'bg-accent/10 text-accent' : 'bg-slate-800 text-slate-500'}`}>
                                {rep.ocCount > 0 ? 'CON ÓRDENES' : 'SIN ÓRDENES'}
                            </div>
                        </div>

                        <h2 className="text-xl font-bold mb-1 group-hover:text-accent transition-colors">{rep.name}</h2>
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                            <Mail className="w-4 h-4" />
                            <span>{rep.ocCount} detectadas hoy</span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Último arribo</span>
                            <span className="text-sm font-mono text-slate-300">
                                {rep.lastOCAt ? new Date(rep.lastOCAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {reps.length === 0 && (
                <div className="text-center py-20 opacity-50 italic">
                    No se han detectado órdenes aún para este período.
                </div>
            )}
        </div>
    )
}
