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
    const [usersResp, emailsResp] = await Promise.all([
        fetchFMUsers(),
        fetchFMEmails(200) // Traemos los últimos 200 correos para analizar
    ])

    const users = usersResp.data || []
    const emails = emailsResp.data || []

    // 1. Identificar correos no procesados
    const fmEmailIds = emails.map((e: any) => e.id)
    const { data: cached } = await supabase
        .from('tracking_emails')
        .select('fm_email_id')
        .in('fm_email_id', fmEmailIds)

    const cachedIds = new Set(cached?.map(c => c.fm_email_id) || [])
    const newEmails = emails.filter((e: any) => !cachedIds.has(e.id))

    // 2. Clasificar nuevos correos con el LLM (en paralelo)
    // Nota: En producción esto debería ser una cola o background job
    const classifications = await Promise.all(
        newEmails.map(async (email: any) => {
            const result = await classifyEmail(email.subject, email.body, email.attachments || [])
            return {
                fm_email_id: email.id,
                subject: email.subject,
                is_oc: result.esOC,
                classification_reason: result.motivo,
                sales_rep_id: email.salesRepIdUpdated,
                received_at: email.date.time
            }
        })
    )

    // 3. Guardar en Supabase para caché
    if (classifications.length > 0) {
        await supabase.from('tracking_emails').insert(classifications)
    }

    // 4. Obtener TODAS las OC clasificadas del día de hoy
    const today = new Date().toISOString().split('T')[0]
    const { data: allOCs } = await supabase
        .from('tracking_emails')
        .select('*')
        .eq('is_oc', true)
        .gte('received_at', `${today}T00:00:00Z`)

    // 5. Agregar por vendedor
    const reps: AggregatedRep[] = users.map((user: any) => {
        const userOCs = allOCs?.filter(oc => oc.sales_rep_id === user.id) || []
        return {
            id: user.id,
            name: `${user.name} ${user.surname || ''}`.trim(),
            ocCount: userOCs.length,
            lastOCAt: userOCs.length > 0
                ? userOCs.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())[0].received_at
                : null
        }
    })

    return reps.filter(r => r.ocCount > 0 || users.length < 20) // Mostrar todos si son pocos, o solo con OC
}
