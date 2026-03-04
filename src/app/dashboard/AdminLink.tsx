'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminLink() {
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        async function checkAdmin() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email === 'marketing@bienek.cl') {
                setIsAdmin(true)
            }
        }
        checkAdmin()
    }, [])

    if (!isAdmin) return null

    return (
        <Link
            href="/dashboard/revision-feedback"
            className="glass px-4 py-2 rounded-full text-sm font-medium border-accent/30 hover:border-accent/60 hover:bg-accent/10 transition-colors flex items-center gap-2 text-accent"
        >
            <Settings className="w-4 h-4" />
            Panel de Revisión
        </Link>
    )
}
