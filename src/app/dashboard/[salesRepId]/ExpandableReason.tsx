'use client'

import { useState } from 'react'

export default function ExpandableReason({ reason }: { reason: string }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <p
            onClick={() => setExpanded(!expanded)}
            className={`text-xs text-slate-500 mt-1 italic cursor-pointer hover:text-slate-400 transition-colors ${expanded ? '' : 'line-clamp-1'}`}
            title={expanded ? 'Clic para colapsar' : 'Clic para ver completo'}
        >
            &ldquo;{reason || 'Sin motivo registrado'}&rdquo;
        </p>
    )
}
