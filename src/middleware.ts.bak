import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Si intenta entrar al dashboard sin estar logueado (aquí usaríamos cookies de Supabase Auth)
    // Por ahora lo dejamos pasar pero la implementación real usará supabase.auth.getSession()

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*'],
}
