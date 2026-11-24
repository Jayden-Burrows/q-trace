// app/api/site-shot/route.ts
//
//   POST /api/site-shot   { url }
//        Returns a screenshot of the page. If a capture newer than
//        SCREENSHOT_MAX_AGE_SECONDS already exists it is reused, because the free
//        Site-Shot plan is only 100 captures a month. Otherwise it captures, uploads
//        the image to the "screenshots" bucket, records it in the screenshots table,
//        and returns the public URL.

import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/lib/server/http";
import { getAdminClient, qrCodeId } from "@/lib/server/supabase";
import { parseHttpUrl, registrableDomainOf } from "@/lib/url";
import type { ScreenshotResponse } from "@/types/api";

const SITE_SHOT_URL = "https://api.site-shot.com/";
const BUCKET = "screenshots";

const WIDTH = 1024;
const HEIGHT = 768;
const FORMAT = "webp"; // lossless and about 35% smaller than png

// Site-Shot gives up after this long (ms). The fetch is aborted a little later.
const CAPTURE_TIMEOUT_MS = 45_000;
const FETCH_TIMEOUT_MS = 55_000;

const SCREENSHOT_MAX_AGE_SECONDS = 24 * 60 * 60;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // matches the bucket's file_size_limit

const EXT_BY_MIME: Record<string, "png" | "jpeg" | "webp"> = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/webp": "webp",
};

type SiteShotJson = { image?: string; error?: string };

export async function POST(req: NextRequest) {
    const apiKey = process.env.SITE_SHOT_API_KEY;
    const supabase = getAdminClient();
    if (!apiKey) return fail(500, "upstream_error", "Server is missing its screenshot API key.");
    if (!supabase) return fail(500, "upstream_error", "Server is not connected to the database.");

    const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
    const url = parseHttpUrl(body?.url);
    if (!url) return fail(400, "invalid_url", "Missing or invalid url.");

    const id = qrCodeId(url.href);
    const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    try {
        // 1) Reuse a recent capture instead of spending quota.
        const since = new Date(Date.now() - SCREENSHOT_MAX_AGE_SECONDS * 1000).toISOString();
        const { data: recent, error: recentError } = await supabase
            .from("screenshots")
            .select("storage_path, captured_at")
            .eq("qr_code_id", id)
            .gte("captured_at", since)
            .order("captured_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (recentError) throw recentError;

        if (recent) {
            console.log("Screenshot cache hit:", recent.storage_path);
            return NextResponse.json<ScreenshotResponse>({
                screenshot: { url: publicUrl(recent.storage_path), capturedAt: recent.captured_at, cached: true },
            });
        }

        // 2) Capture. searchParams does the URL-encoding; the "?" is required.
        const params = new URLSearchParams({
            url: url.href,
            userkey: apiKey,
            width: String(WIDTH),
            height: String(HEIGHT),
            format: FORMAT,
            response_type: "json",
            timeout: String(CAPTURE_TIMEOUT_MS),
            no_cookie_popup: "1",
            no_ads: "1",
        });

        const res = await fetch(`${SITE_SHOT_URL}?${params}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (res.status === 429) return fail(429, "rate_limited", "Screenshot quota reached. Try again later.", 3600);
        if (!res.ok) {
            console.error("Site-Shot returned", res.status); // never log the request URL: it holds the key
            return fail(502, "upstream_error", "Screenshot service request failed.");
        }

        const json = (await res.json().catch(() => null)) as SiteShotJson | null;
        if (!json || json.error || !json.image) {
            console.error("Site-Shot error:", json?.error ?? "no image in response");
            return fail(502, "upstream_error", "The screenshot service could not capture that page.");
        }

        // 3) Decode. Keep the bytes as a Buffer: converting to a string corrupts the image.
        const match = /^data:(image\/[a-z]+);base64,/i.exec(json.image);
        const mime = match?.[1].toLowerCase() ?? `image/${FORMAT}`;
        const ext = EXT_BY_MIME[mime];
        if (!ext) return fail(502, "upstream_error", "The screenshot service returned an unexpected format.");

        const bytes = Buffer.from(json.image.replace(/^data:[^,]*,/, ""), "base64");
        if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
            return fail(502, "upstream_error", "The screenshot was empty or too large.");
        }

        console.log(`Screenshot captured: ${mime}, ${bytes.length} bytes`);

        // 4) The screenshots table references qr_codes, so make sure the row exists.
        const { error: qrError } = await supabase.from("qr_codes").upsert(
            {
                id,
                url: url.href,
                hostname: url.hostname,
                registrable_domain: registrableDomainOf(url.hostname),
            },
            { onConflict: "id", ignoreDuplicates: true },
        );
        if (qrError) throw qrError;

        // 5) Upload, then record. Path: <sha256>/<epoch ms>.<ext>, all URL-safe characters.
        const path = `${id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, bytes, { contentType: mime, upsert: false });
        if (uploadError) throw uploadError;

        const { data: row, error: insertError } = await supabase
            .from("screenshots")
            .insert({ qr_code_id: id, storage_path: path, format: ext, width: WIDTH, height: HEIGHT, size_bytes: bytes.length })
            .select("captured_at")
            .single();
        if (insertError) {
            await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphaned file
            throw insertError;
        }

        return NextResponse.json<ScreenshotResponse>({
            screenshot: { url: publicUrl(path), capturedAt: row.captured_at, cached: false },
        });
    } catch (e) {
        if (e instanceof DOMException && e.name === "TimeoutError") {
            return fail(504, "timeout", "The screenshot service took too long to respond.");
        }
        console.error("Screenshot request failed", e);
        return fail(502, "upstream_error", "Could not complete the screenshot.");
    }
}
