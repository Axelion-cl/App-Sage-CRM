/**
 * ForceManager (Sage Sales Management) API v4 Client
 * 
 * Uses /login endpoint with username/password to get a JWT token,
 * then passes it via X-Session-Key header on subsequent requests.
 *
 * Email type values:
 *   type=0  → received (incoming to @bienek.cl)
 *   type=1  → sent     (outgoing from @bienek.cl)
 * 
 * IMPORTANT NOTES about the /emails endpoint:
 *   - The `where` clause does NOT support AND for combining conditions
 *   - The `dateCreated>=` filter is silently ignored (ForceManager API bug)
 *   - The `id>=` filter DOES work correctly
 *   - Results are always sorted by ID ascending (oldest first)
 *   - Maximum 50 results per page regardless of `rowcount` value
 */

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;
let cachedLastPage: number | null = null;

const API_BASE = 'https://api.forcemanager.com/api/v4';

export async function getFMToken() {
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
        const loginError = await response.text();
        console.error(`❌ [getFMToken] Login failed: ${response.status}`, loginError);
        throw new Error(`Login failed: ${response.statusText} - ${loginError}`);
    }

    const data = await response.json();
    cachedToken = data.token;
    tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);

    return cachedToken;
}

/** Fetch a single page of emails */
async function fetchPage(token: string, page: number): Promise<any[]> {
    const params = new URLSearchParams({
        rowcount: '50',
        page: String(page),
    });

    const response = await fetch(`${API_BASE}/emails?${params.toString()}`, {
        headers: {
            'X-Session-Key': token,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ [FM] Emails page ${page}: ${response.status}`, errorBody);
        throw new Error(`Fetch emails page ${page} failed: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

/**
 * Find the last page of emails using an efficient probe strategy.
 * Uses exponential probing + a short binary search. Typically 3-5 API calls.
 * Result is cached in `cachedLastPage` to speed up subsequent requests.
 */
async function findLastPage(token: string): Promise<number> {
    if (cachedLastPage !== null) {
        // Check if cached value is still valid (data may have grown)
        const check = await fetchPage(token, cachedLastPage + 1);
        if (check.length === 0) return cachedLastPage;
        // Data grew — continue searching from cachedLastPage
    }

    // Exponential probing: start at page 50, double until empty
    let probe = cachedLastPage ?? 50;
    let lastFound = 0;

    while (probe <= 1000) {
        const page = await fetchPage(token, probe);
        if (page.length === 0) break;
        lastFound = probe;
        probe = Math.floor(probe * 1.5);
    }

    // Short binary search between lastFound and probe
    let lo = lastFound, hi = probe;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const page = await fetchPage(token, mid);
        if (page.length > 0) {
            lastFound = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    cachedLastPage = lastFound;
    return lastFound;
}

/**
 * Fetch today's received emails from ForceManager.
 * 
 * Strategy: 
 * Since dateCreated filtering is broken in the API, we find the last page,
 * then walk backward collecting emails until we pass today's date threshold.
 * Then filter for type=0 (received) and non-deleted in JS.
 */
export async function fetchFMEmails(sinceDate?: string) {
    const token = await getFMToken();
    const dateStr = sinceDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

    const lastPage = await findLastPage(token!);
    console.log(`📧 [FM] Last page of emails: ${lastPage}`);

    // Walk backward from the last page, collecting today's emails
    const allEmails: any[] = [];
    let reachedOlderData = false;

    for (let p = lastPage; p >= 0 && !reachedOlderData; p--) {
        const page = await fetchPage(token!, p);

        for (const email of page) {
            const emailDate = email.dateCreated?.substring(0, 10);
            if (emailDate && emailDate >= dateStr) {
                allEmails.push(email);
            } else if (emailDate && emailDate < dateStr) {
                reachedOlderData = true;
            }
        }

        // Safety: max 10 pages backward (~500 emails = 4-5 days tops)
        if (lastPage - p >= 10) break;
    }

    // Filter in JS: only received (type=0), non-deleted emails
    const received = allEmails.filter((e: any) => e.type === 0 && !e.deleted);

    console.log(`📧 [FM] ${allEmails.length} emails since ${dateStr} | ${received.length} received (type=0)`);
    return received;
}

export async function fetchFMUsers() {
    const token = await getFMToken();

    const response = await fetch(`${API_BASE}/users`, {
        headers: {
            'X-Session-Key': token!,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ ForceManager Users Error: ${response.status}`, errorBody);
        throw new Error(`Fetch users failed: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch account names by IDs.
 * Uses a small in-memory cache to avoid redundant API calls for the same accounts.
 */
const accountCache = new Map<number, string>();

export async function fetchFMAccountNames(accountIds: number[]): Promise<Map<number, string>> {
    const token = await getFMToken();
    const result = new Map<number, string>();
    const idsToFetch: number[] = [];

    // Check cache first
    for (const id of accountIds) {
        if (id === null || id === undefined || id < 0) continue;

        if (accountCache.has(id)) {
            result.set(id, accountCache.get(id)!);
        } else {
            idsToFetch.push(id);
        }
    }

    if (idsToFetch.length === 0) return result;

    // Fetch missing accounts
    // We fetch them in parallel to speed up the process. Note: Could add concurrency limit if list is huge.
    console.log(`🏢 [FM] Fetching ${idsToFetch.length} new account names.`);

    await Promise.allSettled(
        idsToFetch.map(async (id) => {
            try {
                const response = await fetch(`${API_BASE}/accounts/${id}`, {
                    headers: {
                        'X-Session-Key': token!,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.name) {
                        result.set(id, data.name);
                        accountCache.set(id, data.name); // Store in cache
                    }
                }
            } catch (err) {
                console.error(`❌ [FM] Failed to fetch account ${id}:`, err);
            }
        })
    );

    return result;
}
