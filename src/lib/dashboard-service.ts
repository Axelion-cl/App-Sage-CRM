import { fetchFMEmails, fetchFMUsers } from '@/lib/forcemanager'
import { classifyEmail } from '@/lib/classifier'
import { supabase } from '@/lib/supabase'

export interface AggregatedRep {
    id: number
    name: string
    ocCount: number
    lastOCAt: string | null
}

export async function getDashboardData() {
    // Fetch users and today's received emails in parallel
    const [usersData, emails] = await Promise.all([
        fetchFMUsers(),
        fetchFMEmails() // Now returns flat array of today's received emails
    ])

    // fetchFMUsers returns the array directly from the API
    const users = Array.isArray(usersData) ? usersData : (usersData?.data || [])

    console.log(`📊 [Dashboard] ${users.length} users, ${emails.length} received emails today`)

    // 1. Identificar correos no procesados (por fm_email_id en Supabase)
    const fmEmailIds = emails.map((e: any) => e.id)

    let cachedIds = new Set<number>()
    if (fmEmailIds.length > 0) {
        const { data: cached } = await supabase
            .from('tracking_emails')
            .select('fm_email_id')
            .in('fm_email_id', fmEmailIds)

        cachedIds = new Set(cached?.map(c => c.fm_email_id) || [])
    }

    const newEmails = emails.filter((e: any) => !cachedIds.has(e.id))
    console.log(`🆕 [Dashboard] ${newEmails.length} new emails to classify`)

    // 2. Clasificar nuevos correos con Gemini (Max 5 por carga para respetar Rate Limit de 15 RPM)
    // La cuota gratuita permite 15 peticiones por minuto. Promise.all disparaba todas juntas.
    const BATCH_SIZE = 5;
    const emailsToProcess = newEmails.slice(0, BATCH_SIZE);

    if (newEmails.length > BATCH_SIZE) {
        console.log(`⚠️ [Dashboard] Processing only first ${BATCH_SIZE} of ${newEmails.length} new emails to avoid timeouts/rate-limits.`);
    }

    const classifications = [];

    for (const email of emailsToProcess) {
        try {
            // Añadir retardo artificial para respetar 15 RPM (aprox 1 req cada 4s)
            // Si la respuesta tarda 1s, esperamos 3s más. Ajustamos a 2s de espera base.
            if (classifications.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            const result = await classifyEmail(
                email.subject || '(sin asunto)',
                email.body || '',
                email.attachments || []
            );

            console.log(`🔍 [Classify] id=${email.id} | esOC=${result.esOC} | subject: ${email.subject?.substring(0, 50)} | motivo: ${result.motivo?.substring(0, 60)}`);

            classifications.push({
                fm_email_id: email.id,
                subject: email.subject || '(sin asunto)',
                is_oc: result.esOC,
                classification_reason: result.motivo,
                sales_rep_id: email.salesRepIdUpdated,
                received_at: email.date?.time || email.dateCreated
            });

        } catch (err) {
            console.error(`❌ Error classifying email ${email.id}:`, err);
            // Continue with next email
        }
    }

    // 3. Guardar en Supabase para caché (upsert to handle re-processing)
    if (classifications.length > 0) {
        const { error } = await supabase
            .from('tracking_emails')
            .upsert(classifications, { onConflict: 'fm_email_id' })
        if (error) {
            console.error('❌ Error saving classifications:', error.message)
        } else {
            const ocCount = classifications.filter(c => c.is_oc).length
            console.log(`💾 [Dashboard] Saved ${classifications.length} classifications (${ocCount} OCs)`)
        }
    }

    // 4. Obtener TODAS las OC clasificadas del día de hoy
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    const { data: allOCs } = await supabase
        .from('tracking_emails')
        .select('*')
        .eq('is_oc', true)
        .gte('received_at', `${today}T00:00:00Z`)

    console.log(`🎯 [Dashboard] ${allOCs?.length || 0} OCs detected today`)

    // 5. Agregar por vendedor
    const reps: AggregatedRep[] = users.map((user: any) => {
        const userOCs = allOCs?.filter(oc => oc.sales_rep_id === user.id) || []
        return {
            id: user.id,
            name: `${user.name || ''} ${user.surname || ''}`.trim(),
            ocCount: userOCs.length,
            lastOCAt: userOCs.length > 0
                ? userOCs.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())[0].received_at
                : null
        }
    })

    return reps.filter(r => r.ocCount > 0 || users.length < 20)
}
