import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * PATCH /api/feedback
 * Permite al usuario marcar manualmente un correo como OC o No OC y agregar notas de revisión.
 * Body: { emailId: string (UUID), isOC: boolean, notes: string }
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { emailId, isOC, notes, undo } = body

        if (!emailId) {
            return NextResponse.json({ error: 'Se requiere emailId (UUID)' }, { status: 400 })
        }

        // --- MODO UNDO ---
        if (undo) {
            const revertToOC = body.revertToOC
            console.log(`[Feedback] Eliminando corrección manual para email ${emailId}`)
            const { data, error } = await supabase
                .from('tracking_emails')
                .update({
                    manual_override: false,
                    feedback_notes: null,
                    ...(typeof revertToOC === 'boolean' && {
                        is_oc: revertToOC,
                        classification_reason: 'Estado restaurado tras deshacer cambio manual.'
                    })
                })
                .eq('id', emailId)
                .select()
                .single()

            if (error) throw new Error(error.message)

            return NextResponse.json({ message: 'Corrección manual eliminada.', email: data })
        }

        // --- MODO CORRECCIÓN MANUAL ---
        if (typeof isOC !== 'boolean') {
            return NextResponse.json({ error: 'Se requiere isOC (boolean) para clasificar.' }, { status: 400 })
        }

        console.log(`[Feedback] Email ${emailId} marcado como ${isOC ? 'OC' : 'No OC'} con nota: ${notes}`)

        const { data, error } = await supabase
            .from('tracking_emails')
            .update({
                is_oc: isOC,
                classification_reason: `Marcado manualmente por el usuario como ${isOC ? 'Orden de Compra' : 'No es OC'}`,
                manual_override: true,
                confidence: 'alta',
                feedback_notes: notes || null
            })
            .eq('id', emailId)
            .select()
            .single()

        if (error) {
            console.error('[Feedback] Error DB:', error.message)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: `Correo marcado exitosamente como ${isOC ? 'OC' : 'No OC'}`,
            email: data,
        })
    } catch (error: any) {
        console.error('[Feedback] Error general:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
