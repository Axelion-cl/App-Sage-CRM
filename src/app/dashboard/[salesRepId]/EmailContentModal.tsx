'use client'

import { X } from 'lucide-react'

interface EmailContentModalProps {
    isOpen: boolean
    onClose: () => void
    subject: string
    body: string
}

export default function EmailContentModal({ isOpen, onClose, subject, body }: EmailContentModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="glass w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl overflow-hidden border-slate-700/50 shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                    <div>
                        <span className="text-xs font-bold text-accent uppercase tracking-widest mb-1 block">Contenido del Correo</span>
                        <h2 className="text-xl font-bold text-white line-clamp-2">{subject}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 text-slate-300 leading-relaxed custom-scrollbar">
                    {body ? (
                        <div className="whitespace-pre-wrap break-words text-sm">
                            {body}
                        </div>
                    ) : (
                        <div className="italic text-slate-500 text-center py-10">
                            No hay contenido disponible para este correo.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
