'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push('/dashboard')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="glass w-full max-w-md p-8 rounded-2xl animate-reveal">
                <h1 className="text-3xl font-bold mb-2 tracking-tight">Bienvenida</h1>
                <p className="text-slate-400 mb-8">Ingresa tus credenciales para acceder al tracker.</p>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-surface border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
                            placeholder="Ej: claudia.caamano@bienek.cl"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-surface border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent hover:bg-emerald-600 text-slate-900 font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Iniciando sesión...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
