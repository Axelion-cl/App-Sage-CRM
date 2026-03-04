'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, XCircle, ArrowLeft, Mail, Info, Calendar, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { getSalesRepsMap } from './actions'
import EmailContentModal from '../[salesRepId]/EmailContentModal'
import LogoutButton from '../LogoutButton'

interface FeedbackEmail {
    id: string
    subject: string
    body: string | null
    is_oc: boolean
    classification_reason: string
    feedback_notes: string | null
    received_at: string
    salesrep: {
        name: string
    } | { name: string }[] | null
}

export default function RevisionFeedbackPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [emails, setEmails] = useState<FeedbackEmail[]>([])
    const [error, setError] = useState<string | null>(null)
    const [selectedEmail, setSelectedEmail] = useState<{ subject: string, body: string } | null>(null)
    const [isUndoing, setIsUndoing] = useState<string | null>(null)

    async function handleUndo(emailId: string, currentIsOC: boolean) {
        if (!confirm('¿Estás seguro de deshacer esta clasificación manual? El correo será removido de esta vista.')) return

        setIsUndoing(emailId)
        try {
            const res = await fetch('/api/feedback', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId, undo: true, revertToOC: !currentIsOC }),
            })

            if (!res.ok) throw new Error('Error al deshacer')

            // Quitar localmente sin recargar toda la página
            setEmails(prev => prev.filter(e => e.id !== emailId))
        } catch (err: any) {
            console.error('Error al deshacer:', err)
            alert('No se pudo deshacer la acción. Revisa la consola.')
        } finally {
            setIsUndoing(null)
        }
    }

    useEffect(() => {
        async function fetchFeedback() {
            try {
                // 1. Verificación de permisos
                const { data: { user } } = await supabase.auth.getUser()

                if (user?.email !== 'marketing@bienek.cl') {
                    setError('Acceso denegado. Esta página es exclusiva para administradores.')
                    setLoading(false)
                    return
                }

                // 2. Fetch de correos corregidos manualmente
                const { data, error: fetchError } = await supabase
                    .from('tracking_emails')
                    .select(`
                        id,
                        subject,
                        body,
                        is_oc,
                        classification_reason,
                        feedback_notes,
                        received_at,
                        sales_rep_id
                    `)
                    .eq('manual_override', true)
                    .order('received_at', { ascending: false })

                if (fetchError) throw fetchError

                // 3. Fetch mapeo de ForceManager
                const fmUsers = await getSalesRepsMap()
                const userMap = new Map((fmUsers || []).map((u: any) => [u.id.toString(), u.name]))

                // Combinar los datos
                const mappedData = data.map((email: any) => ({
                    ...email,
                    salesrep: {
                        name: email.sales_rep_id ? (userMap.get(email.sales_rep_id.toString()) || 'Vendedor Desconocido') : 'Vendedor Desconocido'
                    }
                }))

                setEmails(mappedData as FeedbackEmail[])
            } catch (err: any) {
                console.error(err)
                setError(`Hubo un error al cargar la información: ${err?.message || JSON.stringify(err)}`)
            } finally {
                setLoading(false)
            }
        }

        fetchFeedback()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin w-8 h-8 rounded-full border-2 border-accent border-t-transparent" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
                <div className="glass p-8 max-w-md text-center rounded-2xl">
                    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4 opacity-80" />
                    <h1 className="text-xl font-bold mb-2 text-white">Acceso Restringido</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Link href="/dashboard" className="text-accent hover:underline text-sm font-medium">
                        Volver al Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <header className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                <Link
                    href="/dashboard"
                    className="w-10 h-10 flex items-center justify-center glass rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Revisión de Feedback</h1>
                    <p className="text-slate-400 text-sm">
                        Correos cuyas clasificaciones fueron corregidas manualmente por los vendedores.
                        Usa esta información para ajustar y mejorar el prompt principal de la IA.
                    </p>
                </div>
                <div className="shrink-0 flex items-center justify-end">
                    <LogoutButton />
                </div>
            </header>

            <EmailContentModal
                isOpen={!!selectedEmail}
                onClose={() => setSelectedEmail(null)}
                subject={selectedEmail?.subject || ''}
                body={selectedEmail?.body || ''}
            />

            {emails.length === 0 ? (
                <div className="glass p-12 rounded-3xl text-center border-dashed border-2 border-slate-700/50">
                    <Info className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-slate-300">No hay feedback manual</h2>
                    <p className="text-slate-500 mt-1">Nadie ha usado la herramienta de corrección aún.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {emails.map((email) => {
                        const date = email.received_at
                            ? new Date(email.received_at).toLocaleString('es-CL', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })
                            : 'Sin fecha'

                        return (
                            <div key={email.id} className={`glass p-5 rounded-2xl flex flex-col md:flex-row gap-6 border border-slate-700/50 relative overflow-hidden transition-opacity ${isUndoing === email.id ? 'opacity-50 pointer-events-none' : ''}`}>

                                {/* Cinta decorativa izquierda */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${email.is_oc ? 'bg-accent' : 'bg-red-400'}`} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span className="truncate">
                                            {Array.isArray(email.salesrep) ? email.salesrep[0]?.name : email.salesrep?.name || 'Vendedor Desconocido'}
                                        </span>
                                        <span className="mx-1">•</span>
                                        <Calendar className="w-3 h-3" />
                                        <span>{date}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <h3 className="font-bold text-white text-lg truncate flex-1 md:flex-none md:whitespace-normal break-words whitespace-normal">"{email.subject}"</h3>
                                        <button
                                            onClick={() => setSelectedEmail({ subject: email.subject, body: email.body || '' })}
                                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-accent transition-colors shrink-0"
                                            title="Ver contenido del correo"
                                        >
                                            <Mail size={16} />
                                        </button>
                                    </div>

                                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                {email.is_oc ? (
                                                    <CheckCircle2 className="w-5 h-5 text-accent" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-300 mb-1">
                                                    Corregido a: <span className={email.is_oc ? 'text-accent font-bold' : 'text-red-400 font-bold'}>{email.is_oc ? 'SI ES ORDEN DE COMPRA' : 'NO ES ORDEN DE COMPRA'}</span>
                                                </p>
                                                <p className="text-sm text-slate-400 italic">
                                                    <span className="font-semibold text-slate-500 not-italic block uppercase text-[10px] tracking-wider mb-0.5">Nota / Razón del vendedor:</span>
                                                    {email.feedback_notes || 'Sin nota explicativa'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => handleUndo(email.id, email.is_oc)}
                                            disabled={isUndoing === email.id}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            {isUndoing === email.id ? 'Deshaciendo...' : 'Deshacer cambio manual'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
