import { NextRequest, NextResponse } from 'next/server'
import { fetchFMEmails, fetchFMUsers } from '@/lib/forcemanager'
import { classifyEmail } from '@/lib/classifier'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/sync
 * Sincroniza y re-clasifica correos de un vendedor para un día específico.
 * Body: { salesRepId: number, date: string (YYYY-MM-DD) }
 */
export async function POST(request: NextRequest) {
    try {
        const { salesRepId, date } = await request.json()

        if (!salesRepId || !date) {
            return NextResponse.json(
                { error: 'Se requiere salesRepId y date' },
                { status: 400 }
            )
        }

        console.log(`🔄 [Sync] Iniciando sync para vendedor ${salesRepId}, fecha: ${date}`)

        // 1. Obtener correos del día desde ForceManager
        const allEmails = await fetchFMEmails(date)

        // Filtrar por vendedor
        const repEmails = allEmails.filter(
            (e: any) => e.salesRepIdUpdated === Number(salesRepId)
        )

        console.log(`📧 [Sync] ${repEmails.length} correos del vendedor ${salesRepId} el ${date}`)

        if (repEmails.length === 0) {
            return NextResponse.json({
                message: 'No se encontraron correos para este vendedor en esta fecha',
                processed: 0,
                ocs: 0
            })
        }

        // 2. Verificar cuáles ya están en Supabase
        const fmIds = repEmails.map((e: any) => e.id)
        const { data: existing } = await supabase
            .from('tracking_emails')
            .select('fm_email_id, classification_reason, manual_override')
            .in('fm_email_id', fmIds)

        const existingMap = new Map(
            existing?.map(e => [e.fm_email_id, e]) || []
        )

        // 3. Identificar correos que necesitan (re)clasificación
        const emailsToClassify = repEmails.filter((email: any) => {
            const cached = existingMap.get(email.id)
            if (!cached) return true // Nuevo, nunca clasificado
            if (cached.manual_override) return false // No sobreescribir feedback manual
            if (cached.classification_reason === 'Error en clasificación') return true // Re-clasificar errores
            return false // Ya clasificado correctamente
        })

        console.log(`🆕 [Sync] ${emailsToClassify.length} correos por (re)clasificar`)

        // 4. Obtener ejemplos de feedback para few-shot learning
        const { data: feedbackExamples } = await supabase
            .from('tracking_emails')
            .select('subject, is_oc, classification_reason, feedback_notes')
            .eq('manual_override', true)
            .order('created_at', { ascending: false })
            .limit(10)

        // 5. Clasificar secuencialmente con delay
        const results = []
        for (const email of emailsToClassify) {
            try {
                if (results.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000))
                }

                const result = await classifyEmail(
                    email.subject || '(sin asunto)',
                    email.body || '',
                    email.attachments || [],
                    feedbackExamples || []
                )

                console.log(`🔍 [Sync] id=${email.id} | esOC=${result.esOC} | conf=${result.confianza} | "${email.subject?.substring(0, 50)}"`)

                results.push({
                    fm_email_id: email.id,
                    subject: email.subject || '(sin asunto)',
                    body: email.body || '',
                    is_oc: result.esOC,
                    classification_reason: result.motivo,
                    confidence: result.confianza || 'media',
                    sales_rep_id: email.salesRepIdUpdated,
                    received_at: email.date?.time || email.dateCreated,
                    manual_override: false,
                })
            } catch (err) {
                console.error(`❌ [Sync] Error en email ${email.id}:`, err)
            }
        }

        // 6. Guardar en Supabase
        if (results.length > 0) {
            const { error } = await supabase
                .from('tracking_emails')
                .upsert(results, { onConflict: 'fm_email_id' })

            if (error) {
                console.error('❌ [Sync] Error guardando:', error.message)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
        }

        // 6b. Backfill: actualizar body de correos existentes desde ForceManager
        const classifiedIds = new Set(results.map(r => r.fm_email_id))
        const emailsToBackfill = repEmails.filter((email: any) => {
            return email.body && !classifiedIds.has(email.id)
        })

        for (const email of emailsToBackfill) {
            await supabase
                .from('tracking_emails')
                .update({ body: email.body })
                .eq('fm_email_id', email.id)
        }

        if (emailsToBackfill.length > 0) {
            console.log(`📝 [Sync] Backfill: ${emailsToBackfill.length} correos actualizados con body`)
        }

        const ocCount = results.filter(r => r.is_oc).length
        console.log(`✅ [Sync] Completado: ${results.length} clasificados, ${ocCount} OCs detectadas`)

        return NextResponse.json({
            message: `Sincronización completada`,
            processed: results.length,
            ocs: ocCount,
            skipped: repEmails.length - emailsToClassify.length,
        })
    } catch (error: any) {
        console.error('❌ [Sync] Error general:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno' },
            { status: 500 }
        )
    }
}
