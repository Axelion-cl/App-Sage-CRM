import { supabase } from '@/lib/supabase'
import { ChevronLeft, Mail, Clock, Download, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function SalesRepDetailPage({
    params,
}: {
    params: Promise<{ salesRepId: string }>
}) {
    const { salesRepId } = await params
    const today = new Date().toISOString().split('T')[0]

    const { data: ocs } = await supabase
        .from('tracking_emails')
        .select('*')
        .eq('sales_rep_id', salesRepId)
        .eq('is_oc', true)
        .gte('received_at', `${today}T00:00:00Z`)
        .order('received_at', { ascending: false })

    if (!ocs) return notFound()

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-accent mb-8 transition-colors group"
            >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>Volver al Dashboard</span>
            </Link>

            <header className="mb-12 animate-reveal">
                <h1 className="text-4xl font-bold tracking-tight mb-2">Detalle de Órdenes</h1>
                <p className="text-slate-400">Órdenes detectadas hoy para el ID de vendedor: {salesRepId}</p>
            </header>

            <div className="space-y-4">
                {ocs.map((oc, index) => (
                    <div
                        key={oc.id}
                        className="glass p-6 rounded-2xl animate-reveal flex flex-col md:flex-row md:items-center justify-between gap-6"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="bg-accent/10 text-accent text-xs font-bold px-2 py-1 rounded-md">DETECTADA POR AI</span>
                                <span className="text-slate-500 text-xs flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(oc.received_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold mb-1">{oc.subject}</h3>
                            <p className="text-sm text-slate-400 italic line-clamp-1">"{oc.classification_reason}"</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                                <Download className="w-4 h-4" />
                                Adjuntos
                            </button>
                            <button className="flex items-center gap-2 bg-primary hover:bg-slate-900 border border-slate-800 text-accent px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                                Ver en Sage
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {ocs.length === 0 && (
                    <div className="glass p-12 rounded-2xl text-center text-slate-500 italic">
                        No hay órdenes registradas para este vendedor hoy.
                    </div>
                )}
            </div>
        </div>
    )
}
