// The app's own shapes (what the UI and database layer work with).

export type Verdict = "harmless" | "undetected" | "suspicious" | "malicious";
export type ThreatType = "none" | "phishing" | "malware" | "spam" | "other";
export type ReportStatus = "pending" | "completed" | "failed";
export type EngineCategory =
    | "harmless" | "undetected" | "suspicious" | "malicious" | "timeout" | "unknown";

export type EngineResult = {
    name: string;
    category: EngineCategory; // normalized; unexpected values become "unknown"
    method: string;
    result: string; // free text, intentionally not an enum
};

export type ReportStats = {
    malicious: number;
    suspicious: number;
    harmless: number;
    undetected: number;
    timeout: number;
};

export type Report = {
    id: string;
    qrCodeId: string;
    status: ReportStatus;
    createdAt: string;
    completedAt: string | null;
    vtAnalysisDate: string | null;
    finalUrl: string | null;
    httpStatus: number | null;
    verdict: Verdict | null;
    threatType: ThreatType | null;
    stats: ReportStats;
    engines: EngineResult[];
    categories: Record<string, string>;
    threatNames: string[];
    tags: string[];
    destinationChanged: boolean;
    errorCode: string | null;
};

export type QrCode = {
    id: string;
    url: string;
    domain: string;
    registrableDomain: string | null;
    firstSeenAt: string;
    lastScannedAt: string;
    scanCount: number;
    latestVerdict: Verdict | null;
    latestThreatType: ThreatType | null;
    lastCheckedAt: string | null;
};

export type DomainInfo = {
    domain: string;
    registrar: string | null;
    abuseEmail: string | null;
    registeredAt: string | null;
    rdapFound: boolean;
    fetchedAt: string;
};