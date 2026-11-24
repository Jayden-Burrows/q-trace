//   POST /api/virus-total   { url, rescan? }
//        - rescan false/omitted: look up VirusTotal's stored report. If it is
//          fresh, return it. If it is stale, rescan it. If VT has never seen
//          the URL, submit it. Either way you get back "completed" or "pending".
//        - rescan true: ask VT to re-analyze (falls back to a normal submit if
//          VT has never seen the URL).
//
//   GET  /api/virus-total?analysisId=...
//        - poll an analysis. "pending" until VT finishes, then "completed"
//          with the full URL report.
//
// Every VT call counts against the public quota (4/min, 500/day), so the
// client should poll slowly and honor pollAfterSeconds / retryAfterSeconds.

import { NextResponse, type NextRequest } from "next/server";
import type { ErrorCode } from "@/types/api";
import type { VtAnalysis, VtScanResponse, VtUrlReport } from "@/types/vt";

const VT_BASE = "https://www.virustotal.com/api/v3";
const TIMEOUT_MS = 10_000;

// A stored VT report older than this is treated as stale and re-analyzed.
const MAX_REPORT_AGE_SECONDS = 24 * 60 * 60; // 24 hours

// Represents how long the client should wait between polls.
const POLL_AFTER_SECONDS = 15;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

// Slack when checking that the URL report reflects the finished analysis.
const FRESHNESS_SLACK_SECONDS = 300;

const ANALYSIS_ID = /^u-[0-9a-f]{64}-[0-9a-f]+$/i;

// ---------- small helpers ----------

function fail(status: number, code: ErrorCode, message: string, retryAfterSeconds?: number) {
    return NextResponse.json(
        { error: { code, message, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) } },
        { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined },
    );
}

// Maps a non-OK VT response to a message. 404 is not handled in this
// function since it means something different for each API call.
function upstreamFail(res: Response) {
    if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        return fail(
            429,
            "rate_limited",
            "Rate limit reached. Try again shortly.",
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : DEFAULT_RETRY_AFTER_SECONDS,
        );
    }
    console.error("VirusTotal returned", res.status);
    return fail(502, "upstream_error", "VirusTotal request failed.");
}

function pending(analysisId: string) {
    return NextResponse.json(
        { status: "pending", analysisId, pollAfterSeconds: POLL_AFTER_SECONDS },
        { status: 202 },
    );
}

function completed(report: VtUrlReport) {
    return NextResponse.json({ status: "completed", report });
}

// Since the client can be bypassed, the server rechecks the things that the client
// already did.
function parseUrl(raw: unknown): URL | NextResponse {
    if (typeof raw !== "string" || raw.trim().length === 0 || raw.length > 2048) {
        return fail(400, "invalid_url", "Missing or invalid url.");
    }

    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return fail(400, "invalid_url", "Invalid URL.");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return fail(400, "unsupported_protocol", "Only http and https URLs are supported.");
    }
    if (!url.hostname.includes(".")) return fail(400, "invalid_url", "Invalid URL.");
    if (url.username || url.password) {
        return fail(400, "invalid_url", "URLs with embedded credentials are not supported.");
    }

    url.hash = "";
    return url;
}

// VT url identifier: base64url of the URL with no padding
function toVtId(href: string) {
    return Buffer.from(href).toString("base64url");
}

function vtFetch(
    path: string,
    apiKey: string,
    init: { method?: string; body?: URLSearchParams; headers?: Record<string, string> } = {},
) {
    return fetch(`${VT_BASE}${path}`, {
        method: init.method ?? "GET",
        body: init.body,
        headers: { accept: "application/json", "x-apikey": apiKey, ...init.headers },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
}

// A shared function for running a fetch with the API key and returning JSON
// error messages for network failures and timeouts
async function guarded(run: (apiKey: string) => Promise<NextResponse>) {
    const apiKey = process.env.VIRUS_TOTAL_API_KEY;
    if (!apiKey) return fail(500, "upstream_error", "Server is missing its API key.");

    try {
        return await run(apiKey);
    } catch (e) {
        if (e instanceof DOMException && e.name === "TimeoutError") {
            return fail(504, "timeout", "VirusTotal took too long to respond.");
        }
        console.error("VirusTotal request failed", e);
        return fail(502, "upstream_error", "Could not reach VirusTotal.");
    }
}

// ---------- VT calls ----------

async function readAnalysisId(res: Response): Promise<string | NextResponse> {
    const json = (await res.json().catch(() => null)) as VtScanResponse | null;
    const id = json?.data?.id;
    if (!id || !ANALYSIS_ID.test(id)) {
        return fail(502, "upstream_error", "VirusTotal returned an unexpected response.");
    }
    return id;
}

// 1) If rescan is true, requests a rescan of the url and returns its 
//      analysis id. 
// 2) If rescan is false (or the rescan fails), requests the analysis for this 
//      url. 
async function startAnalysis(
    href: string,
    urlId: string,
    apiKey: string,
    rescan: boolean,
): Promise<string | NextResponse> {
    if (rescan) {
        const res = await vtFetch(`/urls/${urlId}/analyse`, apiKey, { method: "POST" });
        if (res.ok) return readAnalysisId(res);
        if (res.status !== 404) return upstreamFail(res);
    }

    const res = await vtFetch("/urls", apiKey, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ url: href }),
    });
    if (!res.ok) return upstreamFail(res);
    return readAnalysisId(res);
}

// ---------- handlers ----------

export async function POST(req: NextRequest) {
    return guarded(async (apiKey) => {
        const body = (await req.json().catch(() => null)) as { url?: unknown; rescan?: unknown } | null;

        const url = parseUrl(body?.url);
        if (url instanceof NextResponse) return url;

        const href = url.href;
        const urlId = toVtId(href);
        let rescan = body?.rescan === true;

        if (!rescan) {
            // 1) Does VT already have a report for this URL?
            const existing = await vtFetch(`/urls/${urlId}`, apiKey);

            if (existing.ok) {
                const report = (await existing.json()) as VtUrlReport;
                const ageSeconds = Date.now() / 1000 - report.data.attributes.last_analysis_date;
                if (ageSeconds <= MAX_REPORT_AGE_SECONDS) return completed(report);
                rescan = true; // known to VT, but too old to trust
            } else if (existing.status !== 404) {
                return upstreamFail(existing);
            }
            // 404: VT has never seen it, so fall through to a plain submit
        }

        // 2) Submit it (new URL) or re-analyze it (rescan / stale)
        const analysisId = await startAnalysis(href, urlId, apiKey, rescan);
        if (analysisId instanceof NextResponse) return analysisId;
        return pending(analysisId);
    });
}

export async function GET(req: NextRequest) {
    return guarded(async (apiKey) => {
        const analysisId = req.nextUrl.searchParams.get("analysisId");
        if (!analysisId || !ANALYSIS_ID.test(analysisId)) {
            return fail(400, "invalid_request", "Missing or invalid analysisId.");
        }

        // 1) Is the analysis finished?
        const res = await vtFetch(`/analyses/${analysisId}`, apiKey);
        if (res.status === 404) return fail(404, "not_found", "That analysis does not exist.");
        if (!res.ok) return upstreamFail(res);

        const analysis = (await res.json()) as VtAnalysis;
        if (analysis.data.attributes.status !== "completed") return pending(analysisId);

        // 2) Finished: fetch the normal URL report so the client always gets one
        //    shape. The analysis response names the URL's id for us.
        const urlId = analysis.meta?.url_info?.id;
        if (!urlId) return fail(502, "upstream_error", "VirusTotal returned an unexpected response.");

        const reportRes = await vtFetch(`/urls/${urlId}`, apiKey);
        if (!reportRes.ok) return upstreamFail(reportRes);
        const report = (await reportRes.json()) as VtUrlReport;

        // The URL object can lag behind a just-finished analysis. Don't hand back
        // the previous scan as if it were the new one.
        const analysisDate = analysis.data.attributes.date;
        if (report.data.attributes.last_analysis_date < analysisDate - FRESHNESS_SLACK_SECONDS) {
            return pending(analysisId);
        }

        return completed(report);
    });
}