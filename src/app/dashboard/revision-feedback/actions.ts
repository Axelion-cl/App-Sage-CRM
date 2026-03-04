'use server'

import { fetchFMUsers } from '@/lib/forcemanager'

export async function getSalesRepsMap() {
    const usersData = await fetchFMUsers()
    const users = Array.isArray(usersData) ? usersData : (usersData?.data || [])

    // Devolvemos un array que el cliente convertirá fácilmente en Map o diccionarios
    return users.map((u: any) => ({
        id: u.id,
        name: `${u.name || ''} ${u.surname || ''}`.trim() || `ID: ${u.id}`
    }))
}
