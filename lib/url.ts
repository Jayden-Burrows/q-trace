import { getDomain } from "tldts";

// Strict URL check for server routes. The client already normalizes, but it can be
// bypassed, so every route re-validates. Returns null for anything unusable.
export function parseHttpUrl(raw: unknown): URL | null {
    if (typeof raw !== "string" || raw.trim().length === 0 || raw.length > 2048) return null;

    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    if (url.username || url.password) return null;

    url.hash = ""; // keeps the id identical to the client's and VirusTotal's
    return url;
}

// "login.example.co.uk" -> "example.co.uk". Null for IP addresses and unknown suffixes,
// which RDAP's domain lookup cannot answer.
export function registrableDomainOf(hostname: string): string | null {
    return getDomain(hostname)?.toLowerCase() ?? null;
}
