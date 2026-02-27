import { NextRequest, NextResponse } from 'next/server'
import { fetchFMEmails, fetchFMUsers } from '@/lib/forcemanager'
import { classifyEmail } from '@/lib/classifier'
import { supabase } from '@/lib/supabase'

// Usuarios excluidos (no vendedores)
const EXCLUDED_USER_NAMES = ['xavi', 'claudia caamaño', 'bienek force']

function isExcludedUser(user: any): boolean {
    const fullName = `${user.name || ''} ${user.surname || ''}`.trim().toLowerCase()
    return EXCLUDED_USER_NAMES.some(excluded => fullName.includes(excluded))
}

/**
 * POST /api/sync-all
 * Sincroniza y clasifica correos de TODOS los vendedores para un día específico.
 * Body: { date: string (YYYY-MM-DD) }
 * 
 * Procesa de forma secuencial por vendedor con delay para respetar rate limits de Gemini.
 */
export async function POST(request: NextRequest) {
    try {
        const { date } = await request.json()

        if (!date) {
            return NextResponse.json({ error: 'Se requiere date' }, { status: 400 })
        }

        console.log(`🔄 [Sync-All] Iniciando sync global, fecha: ${date}`)

        // 1. Obtener usuarios vendedores
        const usersData = await fetchFMUsers()
        const users = Array.isArray(usersData) ? usersData : (usersData?.data || [])
        const salesUsers = users.filter((u: any) => !isExcludedUser(u))

        // 2. Obtener TODOS los correos del día
        const allEmails = await fetchFMEmails(date)
        console.log(`📧 [Sync-All] ${allEmails.length} correos totales del ${date}`)

        // 3. Ver cuáles ya están en Supabase
        const fmIds = allEmails.map((e: any) => e.id)
        let existingMap = new Map<number, any>()

        if (fmIds.length > 0) {
            // Supabase IN limit is ~1000, so batch if needed
            const batchSize = 500
            for (let i = 0; i < fmIds.length; i += batchSize) {
                const batch = fmIds.slice(i, i + batchSize)
                const { data: existing } = await supabase
                    .from('tracking_emails')
                    .select('fm_email_id, classification_reason, manual_override')
                    .in('fm_email_id', batch)

                existing?.forEach(e => existingMap.set(e.fm_email_id, e))
            }
        }

        // 4. Obtener ejemplos de feedback para few-shot learning
        const { data: feedbackExamples } = await supabase
            .from('tracking_emails')
            .select('subject, is_oc')
            .eq('manual_override', true)
            .order('created_at', { ascending: false })
            .limit(10)

        // 5. Filtrar correos que necesitan (re)clasificación
        const emailsToClassify = allEmails.filter((email: any) => {
            const cached = existingMap.get(email.id)
            if (!cached) return true
            if (cached.manual_override) return false
            if (cached.classification_reason === 'Error en clasificación') return true
            return false
        })

        console.log(`🆕 [Sync-All] ${emailsToClassify.length} correos por (re)clasificar de ${allEmails.length} totales`)

        // 6. Clasificar secuencialmente con delay de 3s (safe para rate limits)
        const DELAY_MS = 3000
        const MAX_RETRIES = 2
        const results: any[] = []
        let errors = 0

        for (let i = 0; i < emailsToClassify.length; i++) {
            const email = emailsToClassify[i]

            // Delay entre requests (excepto el primero)
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS))
            }

            let retries = 0
            let classified = false

            while (retries <= MAX_RETRIES && !classified) {
                try {
                    if (retries > 0) {
                        console.log(`🔁 [Sync-All] Retry ${retries}/${MAX_RETRIES} para email ${email.id}`)
                        await new Promise(resolve => setTimeout(resolve, 10000)) // 10s backoff on retry
                    }

                    const result = await classifyEmail(
                        email.subject || '(sin asunto)',
                        email.body || '',
                        email.attachments || [],
                        feedbackExamples || []
                    )

                    console.log(`🔍 [Sync-All] [${i + 1}/${emailsToClassify.length}] esOC=${result.esOC} | "${email.subject?.substring(0, 50)}"`)

                    results.push({
                        fm_email_id: email.id,
                        subject: email.subject || '(sin asunto)',
                        is_oc: result.esOC,
                        classification_reason: result.motivo,
                        confidence: result.confianza || 'media',
                        sales_rep_id: email.salesRepIdUpdated,
                        received_at: email.date?.time || email.dateCreated,
                        manual_override: false,
                    })

                    classified = true
                } catch (err: any) {
                    retries++
                    if (retries > MAX_RETRIES) {
                        console.error(`❌ [Sync-All] Falló email ${email.id} después de ${MAX_RETRIES} retries:`, err.message)
                        errors++
                    }
                }
            }
        }

        // 7. Guardar en Supabase (en batches de 50)
        const UPSERT_BATCH = 50
        for (let i = 0; i < results.length; i += UPSERT_BATCH) {
            const batch = results.slice(i, i + UPSERT_BATCH)
            const { error } = await supabase
                .from('tracking_emails')
                .upsert(batch, { onConflict: 'fm_email_id' })

            if (error) {
                console.error('❌ [Sync-All] Error guardando batch:', error.message)
            }
        }

        const ocCount = results.filter(r => r.is_oc).length
        console.log(`✅ [Sync-All] Completado: ${results.length} clasificados, ${ocCount} OCs, ${errors} errores`)

        return NextResponse.json({
            message: 'Sincronización global completada',
            totalEmails: allEmails.length,
            processed: results.length,
            ocs: ocCount,
            errors,
            skipped: allEmails.length - emailsToClassify.length,
        })
    } catch (error: any) {
        console.error('❌ [Sync-All] Error general:', error)
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}
