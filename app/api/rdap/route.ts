// app/api/rdap/route.ts
//
//   POST /api/rdap   { url }
//        Looks up registration data (registrar, dates, nameservers) for the URL's
//        registrable domain through rdap.org, which redirects to the right registry.
//        Results are cached in the domains table: registration data changes rarely.

import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/lib/server/http";
import { getAdminClient } from "@/lib/server/supabase";
import { notFoundDomainInfo, toDomainInfo } from "@/lib/rdap";
import { parseHttpUrl, registrableDomainOf } from "@/lib/url";
import type { DomainResponse } from "@/types/api";
import type { DomainInfo } from "@/types/domain";
import type { RdapDomainResponse } from "@/types/rdap";

const RDAP_BASE = "https://rdap.org/domain/";
const TIMEOUT_MS = 10_000;

const FOUND_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const NOT_FOUND_MAX_AGE_SECONDS = 24 * 60 * 60; // retry sooner: could be a TLD with no RDAP

type DomainRow = {
    name: string;
    rdap_found: boolean;
    registrar: string | null;
    abuse_email: string | null;
    registered_at: string | null;
    expires_at: string | null;
    changed_at: string | null;
    nameservers: string[];
    fetched_at: string;
};

const fromRow = (r: DomainRow): DomainInfo => ({
    domain: r.name,
    registrar: r.registrar,
    abuseEmail: r.abuse_email,
    registeredAt: r.registered_at,
    expiresAt: r.expires_at,
    changedAt: r.changed_at,
    nameservers: r.nameservers,
    rdapFound: r.rdap_found,
    fetchedAt: r.fetched_at,
});

const toRow = (d: DomainInfo): DomainRow => ({
    name: d.domain,
    rdap_found: d.rdapFound,
    registrar: d.registrar,
    abuse_email: d.abuseEmail,
    registered_at: d.registeredAt,
    expires_at: d.expiresAt,
    changed_at: d.changedAt,
    nameservers: d.nameservers,
    fetched_at: d.fetchedAt,
});

export async function POST(req: NextRequest) {
    const supabase = getAdminClient();
    if (!supabase) return fail(500, "upstream_error", "Server is not connected to the database.");

    const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
    const url = parseHttpUrl(body?.url);
    if (!url) return fail(400, "invalid_url", "Missing or invalid url.");

    // RDAP answers for registered domains, not subdomains or IP addresses.
    const domain = registrableDomainOf(url.hostname);
    if (!domain) return NextResponse.json<DomainResponse>({ domain: null });

    try {
        // 1) Cached and still fresh?
        const { data: cached, error: cacheError } = await supabase
            .from("domains")
            .select("*")
            .eq("name", domain)
            .maybeSingle<DomainRow>();
        if (cacheError) throw cacheError;

        if (cached) {
            const maxAge = cached.rdap_found ? FOUND_MAX_AGE_SECONDS : NOT_FOUND_MAX_AGE_SECONDS;
            const ageSeconds = (Date.now() - new Date(cached.fetched_at).getTime()) / 1000;
            if (ageSeconds <= maxAge) return NextResponse.json<DomainResponse>({ domain: fromRow(cached) });
        }

        // 2) Ask RDAP.
        const res = await fetch(`${RDAP_BASE}${encodeURIComponent(domain)}`, {
            headers: {
                accept: "application/rdap+json, application/json",
                // Some RDAP servers reject requests that arrive with no identifying User-Agent.
                "user-agent": "q-trace/1.0 (QR code link checker; student project)",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        let info: DomainInfo;
        if (res.status === 404) {
            info = notFoundDomainInfo(domain);
        } else if (res.ok) {
            const raw = (await res.json().catch(() => null)) as RdapDomainResponse | null;
            if (!raw) return fail(502, "upstream_error", "RDAP returned an unexpected response.");
            info = toDomainInfo(raw, domain);
        } else if (res.status === 429) {
            return fail(429, "rate_limited", "RDAP rate limit reached. Try again shortly.", 60);
        } else {
            // res.url is the final URL after rdap.org's redirect, so this shows which registry answered.
            const snippet = (await res.text().catch(() => "")).slice(0, 200);
            console.error("RDAP returned", res.status, res.url, snippet);
            return fail(502, "upstream_error", "RDAP request failed.");
        }

        // 3) Cache it. A failed write shouldn't lose the answer we already have.
        const { error: writeError } = await supabase.from("domains").upsert(toRow(info), { onConflict: "name" });
        if (writeError) console.error("Could not cache RDAP result", writeError);

        return NextResponse.json<DomainResponse>({ domain: info });
    } catch (e) {
        if (e instanceof DOMException && e.name === "TimeoutError") {
            return fail(504, "timeout", "RDAP took too long to respond.");
        }
        console.error("RDAP request failed", e);
        return fail(502, "upstream_error", "Could not reach RDAP.");
    }
}
