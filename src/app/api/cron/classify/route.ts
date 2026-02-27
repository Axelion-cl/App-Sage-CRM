import { NextRequest, NextResponse } from 'next/server'
import { fetchFMEmails, fetchFMUsers } from '@/lib/forcemanager'
import { classifyEmail } from '@/lib/classifier'
import { supabase } from '@/lib/supabase'

// Usuarios excluidos (no vendedores)
const EXCLUDED_USER_NAMES = ['xavi', 'claudia caamaño', 'bienek force']

/**
 * GET /api/cron/classify
 * 
 * Cron job de Vercel que se ejecuta automáticamente 1 vez al día (19:00 UTC-3 / 22:00 UTC).
 * Clasifica todos los correos nuevos del día actual.
 * 
 * Protegido con CRON_SECRET para evitar invocaciones no autorizadas.
 */
export async function GET(request: NextRequest) {
    // Verificar autorización del cron job
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log('⛔ [Cron] Acceso no autorizado')
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    console.log(`⏰ [Cron] Ejecutando clasificación automática para ${todayStr}`)

    try {
        // 1. Obtener correos del día
        const allEmails = await fetchFMEmails(todayStr)
        console.log(`📧 [Cron] ${allEmails.length} correos totales del día`)

        if (allEmails.length === 0) {
            return NextResponse.json({ message: 'Sin correos para hoy', processed: 0 })
        }

        // 2. Ver cuáles ya están clasificados
        const fmIds = allEmails.map((e: any) => e.id)
        const existingMap = new Map<number, any>()

        const batchSize = 500
        for (let i = 0; i < fmIds.length; i += batchSize) {
            const batch = fmIds.slice(i, i + batchSize)
            const { data: existing } = await supabase
                .from('tracking_emails')
                .select('fm_email_id, classification_reason, manual_override')
                .in('fm_email_id', batch)

            existing?.forEach(e => existingMap.set(e.fm_email_id, e))
        }

        // 3. Filtrar correos no clasificados o con error (respetar manual_override)
        const emailsToClassify = allEmails.filter((email: any) => {
            const cached = existingMap.get(email.id)
            if (!cached) return true
            if (cached.manual_override) return false
            if (cached.classification_reason === 'Error en clasificación') return true
            return false
        })

        console.log(`🆕 [Cron] ${emailsToClassify.length} correos por (re)clasificar`)

        // 4. Obtener feedback examples
        const { data: feedbackExamples } = await supabase
            .from('tracking_emails')
            .select('subject, is_oc, classification_reason, feedback_notes')
            .eq('manual_override', true)
            .order('created_at', { ascending: false })
            .limit(10)

        // 5. Clasificar con delay de 3s (safe para rate limits)
        const results: any[] = []
        let errors = 0

        for (let i = 0; i < emailsToClassify.length; i++) {
            const email = emailsToClassify[i]

            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 3000))
            }

            try {
                const result = await classifyEmail(
                    email.subject || '(sin asunto)',
                    email.body || '',
                    email.attachments || [],
                    feedbackExamples || []
                )

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
            } catch (err: any) {
                console.error(`❌ [Cron] Error email ${email.id}:`, err.message)
                errors++

                // Si hay muchos errores seguidos, parar
                if (errors >= 5) {
                    console.error('❌ [Cron] Demasiados errores, deteniendo')
                    break
                }
            }
        }

        // 6. Guardar
        if (results.length > 0) {
            const batchSize = 50
            for (let i = 0; i < results.length; i += batchSize) {
                const batch = results.slice(i, i + batchSize)
                await supabase
                    .from('tracking_emails')
                    .upsert(batch, { onConflict: 'fm_email_id' })
            }
        }

        const ocCount = results.filter(r => r.is_oc).length
        console.log(`✅ [Cron] Completado: ${results.length} clasificados, ${ocCount} OCs, ${errors} errores`)

        return NextResponse.json({
            message: 'Clasificación automática completada',
            date: todayStr,
            processed: results.length,
            ocs: ocCount,
            errors,
            skipped: allEmails.length - emailsToClassify.length,
        })
    } catch (error: any) {
        console.error('❌ [Cron] Error general:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
