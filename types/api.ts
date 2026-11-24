// types/api.ts
import type { Report, QrCode, DomainInfo, ThreatType } from "./domain";

export type ErrorCode =
    | "invalid_url" | "unsupported_protocol" | "rate_limited" | "invalid_request"
    | "upstream_error" | "not_found" | "timeout" | "bot_check_failed";

export type ApiError = {
    error: { code: ErrorCode; message: string; retryAfterSeconds?: number };
};

export type AnalyzeRequest = { url: string; turnstileToken?: string };

export type AnalyzeResponse =
    | { status: "completed"; report: Report; qrCode: QrCode; cache: "db" | "virustotal" }
    | { status: "pending"; reportId: string; qrCodeId: string };

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number };
export type CodeDetailResponse = { qrCode: QrCode; timeline: Report[]; domain: DomainInfo | null };

export type StatsResponse = {
    totals: { codes: number; flaggedPercent: number; scansToday: number };
    scansPerDay: { date: string; scans: number; flagged: number }[];
    threatTypes: { type: ThreatType; count: number }[];
    topDomains: { domain: string; reports: number; latestVerdict: string }[];
    recentFlagged: QrCode[];
};

export type ScreenshotResponse = {
    screenshot: { url: string; capturedAt: string; cached: boolean };
};

// domain is null when the host has no registrable domain (e.g. a bare IP address).
export type DomainResponse = { domain: DomainInfo | null };
