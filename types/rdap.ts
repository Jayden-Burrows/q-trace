// Raw RDAP shapes (RFC 9083): only the fields the app reads.
// Everything here is untrusted text from a third party; render as plain text only.

export type RdapEvent = {
    eventAction: string; // "registration" | "expiration" | "last changed" | ...
    eventDate: string;
};

// vCard in jCard form: ["vcard", [["fn", {}, "text", "Name"], ["email", {}, "text", "a@b.c"], ...]]
export type RdapVcard = [string, [string, unknown, string, unknown][]];

export type RdapEntity = {
    roles?: string[]; // "registrar" | "abuse" | "registrant" | ...
    vcardArray?: RdapVcard;
    entities?: RdapEntity[]; // abuse contacts are usually nested under the registrar
};

export type RdapNameserver = { ldhName: string };

export type RdapDomainResponse = {
    ldhName: string;
    status?: string[];
    events?: RdapEvent[];
    entities?: RdapEntity[];
    nameservers?: RdapNameserver[];
};
