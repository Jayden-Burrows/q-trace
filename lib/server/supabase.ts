import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

// Server-only. Uses the secret (service-role) key, which bypasses row-level security,
// so it must never be imported from a client component or exposed via NEXT_PUBLIC_*.
export function getAdminClient(): SupabaseClient | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// qr_codes.id: SHA-256 (hex) of the normalized URL. Always hash url.href, never raw text.
export function qrCodeId(href: string): string {
    return createHash("sha256").update(href).digest("hex");
}
