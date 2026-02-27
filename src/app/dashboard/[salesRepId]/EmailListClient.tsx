'use client'

import { useState } from 'react'
import { Clock, CheckCircle2, XCircle, Mail } from 'lucide-react'
import FeedbackButtons from './FeedbackButtons'
import ExpandableReason from './ExpandableReason'
import EmailContentModal from './EmailContentModal'

interface Email {
    id: string
    subject: string
    body: string | null
    is_oc: boolean
    classification_reason: string
    confidence: string | null
    manual_override: boolean
    received_at: string
    feedback_notes: string | null
}

interface EmailListClientProps {
    initialEmails: Email[]
}

export default function EmailListClient({ initialEmails }: EmailListClientProps) {
    const [selectedEmail, setSelectedEmail] = useState<{ subject: string, body: string } | null>(null)
    const [activePopupEmailId, setActivePopupEmailId] = useState<string | null>(null)

    return (
        <div className="space-y-3">
            <EmailContentModal
                isOpen={!!selectedEmail}
                onClose={() => setSelectedEmail(null)}
                subject={selectedEmail?.subject || ''}
                body={selectedEmail?.body || ''}
            />

            {initialEmails.map((email, index) => {
                const isOC = email.is_oc
                const time = email.received_at
                    ? new Date(email.received_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'

                return (
                    <div
                        key={email.id}
                        className={`glass p-5 rounded-2xl animate-reveal flex flex-col md:flex-row md:items-center gap-4 group/row relative ${isOC ? 'border-accent/30' : ''} ${activePopupEmailId === email.id ? 'z-20' : 'z-0'}`}
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
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-semibold truncate ${isOC ? 'text-slate-100' : 'text-slate-300'}`}>
                                    {email.subject}
                                </h3>
                                <button
                                    onClick={() => setSelectedEmail({ subject: email.subject, body: email.body || '' })}
                                    className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-accent"
                                    title="Ver contenido del correo"
                                >
                                    <Mail size={14} />
                                </button>
                            </div>
                            <ExpandableReason reason={email.classification_reason} />
                        </div>

                        {/* Confianza */}
                        {email.confidence && (
                            <div className="shrink-0 flex flex-col items-end gap-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${email.confidence === 'alta' ? 'bg-emerald-500/10 text-emerald-400' :
                                    email.confidence === 'media' ? 'bg-amber-500/10 text-amber-400' :
                                        'bg-red-500/10 text-red-400'
                                    }`}>
                                    {email.confidence}
                                </span>
                                {email.feedback_notes && (
                                    <span className="text-[10px] text-accent font-medium italic">Corrección manual</span>
                                )}
                            </div>
                        )}

                        {/* Feedback Buttons */}
                        <div className="shrink-0 relative">
                            <FeedbackButtons
                                emailId={email.id}
                                currentIsOC={isOC}
                                isManualOverride={email.manual_override || false}
                                onPopupToggle={(isOpen) => setActivePopupEmailId(isOpen ? email.id : null)}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
