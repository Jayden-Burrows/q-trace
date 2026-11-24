import type { DomainInfo } from "@/types/domain";
import type { RdapDomainResponse, RdapEntity, RdapVcard } from "@/types/rdap";

function vcardField(vcard: RdapVcard | undefined, field: string): string | null {
    const row = vcard?.[1]?.find((r) => r[0] === field);
    const value = row?.[3];
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function findEntity(entities: RdapEntity[] | undefined, role: string): RdapEntity | null {
    for (const e of entities ?? []) {
        if (e.roles?.includes(role)) return e;
        const nested = findEntity(e.entities, role);
        if (nested) return nested;
    }
    return null;
}

function eventDate(raw: RdapDomainResponse, action: string): string | null {
    return raw.events?.find((e) => e.eventAction === action)?.eventDate ?? null;
}

// Raw RDAP -> the app's DomainInfo (same pattern as lib/report.ts for VirusTotal).
export function toDomainInfo(raw: RdapDomainResponse, domain: string): DomainInfo {
    const registrar = findEntity(raw.entities, "registrar");
    const abuse = findEntity(raw.entities, "abuse");

    return {
        domain,
        registrar: vcardField(registrar?.vcardArray, "fn"),
        abuseEmail: vcardField(abuse?.vcardArray, "email"),
        registeredAt: eventDate(raw, "registration"),
        expiresAt: eventDate(raw, "expiration"),
        changedAt: eventDate(raw, "last changed"),
        nameservers: (raw.nameservers ?? []).map((n) => n.ldhName.toLowerCase()).sort(),
        rdapFound: true,
        fetchedAt: new Date().toISOString(),
    };
}

export function notFoundDomainInfo(domain: string): DomainInfo {
    return {
        domain,
        registrar: null,
        abuseEmail: null,
        registeredAt: null,
        expiresAt: null,
        changedAt: null,
        nameservers: [],
        rdapFound: false,
        fetchedAt: new Date().toISOString(),
    };
}
