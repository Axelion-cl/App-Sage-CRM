/**
 * ForceManager API Client
 */

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

const API_BASE = 'https://api.forcemanager.com/api/v4';

export async function getFMToken() {
    // Si el token existe y le quedan más de 5 minutos de vida, usarlo
    if (cachedToken && tokenExpiry && Date.now() < (tokenExpiry - 300000)) {
        return cachedToken;
    }

    const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: process.env.FORCEMANAGER_PUBLIC_KEY,
            password: process.env.FORCEMANAGER_PRIVATE_KEY,
        }),
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();
    cachedToken = data.token;

    // Decodificar JWT para obtener la fecha de expiración si es posible, 
    // o simplemente asumir 24h menos margen de error.
    tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);

    return cachedToken;
}

export async function fetchFMEmails(rowcount = 50, page = 0) {
    const token = await getFMToken();
    const response = await fetch(`${API_BASE}/emails?rowcount=${rowcount}&page=${page}&order=date DESC`, {
        headers: {
            'X-Session-Key': token!,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Fetch failed: ${response.statusText}`);
    }

    return response.json();
}

export async function fetchFMUsers() {
    const token = await getFMToken();
    const response = await fetch(`${API_BASE}/users?where=deleted=false`, {
        headers: {
            'X-Session-Key': token!,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Fetch users failed: ${response.statusText}`);
    }

    return response.json();
}
