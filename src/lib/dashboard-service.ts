import { fetchFMEmails, fetchFMUsers, fetchFMAccountNames } from '@/lib/forcemanager'
import { classifyEmail } from '@/lib/classifier'
import { supabase } from '@/lib/supabase'

// Usuarios que NO son vendedores (excluir del dashboard)
const EXCLUDED_USER_NAMES = [
    'xavi',
    'claudia caamaño',
    'bienek force',
]

function isExcludedUser(user: any): boolean {
    const fullName = `${user.name || ''} ${user.surname || ''}`.trim().toLowerCase()
    return EXCLUDED_USER_NAMES.some(excluded => fullName.includes(excluded))
}

export interface AggregatedRep {
    id: number
    name: string
    ocCount: number
    totalEmails: number
    lastOCAt: string | null
}

/**
 * Obtiene los datos del dashboard para una fecha específica.
 * Si targetDate es hoy, clasifica correos nuevos con Gemini.
 * Si targetDate es un día pasado, solo lee de Supabase (datos ya clasificados).
 */
export async function getDashboardData(targetDate?: string): Promise<AggregatedRep[]> {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    const dateStr = targetDate || todayStr
    const isToday = dateStr === todayStr

    // Fetch users
    const usersData = await fetchFMUsers()
    const users = Array.isArray(usersData) ? usersData : (usersData?.data || [])

    // Filtrar usuarios no vendedores
    const salesUsers = users.filter((u: any) => !isExcludedUser(u))

    console.log(`📊 [Dashboard] ${salesUsers.length} vendedores, fecha: ${dateStr} ${isToday ? '(HOY)' : '(histórico)'}`)

    // Solo clasificar correos nuevos si es el día de hoy
    if (isToday) {
        const emails = await fetchFMEmails(dateStr)
        console.log(`📧 [Dashboard] ${emails.length} correos recibidos hoy`)

        // Identificar correos no procesados
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
        console.log(`🆕 [Dashboard] ${newEmails.length} correos nuevos por clasificar`)

        // Clasificar nuevos correos (max 5 por carga)
        const BATCH_SIZE = 5
        const emailsToProcess = newEmails.slice(0, BATCH_SIZE)

        if (newEmails.length > BATCH_SIZE) {
            console.log(`⚠️ [Dashboard] Procesando solo los primeros ${BATCH_SIZE} de ${newEmails.length} nuevos.`)
        }

        // Obtener ejemplos de feedback para few-shot learning
        const { data: feedbackExamples } = await supabase
            .from('tracking_emails')
            .select('subject, is_oc')
            .eq('manual_override', true)
            .order('created_at', { ascending: false })
            .limit(10)

        // Obtener nombres de cuenta (empresas)
        const accountIds = Array.from(new Set(emailsToProcess.map((e: any) => e.accountId).filter(Boolean)))
        const accountNamesMap = await fetchFMAccountNames(accountIds as number[])

        const classifications = []
        for (const email of emailsToProcess) {
            try {
                if (classifications.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000))
                }

                const result = await classifyEmail(
                    email.subject || '(sin asunto)',
                    email.body || '',
                    email.attachments || [],
                    feedbackExamples || []
                )

                console.log(`🔍 [Classify] id=${email.id} | esOC=${result.esOC} | subject: ${email.subject?.substring(0, 50)}`)

                classifications.push({
                    fm_email_id: email.id,
                    subject: email.subject || '(sin asunto)',
                    is_oc: result.esOC,
                    classification_reason: result.motivo,
                    confidence: result.confianza || 'media',
                    sales_rep_id: email.salesRepIdUpdated,
                    company_name: accountNamesMap.get(email.accountId) || null,
                    received_at: email.date?.time || email.dateCreated
                })
            } catch (err) {
                console.error(`❌ Error clasificando email ${email.id}:`, err)
            }
        }

        // Guardar en Supabase
        if (classifications.length > 0) {
            const { error } = await supabase
                .from('tracking_emails')
                .upsert(classifications, { onConflict: 'fm_email_id' })

            if (error) {
                console.error('❌ Error guardando clasificaciones:', error.message)
            } else {
                const ocCount = classifications.filter(c => c.is_oc).length
                console.log(`💾 [Dashboard] Guardadas ${classifications.length} clasificaciones (${ocCount} OCs)`)
            }
        }
    }

    // Obtener TODAS las clasificaciones del día seleccionado
    const nextDay = new Date(dateStr + 'T12:00:00')
    nextDay.setDate(nextDay.getDate() + 1)
    const nextDayStr = nextDay.toLocaleDateString('en-CA')

    const { data: dayEmails } = await supabase
        .from('tracking_emails')
        .select('*')
        .gte('received_at', `${dateStr}T00:00:00Z`)
        .lt('received_at', `${nextDayStr}T00:00:00Z`)

    const allOCs = dayEmails?.filter(e => e.is_oc) || []

    console.log(`🎯 [Dashboard] ${dayEmails?.length || 0} correos totales, ${allOCs.length} OCs para ${dateStr}`)

    // Agregar por vendedor
    const reps: AggregatedRep[] = salesUsers.map((user: any) => {
        const userEmails = dayEmails?.filter(e => e.sales_rep_id === user.id) || []
        const userOCs = userEmails.filter(e => e.is_oc)
        return {
            id: user.id,
            name: `${user.name || ''} ${user.surname || ''}`.trim(),
            ocCount: userOCs.length,
            totalEmails: userEmails.length,
            lastOCAt: userOCs.length > 0
                ? userOCs.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())[0].received_at
                : null
        }
    })

    // Mostrar todos los vendedores si hay pocos, o solo los activos si hay muchos
    return reps.filter(r => r.totalEmails > 0 || salesUsers.length < 20)
}
