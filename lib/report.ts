import type { EngineCategory, EngineResult, ReportStats, Verdict } from "@/types/domain";
import type { VtUrlReport } from "@/types/vt";

export const SAFE_BROWSING_REPORT_URL = "https://safebrowsing.google.com/safebrowsing/report_phish/";

// This many "malicious" engines makes the verdict malicious. One or two is
// treated as suspicious, since a single engine is often a false positive.
const MALICIOUS_THRESHOLD = 3;
const MAX_ENGINES_IN_REPORT = 15;

export type SiteInfo = {
    title: string | null;
    type: string | null;
    description: string | null;
    category: string | null;
};

export type ReportView = {
    url: string;
    hostname: string;
    finalUrl: string | null;
    analyzedAt: Date;
    stats: ReportStats;
    totalEngines: number; // engines that returned a verdict (excludes timeouts)
    flagged: number; // malicious + suspicious
    verdict: Verdict;
    engines: EngineResult[]; // flagged first, then alphabetical
    site: SiteInfo;
    threatNames: string[];
    tags: string[];
};

export const VERDICT_COPY: Record<Verdict, { heading: string; blurb: string }> = {
    malicious: {
        heading: "High-risk destination",
        blurb: "Several security engines flagged this link as malicious. Don't open it.",
    },
    suspicious: {
        heading: "Suspicious destination",
        blurb: "Some engines flagged this link. Be cautious and don't enter personal details.",
    },
    harmless: {
        heading: "No threats detected",
        blurb: "No engine flagged this link. That isn't a guarantee it's safe.",
    },
    undetected: {
        heading: "Not enough data",
        blurb: "The engines had no opinion on this link. Treat it as unverified.",
    },
};

const KNOWN_CATEGORIES = new Set<string>(["harmless", "undetected", "suspicious", "malicious", "timeout"]);

function normalizeCategory(raw: string): EngineCategory {
    return KNOWN_CATEGORIES.has(raw) ? (raw as EngineCategory) : "unknown";
}

// Display order: flagged engines first, then ones that said harmless, then the rest
const SEVERITY: Record<EngineCategory, number> = {
    malicious: 0,
    suspicious: 1,
    harmless: 2,
    undetected: 3,
    timeout: 4,
    unknown: 4,
};

export function getVerdict(stats: ReportStats): Verdict {
    if (stats.malicious >= MALICIOUS_THRESHOLD) return "malicious";
    if (stats.malicious > 0 || stats.suspicious > 0) return "suspicious";
    if (stats.harmless > 0) return "harmless";
    return "undetected";
}

function firstMeta(meta: Record<string, string[]> | undefined, ...keys: string[]): string | null {
    for (const key of keys) {
        const value = meta?.[key]?.[0]?.trim();
        if (value) return value;
    }
    return null;
}

function hostnameOf(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

export function toReportView(vt: VtUrlReport): ReportView {
    const attrs = vt.data.attributes;
    const s = attrs.last_analysis_stats;
    const stats: ReportStats = {
        malicious: s.malicious,
        suspicious: s.suspicious,
        harmless: s.harmless,
        undetected: s.undetected,
        timeout: s.timeout,
    };

    const engines: EngineResult[] = Object.values(attrs.last_analysis_results ?? {})
        .map((e) => ({
            name: e.engine_name,
            category: normalizeCategory(e.category),
            method: e.method,
            result: e.result,
        }))
        .sort((a, b) => SEVERITY[a.category] - SEVERITY[b.category] || a.name.localeCompare(b.name));

    const vendorCategory = Object.values(attrs.categories ?? {})[0] ?? null;
    const finalUrl = attrs.last_final_url ?? null;

    return {
        url: attrs.url,
        hostname: hostnameOf(attrs.url),
        finalUrl: finalUrl && finalUrl !== attrs.url ? finalUrl : null,
        analyzedAt: new Date(attrs.last_analysis_date * 1000),
        stats,
        totalEngines: stats.malicious + stats.suspicious + stats.harmless + stats.undetected,
        flagged: stats.malicious + stats.suspicious,
        verdict: getVerdict(stats),
        engines,
        site: {
            title: attrs.title?.trim() || null,
            type: firstMeta(attrs.html_meta, "og:type"),
            description: firstMeta(attrs.html_meta, "description", "og:description"),
            category: attrs.web_category ?? vendorCategory,
        },
        threatNames: attrs.threat_names ?? [],
        tags: attrs.tags ?? [],
    };
}

// "Feb 04, 2026 at 14:32 UTC"
export function formatUtc(date: Date): string {
    const day = date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    });
    const time = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
    });
    return `${day} at ${time} UTC`;
}

export function buildOverview(view: ReportView): string {
    const { malicious, suspicious, harmless } = view.stats;

    if (malicious > 0 || suspicious > 0) {
        const parts: string[] = [];
        if (malicious > 0) parts.push(`${malicious} flagged it as malicious`);
        if (suspicious > 0) parts.push(`${suspicious} as suspicious`);
        return `Of ${view.totalEngines} engines that returned a verdict, ${parts.join(" and ")}. ${harmless} rated it harmless.`;
    }

    return `None of the ${view.totalEngines} engines that returned a verdict flagged this link. ${harmless} rated it harmless and the rest had no opinion.`;
}

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

// Plain-text report meant to be pasted into Google's Safe Browsing report form.
// Kept far under the 1000-word limit.
export function buildReportText(view: ReportView): string {
    const { stats } = view;
    const lines: string[] = [
        "A link found through a QR code was flagged by security engines.",
        "",
        `URL: ${view.url}`,
    ];

    if (view.finalUrl) lines.push(`Final destination: ${view.finalUrl}`);
    if (view.site.title) lines.push(`Page title: ${truncate(view.site.title, 120)}`);

    lines.push(
        `Analyzed by VirusTotal: ${formatUtc(view.analyzedAt)}`,
        `Result: ${stats.malicious} malicious, ${stats.suspicious} suspicious, ${stats.harmless} harmless, ${stats.undetected} undetected (${view.totalEngines} engines)`,
    );

    const flaggers = view.engines.filter((e) => e.category === "malicious" || e.category === "suspicious");
    if (flaggers.length > 0) {
        lines.push("", "Engines that flagged it:");
        for (const e of flaggers.slice(0, MAX_ENGINES_IN_REPORT)) {
            lines.push(`- ${e.name}: ${e.result}`);
        }
        if (flaggers.length > MAX_ENGINES_IN_REPORT) {
            lines.push(`- and ${flaggers.length - MAX_ENGINES_IN_REPORT} more`);
        }
    }

    if (view.threatNames.length > 0) lines.push("", `Threat names: ${view.threatNames.join(", ")}`);
    if (view.tags.length > 0) lines.push(`Tags: ${view.tags.join(", ")}`);

    lines.push("", "Where I found it: [describe where you saw the QR code]");

    return lines.join("\n");
}