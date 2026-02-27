import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * PATCH /api/feedback
 * Permite al usuario marcar manualmente un correo como OC o No OC.
 * Body: { emailId: string (UUID), isOC: boolean }
 */
export async function PATCH(request: NextRequest) {
    try {
        const { emailId, isOC, notes } = await request.json()

        if (!emailId || typeof isOC !== 'boolean') {
            return NextResponse.json(
                { error: 'Se requiere emailId (UUID) e isOC (boolean)' },
                { status: 400 }
            )
        }

        console.log(`📝 [Feedback] Email ${emailId} marcado como ${isOC ? 'OC' : 'No OC'}`)

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
            console.error('❌ [Feedback] Error:', error.message)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: `Correo marcado como ${isOC ? 'OC' : 'No OC'}`,
            email: data,
        })
    } catch (error: any) {
        console.error('❌ [Feedback] Error general:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno' },
            { status: 500 }
        )
    }
}
